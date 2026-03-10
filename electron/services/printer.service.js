const log = require('electron-log');
const { BrowserWindow } = require('electron');

/**
 * PrinterQueue — Per-printer sequential job queue.
 * Each physical printer gets its own queue to prevent job overlap/merge.
 * Jobs are processed one at a time with configurable delay between them.
 */
class PrinterQueue {
  constructor(printerName, delayMs = 800) {
    this.printerName = printerName;
    this.delayMs = delayMs;
    this.queue = [];
    this.processing = false;
  }

  /**
   * Enqueue a print job. Returns a Promise that resolves when the job completes.
   * @param {Object} job - { id, type, htmlContent, paperWidth, orderId, orderNumber }
   * @param {Function} printFn - async function(htmlContent, printerName, paperWidth) => result
   */
  enqueue(job, printFn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ job, printFn, resolve, reject });
      log.info(`[PrinterQueue:${this.printerName}] Job QUEUED: type=${job.type} order=#${job.orderNumber || 'N/A'} | Queue depth: ${this.queue.length}`);
      this._processNext();
    });
  }

  async _processNext() {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;

    const { job, printFn, resolve } = this.queue.shift();
    const startTime = Date.now();

    log.info(`[PrinterQueue:${this.printerName}] Job START: type=${job.type} order=#${job.orderNumber || 'N/A'}`);

    try {
      const result = await printFn(job.htmlContent, this.printerName, job.paperWidth);
      const elapsed = Date.now() - startTime;

      if (result.success) {
        log.info(`[PrinterQueue:${this.printerName}] Job SUCCESS: type=${job.type} order=#${job.orderNumber || 'N/A'} (${elapsed}ms)`);
      } else {
        log.error(`[PrinterQueue:${this.printerName}] Job FAILED: type=${job.type} order=#${job.orderNumber || 'N/A'} error=${result.error} (${elapsed}ms)`);
      }

      resolve(result);
    } catch (error) {
      log.error(`[PrinterQueue:${this.printerName}] Job ERROR: type=${job.type} order=#${job.orderNumber || 'N/A'} error=${error.message}`);
      resolve({ success: false, error: error.message, type: job.type });
    }

    // Delay before processing next job (allows paper feed + cutter)
    if (this.queue.length > 0) {
      await new Promise(r => setTimeout(r, this.delayMs));
    }

    this.processing = false;
    this._processNext();
  }

  get pendingCount() {
    return this.queue.length + (this.processing ? 1 : 0);
  }
}


/**
 * PrinterService — Queue-based printing for receipts, KOTs, kitchen copies, void KOTs, reprints.
 * 
 * Architecture:
 * - Each physical printer gets its own PrinterQueue (created lazily, cached by name)
 * - Jobs on different printers execute in parallel (independent queues)
 * - Jobs on the same printer execute sequentially with delay + paper cut
 * - HTML generators remain unchanged from the original implementation
 */
class PrinterService {
  constructor() {
    this.queues = new Map();        // printerName → PrinterQueue
    this.activePrints = new Set();
    this.JOB_DELAY_MS = 800;       // Delay between sequential jobs on same printer
  }

  // ─── Queue Management ──────────────────────────────────────
  _getQueue(printerName) {
    if (!printerName) {
      log.warn('[PrinterService] _getQueue called with no printerName');
      return null;
    }
    if (!this.queues.has(printerName)) {
      this.queues.set(printerName, new PrinterQueue(printerName, this.JOB_DELAY_MS));
      log.info(`[PrinterService] Created new queue for printer: "${printerName}"`);
    }
    return this.queues.get(printerName);
  }

