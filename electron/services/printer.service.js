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

    // Force a specific hardware delay before sending the NEXT job to the spooler.
    // This allows the POS printer buffer to clear and the physical paper cutter to complete its cycle.
    if (this.queue.length > 0) {
      const waitTime = Math.max(this.delayMs, 500); // 500ms minimum delay to avoid buffer merging on client OS
      log.info(`[PrinterQueue:${this.printerName}] Waiting ${waitTime}ms to maintain physical job isolation...`);
      await new Promise(r => setTimeout(r, waitTime)); 
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
    this.JOB_DELAY_MS = 500;       // 500ms Delay strictly enforced between sequential jobs
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

        const jobId = `JOB_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        log.info(`[PrinterService] Generated logical job: ${jobId} for "${targetPrinter}"`);

        const html = `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8">
      <title>${jobId}</title>
      <style>
        @page { margin: 0; padding: 0; size: ${pageSize} auto; }
        * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        body { 
          margin: 0; padding: 8px 8px 2px 8px; 
          font-family: 'Courier New', Courier, monospace;
          font-size: 14px; 
          color: #000; 
          background: #fff;
          width: ${contentWidth}px; 
          line-height: 1.4;
          font-weight: 600;
        }
        h1, h2, h3, h4, h5, h6, p { margin: 0; padding: 0; }
        
        /* Layout Utilities */
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .text-left { text-align: left; }
        .bold { font-weight: 900; }
        .uppercase { text-transform: uppercase; }
        
        /* Professional Separators */
        .line-dashed { border-top: 1px dashed #000; margin: 6px 0; width: 100%; }
        .line-double { border-top: 1px solid #000; border-bottom: 1px solid #000; height: 4px; margin: 8px 0; width: 100%; padding: 0; }
        .line-thick { border-top: 2px solid #000; margin: 8px 0; width: 100%; }
        .line-dotted { border-top: 1px dotted #000; margin: 6px 0; width: 100%; }
        
        /* Bill Header */
        .restaurant-name { font-weight: 900; font-size: 19px; text-align: center; margin-bottom: 4px; }
        .tax-invoice-label { font-size: 15px; font-weight: 900; text-align: center; border: 1px solid #000; padding: 3px; margin: 8px 0; letter-spacing: 2px; }
        .info-label { font-size: 11px; text-align: center; margin-bottom: 2px; }
        
        /* Info Grid */
        .info-section { margin: 10px 0; }
        .info-row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 2px; }
        .info-val { font-weight: 900; }
        
        /* Table Layout */
        .table-header { display: flex; font-weight: 900; font-size: 14px; padding-bottom: 4px; border-bottom: 1px solid #000; margin-bottom: 4px; }
        .item-row { display: flex; padding: 5px 0; align-items: flex-start; font-size: 14px; }
        .col-name { flex: 0 0 62%; text-align: left; overflow-wrap: break-word; font-weight: 900; padding-right: 4px; }
        .col-qty { flex: 0 0 13%; text-align: center; font-weight: 900; }
        .col-price { flex: 0 0 25%; text-align: right; font-weight: 900; }
        
        /* Sub-items */
        .sub-item { font-size: 11px; font-weight: 700; padding-left: 10px; margin-top: -1px; }
        .item-tax { font-size: 10px; padding-left: 10px; font-style: italic; }
        
        /* Totals Area */
        .total-container { margin-top: 10px; }
        .total-row { display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 14px; }
        .grand-total { 
          display: flex; justify-content: space-between; 
          font-weight: 900; font-size: 22px; 
          margin: 10px 0; padding: 10px 0;
          border-top: 1px solid #000; border-bottom: 1px solid #000;
        }
        
        /* Badges */
        .reprint-title { background: #000; color: #fff; text-align: center; font-weight: 900; font-size: 16px; padding: 6px; margin-bottom: 10px; letter-spacing: 4px; }
        .kitchen-title { text-align: center; border: 2px solid #000; font-weight: 900; font-size: 14px; padding: 4px; margin-bottom: 10px; }
        
        /* KOT Styles */
        .kot-num { font-size: 32px; font-weight: 900; text-align: center; padding: 6px; border: 3px solid #000; margin: 10px 0; }
        .kot-item-row { display: flex; align-items: flex-start; gap: 12px; font-size: 20px; font-weight: 900; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px dotted #000; }
        .kot-qty { flex: 0 0 45px; border-right: 2px solid #000; }
        
        .paper-cut { page-break-after: always; height: 1px; visibility: hidden; }
      </style>
    </head>
    <body>${htmlContent}
      <div class="paper-cut"></div>
    </body>
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

        log.info(`[PrinterService] Initiating isolated webContents print buffer for job: ${jobId}`);
        log.info(`[PrinterService] Executing webContents.print to: "${targetPrinter}" (silent=true). A completely separate physical print job buffer will be sent to the Windows spooler.`);

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
  async dispatchOrder(enrichedOrder, items, categoryMap, defaultKotPrinter, attachBill, billPrinterName, printBill = false, excludedItemIds = [], itemMap = []) {
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
    log.info(`[DISPATCH] ItemMap entries: ${itemMap.length}`);

    // 2. Determine target printers for Kitchen Bill Copy based on ALL items
    // This ensures Bill Copy prints even if all items are excluded from KOT
    const allKitchenPrinters = new Set();
    for (const item of items) {
      const itemId = String(item.menu_item_id || item.id);
      const itemCatId = String(item.category_id);
      
      const itemMappings = itemMap.filter(m => String(m.item_id) === itemId);
      
      if (itemMappings && itemMappings.length > 0) {
        // Item-level routing overrides category-level routing completely
        itemMappings.forEach(m => allKitchenPrinters.add(m.printer_name));
      } else {
        const mapping = categoryMap.find(m => String(m.category_id) === itemCatId);
        if (mapping) {
          allKitchenPrinters.add(mapping.printer_name);
        } else if (defaultKotPrinter) {
          allKitchenPrinters.add(defaultKotPrinter);
        }
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

        const itemId = String(item.menu_item_id || item.id);
        const itemCatId = String(rawCatId);
        
        let mappings = itemMap.filter(m => String(m.item_id) === itemId);
        let usedItemMap = true;
        
        if (!mappings || mappings.length === 0) {
          // Find ALL mappings for this item's category (a category can map to multiple stations) // eslint-disable-next-line
          mappings = categoryMap.filter(m => String(m.category_id) === itemCatId);
          usedItemMap = false;
        }
        
        log.info(`[DISPATCH] Item "${item.item_name}" id="${itemId}" → ${mappings.length} station mapping(s) [Source: ${usedItemMap ? 'ITEM' : 'CATEGORY'}]`);

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
      ? '<div class="reprint-title">*** REPRINT ***</div>' : '';
    // Kitchen copy is now a duplicate of the main bill — no special badge

    // Logo
    const logoHtml = order.showLogo && order.logoPath
      ? `<div class="logo"><img src="${order.logoPath}" alt="Logo"></div>` : '';

    // Restaurant header
    const restaurantName = order.restaurantName || 'Restaurant POS';
    const address = order.restaurantAddress ? `<div class="info-label">${order.restaurantAddress}</div>` : '';
    const phone = order.restaurantPhone ? `<div class="info-label">Tel: ${order.restaurantPhone}</div>` : '';
    const gstValue = order.gstNumber;
    const gstHtml = gstValue ? `<div class="info-label bold">GSTIN: ${gstValue}</div>` : '';
    const fssai = order.fssaiNumber ? `<div class="info-label">FSSAI: ${order.fssaiNumber}</div>` : '';

    const taxInvoice = gstValue ? '<div class="tax-invoice-label">TAX INVOICE</div>' : '';

    // Format date
    const formatDate = (dateStr) => {
      try {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-GB') + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } catch (e) { return ''; }
    };

    // Order info grid
    let orderDetails = `<div class="line-thick"></div><div class="info-section">`;
    orderDetails += `<div class="info-row"><span>Bill No:</span><span class="info-val">#${order.order_number || ''}</span></div>`;
    orderDetails += `<div class="info-row"><span>Date:</span><span>${formatDate(order.created_at || new Date().toISOString())}</span></div>`;
    
    if (order.table_number) {
      orderDetails += `<div class="info-row" style="font-size: 16px;"><span style="font-weight: 900;">Token No:</span><span style="font-weight: 900; font-size: 18px;">${order.table_number}</span></div>`;
    }
    orderDetails += `<div class="info-row" style="font-size: 15px;"><span style="font-weight: 900;">Order Type:</span><span class="uppercase" style="font-weight: 900; font-size: 16px;">${(order.order_type || 'dine_in').replace('_', ' ')}</span></div>`;
    
    // Customer info
    if (order.showCustomerDetails !== false) {
      if (order.customer_name) {
        orderDetails += `<div class="info-row"><span>Customer:</span><span class="info-val">${order.customer_name}</span></div>`;
      }
      if (order.customer_phone) {
        orderDetails += `<div class="info-row"><span>Phone:</span><span>${order.customer_phone}</span></div>`;
      }
    }
    orderDetails += `</div><div class="line-thick"></div>`;

    // Items Table
    let itemsHtml = `
      <div class="table-header">
        <span class="col-name">ITEM DESCRIPTION</span>
        <span class="col-qty">QTY</span>
        <span class="col-price">PRICE</span>
      </div>
    `;

    itemsHtml += items.map(item => {
      let details = '';
      if (item.variant) {
        try {
          const v = typeof item.variant === 'string' ? JSON.parse(item.variant) : item.variant;
          if (v && v.name) details += `<div class="sub-item">↳ ${v.name}</div>`;
        } catch (_) {}
      }
      if (item.addons) {
        try {
          const a = typeof item.addons === 'string' ? JSON.parse(item.addons) : item.addons;
          if (Array.isArray(a)) {
            a.forEach(addon => {
              details += `<div class="sub-item">+ ${addon.name}${addon.price ? ` (${cs}${Number(addon.price).toFixed(2)})` : ''}</div>`;
            });
          }
        } catch (_) {}
      }
      if (item.special_instructions) {
        details += `<div class="sub-item" style="font-style:italic;">Note: ${item.special_instructions}</div>`;
      }

      let taxInfo = '';
      if (order.showItemwiseTax && item.tax_rate) {
        const taxAmt = ((item.item_total || 0) * (item.tax_rate / 100)).toFixed(2);
        taxInfo = `<div class="item-tax">Tax ${item.tax_rate}%: ${cs}${taxAmt}</div>`;
      }

      return `
        <div class="item-row">
          <span class="col-name uppercase">${item.item_name}</span>
          <span class="col-qty">${item.quantity}</span>
          <span class="col-price">${(item.item_total || 0).toFixed(2)}</span>
        </div>
        ${details}${taxInfo}`;
    }).join('');

    // Totals Area — with CGST/SGST breakdown
    let totalsHtml = `<div class="total-container">`;
    totalsHtml += `<div class="total-row"><span>SUB TOTAL:</span><span class="bold">${cs}${(order.subtotal || 0).toFixed(2)}</span></div>`;
    
    if (order.tax_amount > 0) {
      const halfTax = (order.tax_amount / 2);
      totalsHtml += `<div class="total-row"><span>CGST:</span><span class="bold">${cs}${halfTax.toFixed(2)}</span></div>`;
      totalsHtml += `<div class="total-row"><span>SGST:</span><span class="bold">${cs}${halfTax.toFixed(2)}</span></div>`;
      totalsHtml += `<div class="total-row" style="border-top: 1px dotted #000; padding-top: 3px;"><span>GST TOTAL:</span><span class="bold">${cs}${order.tax_amount.toFixed(2)}</span></div>`;
    }
    if (order.delivery_charge > 0) {
      totalsHtml += `<div class="total-row"><span>DELIVERY:</span><span>${cs}${order.delivery_charge.toFixed(2)}</span></div>`;
    }
    if (order.container_charge > 0) {
      totalsHtml += `<div class="total-row"><span>CONTAINER:</span><span>${cs}${order.container_charge.toFixed(2)}</span></div>`;
    }
    if (order.discount_amount > 0) {
      totalsHtml += `<div class="total-row uppercase bold"><span>Discount:</span><span>-${cs}${order.discount_amount.toFixed(2)}</span></div>`;
    }
    totalsHtml += `</div>`;

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
          <div style="font-size: 14px; font-weight: 900; margin-bottom: 8px;">SCAN & PAY VIA UPI</div>
          <div style="border: 2px solid #000; padding: 10px; display: inline-block;">
            <div style="font-size: 13px;">UPI: ${order.qrUpiId}</div>
            <div style="font-size: 14px; font-weight: 900; margin-top: 5px;">AMOUNT: ${cs}${(order.total_amount || 0).toFixed(2)}</div>
          </div>
        </div>`;
    }

    // Footer — no branding, no timestamp
    const footer = order.receiptFooter || 'Thank you for dining with us!';

    // Final Template — kitchen copy is identical to main bill (duplicate)
    return `
      ${reprintBadge}
      ${logoHtml}
      
      <div class="restaurant-name text-center uppercase">${restaurantName}</div>
      ${address}${phone}${gstHtml}${fssai}
      
      ${taxInvoice}
      
      ${orderDetails}
      
      ${itemsHtml}
      
      <div class="line-thick" style="margin-top: 15px;"></div>
      ${totalsHtml}
      
      <div class="grand-total">
        <span>NET AMOUNT:</span>
        <span>${cs}${(order.total_amount || 0).toFixed(2)}</span>
      </div>
      
      ${paymentHtml}
      ${qrHtml}
      
      <div class="line-dashed" style="margin-top: 15px;"></div>
      <div class="text-center" style="font-size: 13px; font-weight: 900; margin-top: 5px;">${footer}</div>
    `;
  }

  // ─── KOT HTML ──────────────────────────────────────────────
  generateKOTHtml(order, items, kotNumber = null, stationName = null, isReprint = false) {
    const reprintBadge = isReprint
      ? '<div class="reprint-badge">*** REPRINT KOT ***</div>' : '';

    // Use token number (table_number) instead of order number for KOT display
    const tokenNumber = order.table_number || order.order_number || 'N/A';

    const itemsHtml = (items || []).map(item => {
      // Build variant string to show to the LEFT of item name
      let variantLabel = '';
      if (item.variant) {
        try {
          const v = typeof item.variant === 'string' ? JSON.parse(item.variant) : item.variant;
          if (v && v.name) variantLabel = `[${v.name}] `;
        } catch (_) {}
      }

      // Build addons to show BELOW the item
      let addonsHtml = '';
      if (item.addons) {
        try {
          const a = typeof item.addons === 'string' ? JSON.parse(item.addons) : item.addons;
          if (Array.isArray(a) && a.length > 0) {
            addonsHtml = a.map(addon =>
              `<div style="font-size: 16px; padding-left: 55px; font-weight: 700; margin-top: 2px;">+ ${addon.name}</div>`
            ).join('');
          }
        } catch (_) {}
      }

      let notesHtml = '';
      if (item.special_instructions) {
        notesHtml = `<div style="font-size: 14px; padding-left: 55px; font-weight: 700; font-style: italic; margin-top: 2px;">📝 ${item.special_instructions}</div>`;
      }

      return `
        <div class="kot-item" style="margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px dotted #000;">
          <div style="display: flex; align-items: flex-start; gap: 10px;">
            <span style="flex: 0 0 45px; font-size: 26px; font-weight: 900;">${item.quantity}x</span>
            <span style="flex: 1; font-size: 24px; font-weight: 900;">${variantLabel}${item.item_name}</span>
          </div>
          ${addonsHtml}
          ${notesHtml}
        </div>`;
    }).join('');

    const urgency = order.urgency || 'normal';
    const urgencyBadge = (urgency === 'urgent' || urgency === 'critical')
      ? `<div style="text-align: center; background: #000; color: #fff; font-weight: 900; padding: 6px; font-size: 16px; letter-spacing: 3px; margin-bottom: 6px;">⚡ ${urgency.toUpperCase()} ⚡</div>`
      : '';

    return `
      ${urgencyBadge}
      ${reprintBadge}
      
      <div style="text-align: center; font-size: 20px; font-weight: 900; letter-spacing: 3px;">K.O.T</div>
      <div class="kot-num">TOKEN: ${tokenNumber}</div>
      
      <div class="info-row bold"><span class="uppercase">${stationName || 'KITCHEN'}</span><span>${new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span></div>
      <div class="text-center" style="font-size: 16px; font-weight: 900; margin: 4px 0;">${(order.order_type || 'dine_in').replace('_', ' ').toUpperCase()}</div>
      
      <div class="line-thick"></div>
      
      ${itemsHtml}
      
      ${order.chef_instructions ? `
        <div style="margin-top: 10px; padding: 8px; border: 2px solid #000; font-weight: 900; font-size: 16px;">
          INSTRUCTIONS: ${order.chef_instructions}
        </div>
      ` : ''}
      
      <div class="line-thick" style="margin-top: 10px;"></div>
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