  // ─── Core Print Method (called by queue) ───────────────────
  // REMOVED POOLING to ensure clean state for every print job.
  // This prevents Electron from 'remembering' the last used printer in a reused window.
  async printHtml(htmlContent, printerName, paperWidth = '80') {
    return new Promise(async (resolve) => {
      let printWindow = null;
      try {
        // Create a FRESH window for every print to avoid state leakage
        printWindow = new BrowserWindow({
          show: false,
          width: 350,
          height: 800,
          webPreferences: { nodeIntegration: false, contextIsolation: true }
        });
        this.activePrints.add(printWindow);

        const contentWidth = paperWidth === '58' ? 190 : 272;
        const pageSize = paperWidth === '58' ? '58mm' : '72mm';

        // 1. Get system printers to validate name and find default if needed
        const systemPrinters = await printWindow.webContents.getPrintersAsync();
        let targetPrinter = null;

        if (printerName) {
          // Check if the requested printer exists in system
          const found = systemPrinters.find(p => p.name === printerName || p.displayName === printerName);
          if (found) {
            targetPrinter = found.name;
          } else {
            log.warn(`[PrinterService] Printer "${printerName}" not found in system! Falling back to default.`);
            const defaultPrinter = systemPrinters.find(p => p.isDefault);
            targetPrinter = defaultPrinter ? defaultPrinter.name : systemPrinters[0]?.name;
          }
        } else {
          // No printer specified, use default
          const defaultPrinter = systemPrinters.find(p => p.isDefault);
          targetPrinter = defaultPrinter ? defaultPrinter.name : systemPrinters[0]?.name;
          log.info(`[PrinterService] No printer specified, using system default: "${targetPrinter}"`);
        }

        log.info(`[PrinterService] Finalizing routing: Requested="${printerName || 'DEFAULT'}" -> Actual="${targetPrinter}"`);

        const html = `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @page { margin: 0; size: ${pageSize} auto; }
        body { 
          margin: 0; padding: 6px 8px; 
          font-family: 'Courier New', 'Consolas', monospace;
          font-size: 13px; color: #000; background: #fff;
          width: ${contentWidth}px; line-height: 1.2;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          font-weight: 700;
        }
        *, *::before, *::after { box-sizing: border-box; }
        h1,h2,h3,h4,h5,h6,p { margin: 0; padding: 0; }
        .divider { border-top: 1px dashed #000; margin: 10px 0; }
        .divider-dark { border-top: 1px dashed #000; margin: 10px 0; }
        .divider-solid { border-top: 2px solid #000; margin: 8px 0; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .bold { font-weight: 700; }
        .row { display: flex; justify-content: space-between; line-height: 1.8; }
        .row .label { color: #000; }
        .item-row { display: flex; justify-content: space-between; padding: 5px 0; line-height: 1.4; }
        .item-row .amount { font-weight: 800; }
        .total-row { display: flex; justify-content: space-between; font-weight: 900; font-size: 18px; margin-top: 8px; padding-top: 10px; border-top: 2px solid #000; }
        .header { font-weight: 700; font-size: 16px; letter-spacing: 1px; text-align: center; }
        .subheader { font-size: 11px; text-align: center; color: #000; margin-top: 4px; }
        .reprint-badge { text-align: center; background: #000; color: #fff; font-weight: 900; padding: 4px; font-size: 14px; letter-spacing: 3px; margin-bottom: 6px; }
        .kitchen-badge { text-align: center; font-weight: 700; font-size: 12px; letter-spacing: 1px; padding: 4px; border: 2px solid #000; margin-bottom: 6px; }
        .logo { text-align: center; margin-bottom: 6px; }
        .logo img { max-width: ${contentWidth - 40}px; max-height: 80px; object-fit: contain; }
        .qr-section { text-align: center; margin-top: 8px; }
        .item-detail { font-size: 11px; padding-left: 12px; color: #000; }
        .tax-detail { font-size: 10px; color: #000; padding-left: 12px; }
        .kot-header { font-size: 22px; font-weight: 900; text-align: center; letter-spacing: 2px; }
        .station-name { text-align: center; background: #000; color: #fff; font-weight: 900; padding: 6px; font-size: 16px; margin-bottom: 6px; letter-spacing: 1px; }
        .kot-item { font-size: 15px; font-weight: 900; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px dotted #000; }
        .kot-note { font-size: 13px; background: #000; color: #fff; font-weight: 700; padding: 4px 8px; margin-top: 3px; }
        .void-badge { text-align: center; border: 3px solid #000; font-weight: 900; padding: 8px; font-size: 20px; letter-spacing: 3px; margin-bottom: 8px; }
        /* Paper cut trigger - forces page break which triggers thermal cutter */
        .paper-cut { page-break-after: always; height: 0; visibility: hidden; }
      </style>
    </head>
    <body>${htmlContent}<div class="paper-cut"></div></body>
  </html>`;

        await printWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));

        const options = {
          silent: true,
          deviceName: targetPrinter, // ALWAYS provide a deviceName to prevent implicit 'last used' fallback
          printBackground: true,
          color: false,
          margin: { marginType: 'custom', top: 0, bottom: 0, left: 0, right: 0 },
          scaleFactor: 100
        };

        log.info(`[PrinterService] Executing webContents.print to: "${targetPrinter}" (silent=true)`);

        printWindow.webContents.print(options, (success, errorType) => {
          if (!success) {
            log.error(`[PrinterService] printHtml FAILED on "${targetPrinter}": ${errorType}`);
            resolve({ success: false, error: errorType });
          } else {
            resolve({ success: true });
          }
          
          // Clean up the window immediately after printing
          setTimeout(() => {
            if (printWindow && !printWindow.isDestroyed()) {
              this.activePrints.delete(printWindow);
              printWindow.close();
            }
          }, 1500);
        });
      } catch (error) {
        log.error(`[PrinterService] Core print error: ${error.message}`);
        if (printWindow && !printWindow.isDestroyed()) {
          this.activePrints.delete(printWindow);
          printWindow.close();
        }
        resolve({ success: false, error: error.message });
      }
    });
  }

  // ─── Delay Helper ──────────────────────────────────────────
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ─── Get System Printers ──────────────────────────────────
  async getPrinters() {
    try {
      const win = new BrowserWindow({ show: false, width: 100, height: 100 });
      const printers = await win.webContents.getPrintersAsync();
      win.close();
      return printers;
    } catch (error) {
      log.error('Get printers error:', error);
      return [];
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  MAIN DISPATCH METHOD — Replaces smartPrint
  //  Creates structured print jobs and routes to per-printer queues
  // ═══════════════════════════════════════════════════════════

  /**
   * Dispatch all print jobs for an order.
   * 
   * @param {Object} enrichedOrder - Order enriched with restaurant settings
   * @param {Array} items - Order items
   * @param {Array} categoryMap - Category→Station mappings
   * @param {string} defaultKotPrinter - Fallback KOT printer name
   * @param {boolean} attachBill - Whether to attach bill copy to kitchen
   * @param {string} billPrinterName - Bill printer name
   * @param {boolean} printBill - Whether to print the customer bill
   * @param {Array} excludedItemIds - Item IDs excluded from KOT
   * @returns {Promise<Object>} Combined results
   */
  async dispatchOrder(enrichedOrder, items, categoryMap, defaultKotPrinter, attachBill, billPrinterName, printBill = false, excludedItemIds = []) {
    const orderNumber = enrichedOrder.order_number || 'N/A';
    const paperWidth = enrichedOrder.paperWidth || '80';
    
    log.info(`\n${'═'.repeat(60)}`);
    log.info(`[DISPATCH] Order #${orderNumber} | printBill=${printBill}`);
    log.info(`[DISPATCH] billPrinter="${billPrinterName || 'NOT SET'}" | defaultKotPrinter="${defaultKotPrinter || 'NOT SET'}"`);
    log.info(`[DISPATCH] Items: ${items.length} | Excluded: ${excludedItemIds.length}`);

    // 1. Filter items for kitchen (remove excluded items)
    const kitchenItems = items.filter(item => {
      const itemId = item.menu_item_id || item.id;
      return !excludedItemIds.includes(itemId);
    });

    log.info(`[DISPATCH] KitchenItems (after exclusion): ${kitchenItems.length}`);
    log.info(`[DISPATCH] CategoryMap entries: ${categoryMap.length}`);
    if (categoryMap.length > 0) {
      log.info(`[DISPATCH] CategoryMap sample: ${JSON.stringify(categoryMap.slice(0, 5))}`);
    }

    // 2. Determine target printers for Kitchen Bill Copy based on ALL items
    // This ensures Bill Copy prints even if all items are excluded from KOT
    const allKitchenPrinters = new Set();
    for (const item of items) {
      // Use String() to avoid type mismatch (category_id could be int or string)
      const itemCatId = String(item.category_id);
      const mapping = categoryMap.find(m => String(m.category_id) === itemCatId);
      if (mapping) {
        allKitchenPrinters.add(mapping.printer_name);
      } else if (defaultKotPrinter) {
        allKitchenPrinters.add(defaultKotPrinter);
      }
    }
    // If no explicit mappings but we have a default KOT printer, use it
    if (allKitchenPrinters.size === 0 && defaultKotPrinter) {
      allKitchenPrinters.add(defaultKotPrinter);
    }

    log.info(`[DISPATCH] Target Kitchen Printers resolved: [${[...allKitchenPrinters].join(', ')}]`);

    // 3. Build print jobs
    const allJobPromises = [];
    const results = { bill: null, kitchenCopies: [], kots: [], errors: [] };

    // ── BILL PRINT JOB ──
    if (printBill && billPrinterName) {
      const billHtml = this.generateReceiptHtml(enrichedOrder);
      const billQueue = this._getQueue(billPrinterName);
      
      if (billQueue) {
        const billJob = {
          type: 'BILL',
          htmlContent: billHtml,
          paperWidth: paperWidth,
          orderNumber: orderNumber,
          orderId: enrichedOrder.id
        };

        const billPromise = billQueue.enqueue(billJob, this.printHtml.bind(this))
          .then(r => { results.bill = { ...r, type: 'BILL', printer: billPrinterName }; })
          .catch(e => { 
            results.bill = { success: false, error: e.message, type: 'BILL', printer: billPrinterName };
            results.errors.push({ type: 'BILL', printer: billPrinterName, error: e.message });
          });
        allJobPromises.push(billPromise);
      }
    }

    // ── KITCHEN BILL COPY JOBS ──
    // Send a kitchen copy to all target printers (if attachBill is true)
    if (attachBill) {
      const copyOrder = { ...enrichedOrder, items: items }; // Bill copy usually shows all items
      for (const kitchenPrinterName of allKitchenPrinters) {
        const kitchenQueue = this._getQueue(kitchenPrinterName);
        if (!kitchenQueue) continue;

        const kitchenBillHtml = this.generateReceiptHtml(copyOrder, true); // isKitchenCopy = true
        const kitchenBillJob = {
          type: 'KITCHEN_BILL_COPY',
          htmlContent: kitchenBillHtml,
          paperWidth: paperWidth,
          orderNumber: orderNumber,
          orderId: enrichedOrder.id
        };

        const kitchenBillPromise = kitchenQueue.enqueue(kitchenBillJob, this.printHtml.bind(this))
          .then(r => { results.kitchenCopies.push({ ...r, type: 'KITCHEN_BILL_COPY', printer: kitchenPrinterName }); })
          .catch(e => { 
            results.kitchenCopies.push({ success: false, error: e.message, type: 'KITCHEN_BILL_COPY', printer: kitchenPrinterName });
            results.errors.push({ type: 'KITCHEN_BILL_COPY', printer: kitchenPrinterName, error: e.message });
          });
        allJobPromises.push(kitchenBillPromise);
      }
    }

    // ── KOT JOBS (Grouped by Station) ──
    if (kitchenItems.length > 0) {
      // Group items by station_id (or a default 'unmapped' group)
      const stationGroups = new Map(); // stationKey -> { name, printer, items }
      const UNMAPPED_KEY = '__unmapped_default__';

      for (const item of kitchenItems) {
        const rawCatId = item.category_id;

        // Guard against null/undefined category_id — these can never match a mapping
        if (!rawCatId) {
          log.warn(`[DISPATCH] Item "${item.item_name}" has NO category_id (menu_item_id=${item.menu_item_id || item.id}) → unmapped default`);
          if (!stationGroups.has(UNMAPPED_KEY)) {
            stationGroups.set(UNMAPPED_KEY, {
              name: null,
              printer: defaultKotPrinter,
              items: []
            });
          }
          stationGroups.get(UNMAPPED_KEY).items.push(item);
          continue;
        }

        const itemCatId = String(rawCatId);
        // Find ALL mappings for this item's category (a category can map to multiple stations)
        const mappings = categoryMap.filter(m => String(m.category_id) === itemCatId);
        
        log.info(`[DISPATCH] Item "${item.item_name}" cat_id="${itemCatId}" → ${mappings.length} station mapping(s)`);

        if (mappings.length > 0) {
          // Send this item to each mapped station
          for (const mapping of mappings) {
            const key = mapping.station_id || mapping.station_name;
            log.info(`[DISPATCH]   → Station: "${mapping.station_name}" (id=${mapping.station_id}) printer="${mapping.printer_name}"`);
            if (!stationGroups.has(key)) {
              stationGroups.set(key, {
                name: mapping.station_name,
                printer: mapping.printer_name,
                items: []
              });
            }
            stationGroups.get(key).items.push(item);
          }
        } else {
          // Unmapped item goes to default KOT printer
          log.info(`[DISPATCH]   → No station mapping for cat_id="${itemCatId}", using default KOT printer`);
          if (!stationGroups.has(UNMAPPED_KEY)) {
            stationGroups.set(UNMAPPED_KEY, {
              name: null, // No specific station name
              printer: defaultKotPrinter,
              items: []
            });
          }
          stationGroups.get(UNMAPPED_KEY).items.push(item);
        }
      }

      log.info(`[DISPATCH] Station groups formed: ${stationGroups.size}`);
      for (const [key, group] of stationGroups.entries()) {
        log.info(`[DISPATCH]   Station "${group.name || 'Default'}" → ${group.items.length} items → printer="${group.printer}" [${group.items.map(i => i.item_name).join(', ')}]`);
      }

      // Generate a KOT job for each station group
      for (const [key, group] of stationGroups.entries()) {
        const printerToUse = group.printer;
        if (!printerToUse) {
          log.warn(`[DISPATCH] Skipping KOT for station "${group.name}" — no printer assigned`);
          continue;
        }
        const kitchenQueue = this._getQueue(printerToUse);
        if (!kitchenQueue) {
          log.warn(`[DISPATCH] Skipping KOT for station "${group.name}" — could not get queue for "${printerToUse}"`);
          continue;
        }

        const kotOrder = { ...enrichedOrder, items: group.items };
        const kotHtml = this.generateKOTHtml(kotOrder, group.items, null, group.name);
        
        const kotJob = {
          type: 'KOT',
          htmlContent: kotHtml,
          paperWidth: '80', // KOT always 80mm
          orderNumber: orderNumber,
          orderId: enrichedOrder.id
        };

        log.info(`[DISPATCH] Enqueuing KOT for station "${group.name || 'Default'}" with ${group.items.length} items to printer "${printerToUse}"`);

        const kotPromise = kitchenQueue.enqueue(kotJob, this.printHtml.bind(this))
          .then(r => { results.kots.push({ ...r, type: 'KOT', printer: printerToUse, station: group.name }); })
          .catch(e => { 
            results.kots.push({ success: false, error: e.message, type: 'KOT', printer: printerToUse, station: group.name });
            results.errors.push({ type: 'KOT', printer: printerToUse, station: group.name, error: e.message });
          });
        allJobPromises.push(kotPromise);
      }
    } else {
      log.info(`[DISPATCH] No kitchen items after exclusion — skipping KOT generation`);
    }

    // 4. Wait for all queues to process (they run independently per printer)
    await Promise.allSettled(allJobPromises);

    // 5. Log summary
    const totalJobs = (results.bill ? 1 : 0) + results.kitchenCopies.length + results.kots.length;
    const failedJobs = results.errors.length;
    log.info(`[DISPATCH] Order #${orderNumber} COMPLETE: ${totalJobs} jobs dispatched, ${failedJobs} failed`);
    if (failedJobs > 0) {
      log.error(`[DISPATCH] Failed jobs:`, results.errors);
    }
    log.info(`${'═'.repeat(60)}\n`);

    return { success: true, ...results };
  }

  // ═══════════════════════════════════════════════════════════
  //  DIRECT PRINT METHODS (for standalone operations)
  //  These use the queue system for individual prints
  // ═══════════════════════════════════════════════════════════

  // ─── Print Receipt (standalone, e.g. reprint) ──────────────
  async printReceipt(order, printerName = null) {
    try {
      if (!printerName) {
        log.warn('[PrinterService] printReceipt called with no printerName');
        return { success: false, error: 'No printer configured' };
      }
      const html = this.generateReceiptHtml(order);
      const queue = this._getQueue(printerName);
      if (!queue) return { success: false, error: 'Could not create printer queue' };

      return await queue.enqueue(
        { type: 'BILL', htmlContent: html, paperWidth: order.paperWidth || '80', orderNumber: order.order_number || 'N/A' },
        this.printHtml.bind(this)
      );
    } catch (error) {
      log.error('Print receipt error:', error);
      return { success: false, error: error.message };
    }
  }

  // ─── Print Kitchen Bill Copy ───────────────────────────────
  async printKitchenBillCopy(order, printerName = null) {
    try {
      if (!printerName) return { success: false, error: 'No printer configured' };
      const html = this.generateReceiptHtml(order, true);
      const queue = this._getQueue(printerName);
      if (!queue) return { success: false, error: 'Could not create printer queue' };

      return await queue.enqueue(
        { type: 'KITCHEN_BILL_COPY', htmlContent: html, paperWidth: order.paperWidth || '80', orderNumber: order.order_number || 'N/A' },
        this.printHtml.bind(this)
      );
    } catch (error) {
      log.error('Print kitchen bill copy error:', error);
      return { success: false, error: error.message };
    }
  }

  // ─── Print KOT ─────────────────────────────────────────────
  async printKOT(order, items, printerName = null, kotNumber = null, stationName = null, isReprint = false) {
    try {
      if (!printerName) return { success: false, error: 'No printer configured' };
      const html = this.generateKOTHtml(order, items, kotNumber, stationName, isReprint);
      const queue = this._getQueue(printerName);
      if (!queue) return { success: false, error: 'Could not create printer queue' };

      return await queue.enqueue(
        { type: 'KOT', htmlContent: html, paperWidth: '80', orderNumber: order.order_number || 'N/A' },
        this.printHtml.bind(this)
      );
    } catch (error) {
      log.error('Print KOT error:', error);
      return { success: false, error: error.message };
    }
  }

  // ─── Print Void KOT ───────────────────────────────────────
  async printVoidKOT(order, items, reason, printerName = null, kotNumber = null) {
    try {
      if (!printerName) return { success: false, error: 'No printer configured' };
      const html = this.generateVoidKOTHtml(order, items, reason, kotNumber);
      const queue = this._getQueue(printerName);
      if (!queue) return { success: false, error: 'Could not create printer queue' };

      return await queue.enqueue(
        { type: 'VOID_KOT', htmlContent: html, paperWidth: '80', orderNumber: order.order_number || 'N/A' },
        this.printHtml.bind(this)
      );
    } catch (error) {
      log.error('Print Void KOT error:', error);
      return { success: false, error: error.message };
    }
  }

  // ─── Test Print ────────────────────────────────────────────
  async testPrint(printerName = null) {
    try {
      const html = `
        <div style="text-align: center; padding: 10px;">
          <div style="font-size: 22px; font-weight: 900; margin-bottom: 10px;">✓ TEST PRINT</div>
          <div class="divider-solid"></div>
          <p style="font-size: 14px; margin: 10px 0; font-weight: 700;">Printer is working correctly!</p>
          <p style="font-size: 12px; color: #000;">${new Date().toLocaleString()}</p>
          <p style="font-size: 11px; color: #000; margin-top: 4px;">Printer: ${printerName || 'default'}</p>
          <div class="divider-solid"></div>
          <p style="font-size: 11px; color: #000; margin-top: 8px;">ZapBill POS System</p>
        </div>
      `;

      if (printerName) {
        const queue = this._getQueue(printerName);
        if (queue) {
          return await queue.enqueue(
            { type: 'TEST', htmlContent: html, paperWidth: '80', orderNumber: 'TEST' },
            this.printHtml.bind(this)
          );
        }
      }
      // Fallback: direct print without queue
      return await this.printHtml(html, printerName);
    } catch (error) {
      log.error('Test print error:', error);
      return { success: false, error: error.message };
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  HTML GENERATORS
  //  Receipt format matches OrdersPage BillViewModal exactly
  // ═══════════════════════════════════════════════════════════

  /**
   * Generate receipt HTML — mirrors the BillViewModal from OrdersPage.
   * Same format is used for customer bill and kitchen copy.
   */
  generateReceiptHtml(order, isKitchenCopy = false) {
    const items = order.items || [];
    const cs = order.currencySymbol || '₹';

    // Badges
    const reprintBadge = order.isReprint
      ? '<div class="reprint-badge">*** REPRINT ***</div>' : '';
    const kitchenBadge = isKitchenCopy
      ? '<div class="kitchen-badge">--- KITCHEN COPY ---</div>' : '';

    // Logo
    const logoHtml = order.showLogo && order.logoPath
      ? `<div class="logo"><img src="${order.logoPath}" alt="Logo"></div>` : '';

    // Restaurant header
    const restaurantName = order.restaurantName || 'Restaurant POS';
    const address = order.restaurantAddress ? `<div class="subheader">${order.restaurantAddress}</div>` : '';
    const phone = order.restaurantPhone ? `<div class="subheader">Tel: ${order.restaurantPhone}</div>` : '';
    const gst = order.gstNumber ? `<div class="subheader" style="font-weight:700;">GSTIN: ${order.gstNumber}</div>` : '';
    const fssai = order.fssaiNumber ? `<div class="subheader">FSSAI: ${order.fssaiNumber}</div>` : '';

    // Format date
    const formatDate = (dateStr) => {
      try {
        return new Date(dateStr).toLocaleString('en-IN', {
          day: '2-digit', month: 'short', year: 'numeric',
          hour: '2-digit', minute: '2-digit'
        });
      } catch (e) { return ''; }
    };

    // Order details
    let orderDetails = '';
    orderDetails += `<div class="row"><span class="label">Bill No:</span><strong>#${order.order_number || ''}</strong></div>`;
    orderDetails += `<div class="row"><span class="label">Date:</span><span>${formatDate(order.created_at || new Date().toISOString())}</span></div>`;
    if (order.table_number) {
      orderDetails += `<div class="row"><span class="label">Table:</span><span>${order.table_number}</span></div>`;
    }
    orderDetails += `<div class="row"><span class="label">Type:</span><span>${(order.order_type || 'dine_in').replace('_', ' ').toUpperCase()}</span></div>`;
    
    // Customer info
    if (order.showCustomerDetails !== false) {
      if (order.customer_name) {
        orderDetails += `<div class="row"><span class="label">Customer:</span><span>${order.customer_name}</span></div>`;
      }
      if (order.customer_phone) {
        orderDetails += `<div class="row"><span class="label">Phone:</span><span>${order.customer_phone}</span></div>`;
      }
    }

    // Items
    const itemsHtml = items.map(item => {
      let details = '';
      if (item.variant) {
        try {
          const v = typeof item.variant === 'string' ? JSON.parse(item.variant) : item.variant;
          if (v && v.name) details += `<div class="item-detail">↳ ${v.name}</div>`;
        } catch (_) {}
      }
      if (item.addons) {
        try {
          const a = typeof item.addons === 'string' ? JSON.parse(item.addons) : item.addons;
          if (Array.isArray(a)) {
            a.forEach(addon => {
              details += `<div class="item-detail">+ ${addon.name}${addon.price ? ` (${cs}${Number(addon.price).toFixed(2)})` : ''}</div>`;
            });
          }
        } catch (_) {}
      }
      if (item.special_instructions) {
        details += `<div class="item-detail" style="font-style:italic;">Note: ${item.special_instructions}</div>`;
      }

      let taxInfo = '';
      if (order.showItemwiseTax && item.tax_rate) {
        const taxAmt = ((item.item_total || 0) * (item.tax_rate / 100)).toFixed(2);
        taxInfo = `<div class="tax-detail">Tax ${item.tax_rate}%: ${cs}${taxAmt}</div>`;
      }

      return `
        <div class="item-row">
          <span>${item.item_name} × ${item.quantity}</span>
          <span class="amount">${cs}${(item.item_total || 0).toFixed(2)}</span>
        </div>
        ${details}${taxInfo}`;
    }).join('');

    // Totals
    let totalsHtml = '';
    totalsHtml += `<div class="row"><span class="label">Subtotal:</span><span>${cs}${(order.subtotal || 0).toFixed(2)}</span></div>`;
    
    if (order.tax_amount > 0) {
      totalsHtml += `<div class="row"><span class="label">Tax:</span><span>${cs}${order.tax_amount.toFixed(2)}</span></div>`;
    }
    if (order.delivery_charge > 0) {
      totalsHtml += `<div class="row"><span class="label">Delivery:</span><span>${cs}${order.delivery_charge.toFixed(2)}</span></div>`;
    }
    if (order.container_charge > 0) {
      totalsHtml += `<div class="row"><span class="label">Container:</span><span>${cs}${order.container_charge.toFixed(2)}</span></div>`;
    }
    if (order.discount_amount > 0) {
      totalsHtml += `<div class="row" style="color: #000; font-weight:700;"><span>Discount:</span><span>-${cs}${order.discount_amount.toFixed(2)}</span></div>`;
    }

    // Payment info
    const paymentHtml = order.payment_method ? `
      <div style="text-align: center; margin-top: 10px; padding-top: 10px; border-top: 1px dashed #000; color: #000; font-size: 12px; letter-spacing: 0.5px;">
        Paid via <strong style="color: #000;">${order.payment_method.toUpperCase()}</strong>
      </div>` : '';

    // QR Code
    let qrHtml = '';
    if (order.showQR && order.qrUpiId) {
      qrHtml = `
        <div class="qr-section">
          <div class="divider"></div>
          <div style="font-size: 12px; font-weight: 700; margin-bottom: 6px;">Scan to Pay via UPI</div>
          <div style="border: 2px solid #000; padding: 8px; display: inline-block; font-size: 12px;">
            <div style="font-weight: 700;">UPI: ${order.qrUpiId}</div>
            <div style="font-size: 11px; margin-top: 3px;">Amount: ${cs}${(order.total_amount || 0).toFixed(2)}</div>
          </div>
        </div>`;
    }

    // Footer
    const footer = order.receiptFooter || 'Thank you for dining with us!';

    return `
      ${reprintBadge}
      ${kitchenBadge}
      ${logoHtml}
      
      <div class="header" style="color:#000;">${restaurantName}</div>
      ${address}${phone}${gst}${fssai}
      
      <div class="divider"></div>
      
      ${orderDetails}
      
      <div class="divider"></div>
      
      ${itemsHtml}
      
      <div class="divider"></div>
      
      ${totalsHtml}
      
      <div class="total-row" style="color:#000;">
        <span>TOTAL:</span>
        <span>${cs}${(order.total_amount || 0).toFixed(2)}</span>
      </div>
      
      ${paymentHtml}
      ${qrHtml}
      
      <div class="divider" style="margin-top: 10px;"></div>
      <div class="text-center" style="font-size: 12px; color: #000; letter-spacing: 0.5px;">${footer}</div>
      <div class="text-center" style="font-size: 9px; margin-top: 4px; color: #000;">Powered by ZapBill POS</div>
      ${isKitchenCopy ? '<div class="text-center" style="font-size: 10px; margin-top: 6px; font-weight: 700; color:#000;">--- Kitchen Copy ---</div>' : ''}
    `;
  }

  // ─── KOT HTML ──────────────────────────────────────────────
  generateKOTHtml(order, items, kotNumber = null, stationName = null, isReprint = false) {
    const reprintBadge = isReprint
      ? '<div class="reprint-badge">*** REPRINT KOT ***</div>' : '';

    const stationBadge = stationName
      ? `<div class="station-name">📍 ${stationName.toUpperCase()}</div>` : '';

    const kotNumberLine = kotNumber
      ? `<div style="font-size: 18px; font-weight: 900; text-align: center;">KOT #${kotNumber}</div>` : '';

    const itemsHtml = (items || []).map(item => {
      let details = '';
      if (item.variant) {
        try {
          const v = typeof item.variant === 'string' ? JSON.parse(item.variant) : item.variant;
          if (v && v.name) details += `<div style="font-size: 13px; padding-left: 14px; font-weight: 600;">↳ ${v.name}</div>`;
        } catch (_) {}
      }
      if (item.addons) {
        try {
          const a = typeof item.addons === 'string' ? JSON.parse(item.addons) : item.addons;
          if (Array.isArray(a)) {
            a.forEach(addon => {
              details += `<div style="font-size: 13px; padding-left: 14px; font-weight: 600;">+ ${addon.name}</div>`;
            });
          }
        } catch (_) {}
      }
      if (item.special_instructions) {
        details += `<div class="kot-note">📝 ${item.special_instructions}</div>`;
      }

      return `
        <div class="kot-item">
          <div style="font-size: 16px; font-weight: 900;">${item.quantity} × ${item.item_name}</div>
          ${details}
        </div>`;
    }).join('');

    const urgency = order.urgency || 'normal';
    const urgencyBadge = (urgency === 'urgent' || urgency === 'critical')
      ? `<div style="text-align: center; background: #000; color: #fff; font-weight: 900; padding: 6px; font-size: 16px; letter-spacing: 3px; margin-bottom: 6px;">⚡ ${urgency.toUpperCase()} ⚡</div>`
      : '';

    return `
      ${urgencyBadge}
      ${reprintBadge}
      ${stationBadge}
      
      <div class="kot-header">KITCHEN ORDER TICKET</div>
      ${kotNumberLine}
      <div style="text-align: center; font-size: 14px; font-weight: 700;">${(order.order_type || '').replace('_', ' ').toUpperCase()}</div>
      
      <div class="divider-solid"></div>
      
      <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: 700;">
        <span>Order #: ${order.order_number || 'N/A'}</span>
        <span>${new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
      </div>
      ${order.table_number ? `<div style="font-size: 20px; font-weight: 900; text-align: center; margin: 6px 0; background: #000; color: #fff; padding: 6px;">TABLE ${order.table_number}</div>` : ''}
      ${order.customer_name ? `<div style="font-size: 13px; font-weight: 700;">Customer: ${order.customer_name}</div>` : ''}
      
      <div class="divider-solid"></div>
      
      ${itemsHtml}
      
      ${order.chef_instructions ? `
        <div style="margin-top: 8px; padding: 6px; border: 3px solid #000; font-weight: 900; font-size: 14px;">
          🍳 CHEF: ${order.chef_instructions}
        </div>
      ` : ''}
      
      <div class="divider-solid" style="margin-top: 12px;"></div>
      <div class="text-center" style="font-size: 11px; font-weight: 600;">--- Kitchen Copy ---</div>
    `;
  }

  // ─── Void KOT HTML ────────────────────────────────────────
  generateVoidKOTHtml(order, items, reason, kotNumber = null) {
    const itemsHtml = (items || []).map(item => `
      <div style="font-size: 15px; font-weight: 900; margin-bottom: 6px; text-decoration: line-through;">
        ${item.quantity || 1} × ${item.item_name || item.name || 'Item'}
      </div>
    `).join('');

    return `
      <div class="void-badge">❌ VOID KOT ❌</div>
      
      ${kotNumber ? `<div style="font-size: 16px; font-weight: 900; text-align: center;">KOT #${kotNumber}</div>` : ''}
      
      <div class="divider-solid"></div>
      
      <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 600;">
        <span>Order #: ${order.order_number || 'N/A'}</span>
        <span>${new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
      </div>
      ${order.table_number ? `<div style="font-size: 18px; font-weight: 900; text-align: center; margin: 6px 0;">TABLE ${order.table_number}</div>` : ''}
      
      <div class="divider-solid"></div>
      
      <div style="font-weight: 900; margin-bottom: 8px; font-size: 14px;">CANCELLED ITEMS:</div>
      ${itemsHtml}
      
      ${reason ? `
        <div class="divider"></div>
        <div style="font-weight: 900; font-size: 13px;">Reason: ${reason}</div>
      ` : ''}
      
      <div class="divider" style="margin-top: 12px;"></div>
      <div class="text-center" style="font-size: 11px; font-weight: 600;">--- Void Copy ---</div>
    `;
  }

  // ─── Summary Report HTML ──────────────────────────────────
  generateSummaryReportHtml(reportData, date) {
    const { sales } = reportData;
    const formattedDate = new Date(date).toLocaleDateString('en-IN', { 
      day: '2-digit', month: 'short', year: 'numeric' 
    });

    return `
      <div class="header" style="font-size: 18px; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 10px;">DAILY SALES REPORT</div>
      <div class="text-center bold" style="margin-bottom: 10px;">Date: ${formattedDate}</div>
      
      <div class="divider-solid"></div>
      
      <div class="row"><span class="label">Opening Balance:</span><span class="bold">₹${(sales.opening_balance || 0).toFixed(2)}</span></div>
      
      <div class="divider"></div>
      <div class="text-center bold" style="font-size: 14px; margin-top: 10px; text-decoration: underline;">SALES BY TYPE</div>
      <div class="row"><span class="label">Dine-In:</span><span class="bold">₹${(sales.dine_in_amount || 0).toFixed(2)}</span></div>
      <div class="row"><span class="label">Take Away:</span><span class="bold">₹${(sales.takeaway_amount || 0).toFixed(2)}</span></div>
      <div class="row"><span class="label">Delivery:</span><span class="bold">₹${(sales.delivery_amount || 0).toFixed(2)}</span></div>
      <div class="row bold" style="margin-top: 4px; border-top: 1px dotted #000;"><span class="label">Total Revenue:</span><span>₹${(sales.total_revenue || 0).toFixed(2)}</span></div>
      
      <div class="divider"></div>
      <div class="text-center bold" style="font-size: 14px; margin-top: 5px; text-decoration: underline;">PAYMENT METHODS</div>
      <div class="row"><span class="label">Cash:</span><span class="bold">₹${(sales.cash_amount || 0).toFixed(2)}</span></div>
      <div class="row"><span class="label">UPI:</span><span class="bold">₹${(sales.upi_amount || 0).toFixed(2)}</span></div>
      <div class="row"><span class="label">Card:</span><span class="bold">₹${(sales.card_amount || 0).toFixed(2)}</span></div>
      <div class="row"><span class="label">Due (Unpaid):</span><span class="bold">₹${(sales.due_amount || 0).toFixed(2)}</span></div>
      
      <div class="divider"></div>
      <div class="text-center bold" style="font-size: 14px; margin-top: 5px; text-decoration: underline;">EXPENSES & DRAWER</div>
      <div class="row"><span class="label">Staff Advance:</span><span class="bold">₹${(sales.staff_advance_total || 0).toFixed(2)}</span></div>
      <div class="row"><span class="label">Cash Withdrawal:</span><span class="bold">₹${(sales.withdrawal_total || 0).toFixed(2)}</span></div>
      <div class="row"><span class="label">Other Expenses:</span><span class="bold">₹${((sales.total_expenses || 0) - (sales.staff_advance_total || 0) - (sales.withdrawal_total || 0)).toFixed(2)}</span></div>
      <div class="row bold" style="margin-top: 4px; border-top: 1px dotted #000;"><span class="label">Total Expenses:</span><span>₹${((sales.total_expenses || 0)).toFixed(2)}</span></div>
      
      <div class="divider-solid"></div>
      <div class="row" style="font-size: 16px; margin-top: 10px; padding: 10px 0; border: 2px solid #000; text-align: center; display: block;">
        <div class="label" style="width: 100%; text-align: center;">CASH IN HAND:</div>
        <div style="width: 100%; text-align: center; font-size: 22px; margin-top: 5px;">₹${(sales.opening_balance + sales.cash_amount - sales.total_expenses).toFixed(2)}</div>
      </div>
      
      <div class="divider"></div>
      <div class="text-center" style="font-size: 11px; margin-top: 15px;">Report Generated: ${new Date().toLocaleString()}</div>
      <div class="text-center" style="font-size: 11px; margin-bottom: 20px;">--- END OF REPORT ---</div>
    `;
  }

  async printSummaryReport(reportData, date, printerName) {
    try {
      const html = this.generateSummaryReportHtml(reportData, date);
      if (printerName) {
        const queue = this._getQueue(printerName);
        if (queue) {
          return await queue.enqueue(
            { type: 'REPORT', htmlContent: html, paperWidth: '80', orderNumber: 'REPORT' },
            this.printHtml.bind(this)
          );
        }
      }
      return await this.printHtml(html, printerName, '80');
    } catch (error) {
      log.error('Print summary report error:', error);
      return { success: false, error: error.message };
    }
  }

  // ─── Legacy Compatibility Methods ─────────────────────────
  // These are kept for backward compatibility with any callers

  async printKOTWithBill(order, kotItems, allItems, printerName, stationName = null) {
    try {
      return await this.printKOT(order, kotItems, printerName, null, stationName);
    } catch (error) {
      log.error('Print KOT with bill error:', error);
      return { success: false, error: error.message };
    }
  }

  async printStationKOTs(order, items, stationMap, defaultPrinterName, attachBill = false, billPrinterName = null) {
    // Redirect to dispatchOrder for proper queue handling
    return await this.dispatchOrder(order, items, stationMap, defaultPrinterName, attachBill, billPrinterName, false, []);
  }

  // smartPrint — backward compat, redirects to dispatchOrder
  async smartPrint(order, items, stationMap, defaultKotPrinter, attachBill, billPrinterName, printBill = false, excludedItemIds = []) {
    return await this.dispatchOrder(order, items, stationMap, defaultKotPrinter, attachBill, billPrinterName, printBill, excludedItemIds);
  }

  // ─── Cleanup ──────────────────────────────────────────────
  destroy() {
    for (const win of this.printPool) {
      if (!win.isDestroyed()) win.close();
    }
    this.printPool = [];
    for (const win of this.activePrints) {
      if (!win.isDestroyed()) win.close();
    }
    this.activePrints.clear();
    this.queues.clear();
  }
}

module.exports = PrinterService;
