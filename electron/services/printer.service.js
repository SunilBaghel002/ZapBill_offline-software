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
          margin: 0; padding: 5px; 
          font-family: Arial, Helvetica, sans-serif;
          font-size: 13px; 
          color: #000; 
          background: #fff;
          width: ${contentWidth}px; 
          line-height: 1.25;
          font-weight: 400;
        }
        h1, h2, h3, h4, h5, h6, p { margin: 0; padding: 0; }
        
        /* Layout Utilities */
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .text-left { text-align: left; }
        .bold { font-weight: 900; }
        .uppercase { text-transform: uppercase; }
        .small-font { font-size: 10px; font-weight: 400; }
        .x-small-font { font-size: 9px; font-weight: 400; }
        
        /* Professional Separators */
        .line-dashed { border-top: 1px dashed #000; margin: 4px 0; width: 100%; }
        .line-thick { border-top: 2px solid #000; margin: 6px 0; width: 100%; }
        .line-solid { border-top: 1px solid #000; margin: 4px 0; width: 100%; }
        
        /* Bill Header */
        .restaurant-name { font-weight: 400; font-size: 17px; text-align: center; margin-bottom: 2px; }
        .info-label { font-size: 11px; text-align: center; margin-bottom: 1px; }
        
        /* Info Grid */
        .info-section { margin: 6px 0; }
        .info-row { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 1px; }
        .info-val { font-weight: 400; }
        
        /* Table Layout */
        .receipt-table { width: 100%; border-collapse: collapse; margin: 4px 0; }
        .receipt-table th { border-bottom: 1px solid #000; padding: 3px 0; font-size: 12px; text-align: left; font-weight: 400; }
        .receipt-table td { padding: 3px 0; font-size: 12px; vertical-align: top; }
        
        .col-item { text-align: left; width: 50%; }
        .col-qty { text-align: center; width: 12%; }
        .col-price { text-align: right; width: 18%; }
        .col-amount { text-align: right; width: 20%; }
        
        /* Sub-items */
        .sub-item { font-size: 10px; font-weight: 400; padding-left: 8px; margin-top: 1px; }
        
        /* Totals Area */
        .total-container { margin-top: 6px; }
        .total-row { display: flex; justify-content: space-between; margin-bottom: 2px; font-size: 13px; }
        .grand-total { 
          display: flex; justify-content: space-between; 
          font-weight: 900; font-size: 18px; 
          margin: 6px 0; padding: 6px 0;
          border-top: 1px solid #000; border-bottom: 1px solid #000;
        }
        
        /* KOT Styles */
        .kot-header { font-size: 18px; font-weight: 400; text-align: center; margin-bottom: 4px; }
        .kot-num { font-size: 20px; font-weight: 900; text-align: left; margin: 4px 0; }
        .kot-table { width: 100%; border-collapse: collapse; margin: 6px 0; }
        .kot-table th { border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 4px 0; text-align: left; font-size: 14px; font-weight: 400; }
        .kot-table td { padding: 6px 0; border-bottom: 1px dotted #000; font-size: 18px; font-weight: 400; vertical-align: top; }
        .kot-qty { width: 50px; text-align: center; border-left: 1px dashed #000; }
        .kot-special { font-size: 12px; font-weight: 400; color: #000; }

        /* Targeted Font Scaling */
        /* Bill: Increase overall font */
        .bill-content { font-size: 15px !important; }
        .bill-content .restaurant-name { font-size: 19px !important; }
        .bill-content .info-label { font-size: 12px !important; }
        .bill-content .info-row { font-size: 14px !important; }
        .bill-content .receipt-table th { font-size: 14px !important; }
        .bill-content .receipt-table td { font-size: 14px !important; }
        .bill-content .total-row { font-size: 15px !important; }
        .bill-content .grand-total { font-size: 21px !important; }
        .bill-content .sub-item { font-size: 11px !important; }

        /* KOT: Decrease overall font */
        .kot-content { font-size: 12px !important; }
        .kot-content .kot-header { font-size: 16px !important; }
        .kot-content .kot-num { font-size: 18px !important; }
        .kot-content .kot-table th { font-size: 12px !important; }
        .kot-content .kot-table td { font-size: 16px !important; }
        .kot-content .kot-special { font-size: 11px !important; }
        .end-row{
          display: flex !important;
          justify-content: flex-end !important;
          align-items: center !important;
        }
      </style>
    </head>
    <body>${htmlContent}</body>
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

  // ─── Print QR Code ──────────────────────────────────────────
  async printQRCode(qrData, tableName, copies = 1, printerName = null) {
    try {
      if (!printerName) return { success: false, error: 'No printer configured' };
      const html = this.generateQRCodeHtml(qrData, tableName);
      const queue = this._getQueue(printerName);
      if (!queue) return { success: false, error: 'Could not create printer queue' };

      const results = [];
      for (let i = 0; i < copies; i++) {
        const result = await queue.enqueue(
          { type: 'QR_CODE', htmlContent: html, paperWidth: '80', orderNumber: 'QR' },
          this.printHtml.bind(this)
        );
        results.push(result);
      }
      return results[0]; // Return the first result as a representative
    } catch (error) {
      log.error('Print QR Code error:', error);
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
          <p style="font-size: 11px; color: #000; margin-top: 8px;">FlashBill POS System</p>
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
      ? '<div style="background:#000;color:#fff;text-align:center;font-weight:bold;margin-bottom:5px;">*** REPRINT ***</div>' : '';

    // Restaurant header
    const restaurantName = order.restaurantName || 'Restaurant POS';
    const address = order.restaurantAddress ? `<div class="info-label">${order.restaurantAddress}</div>` : '';
    const phone = order.restaurantPhone ? `<div class="info-label">Mob: ${order.restaurantPhone}</div>` : '';
    const gstValue = order.gstNumber;
    const gstHtml = gstValue ? `<div class="info-label">GST: ${gstValue}</div>` : '';

    // Format date and time separately
    const d = new Date(order.created_at || new Date().toISOString());
    const dateStr = d.toLocaleDateString('en-GB');
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const orderType = (order.order_type === 'pickup' ? 'PickUp' : (order.order_type || 'dine_in').replace('_', ' ')).replace(/\b\w/g, l => l.toUpperCase());

    // Customer info
    let customerInfo = '';
    if (order.showCustomerDetails !== false) {
      if (order.customer_name) {
        customerInfo += `<div style="font-size:14px; font-weight:500;">Name: ${order.customer_name}</div>`;
      }
      if (order.customer_phone) {
        customerInfo += `<div style="font-size:14px;">Mob: ${order.customer_phone}</div>`;
      }
      if (order.customer_address) {
        customerInfo += `<div style="font-size:12px;">Adr: ${order.customer_address}</div>`;
      }
    }

    // Items Table
    let itemsHtml = `
      <table class="receipt-table">
        <thead>
          <tr>
            <th class="col-item">Item</th>
            <th class="col-qty">Qty.</th>
            <th class="col-price">Price</th>
            <th class="col-amount">Amount</th>
          </tr>
        </thead>
        <tbody>
    `;

    let totalQty = 0;
    itemsHtml += items.map(item => {
      totalQty += Number(item.quantity || 0);
      const unitPrice = item.unit_price || (item.item_total / item.quantity) || 0;
      
      let details = '';
      if (item.variant) {
        try {
          const v = typeof item.variant === 'string' ? JSON.parse(item.variant) : item.variant;
          if (v && v.name) details += `<div class="sub-item">(${v.name})</div>`;
        } catch (_) {}
      }
      if (item.addons) {
        try {
          const a = typeof item.addons === 'string' ? JSON.parse(item.addons) : item.addons;
          if (Array.isArray(a)) {
            a.forEach(addon => {
              details += `<div class="sub-item">+ ${addon.name}</div>`;
            });
          }
        } catch (_) {}
      }

      return `
        <tr>
          <td class="col-item">
            ${item.item_name}
            ${details}
          </td>
          <td class="col-qty">${item.quantity}</td>
          <td class="col-price">${unitPrice.toFixed(2)}</td>
          <td class="col-amount">${(item.item_total || 0).toFixed(2)}</td>
        </tr>`;
    }).join('');

    itemsHtml += `</tbody></table>`;

    // Totals Area
    let totalsHtml = `<div class="total-container">`;
    totalsHtml += `<div class="info-row"><span>Total Qty: ${totalQty}</span><span>Sub Total: ${(order.subtotal || 0).toFixed(2)}</span></div>`;
    
    if (order.tax_amount > 0) {
      const halfTax = (order.tax_amount / 2);
      totalsHtml += `<div class="info-row end-row"><span>CGST 2.5%: </span><span> ${halfTax.toFixed(2)}</span></div>`;
      totalsHtml += `<div class="info-row end-row"><span>SGST 2.5%: </span><span> ${halfTax.toFixed(2)}</span></div>`;
    }
    if (order.discount_amount > 0) {
      totalsHtml += `<div class="info-row end-row"><span>Discount: </span><span>-${order.discount_amount.toFixed(2)}</span></div>`;
    }
    
    if (order.round_off && Math.abs(order.round_off) > 0) {
      totalsHtml += `<div class="info-row end-row" style="font-size: 8px; color: #333;"><span>Round off: </span><span>${order.round_off > 0 ? '+' : ''}${order.round_off.toFixed(2)}</span></div>`;
    }
    totalsHtml += `</div>`;

    // Final Template
    return `
      <div class="bill-content">
        ${reprintBadge}
      <div class="restaurant-name uppercase">${restaurantName}</div>
      ${address}${phone}${gstHtml}
      
      <div class="line-solid"></div>
      ${customerInfo}
      <div class="line-solid"></div>
      
      <div class="info-row">
        <span>Date: ${dateStr}</span>
        <span class="bold" style="font-size: 17px; border: 1px solid #000; padding: 0 4px; font-weight: 900;">${orderType}</span>
      </div>
      <div class="info-row">
        <span>${timeStr}</span>
      </div>
      
      <div class="info-row">
        <span class="bold" style="font-size:16px;">Bill No.: ${order.order_number || ''}</span>
      </div>
      ${order.table_number ? `
        <div class="info-row">
          <span class="bold" style="font-size:16px;">Token No.: ${order.table_number}</span>
        </div>
      ` : ''}
      
      <div class="line-solid"></div>
      ${itemsHtml}
      <div class="line-solid"></div>
      
      ${totalsHtml}
      
      <div class="grand-total">
        <span>Grand Total</span>
        <span>${cs}${(order.total_amount || 0).toFixed(0)}.00</span>
      </div>
      
      <div class="text-center" style="font-size: 13px; font-weight: 400; margin-top: 5px;">Thanks</div>
      </div>
    `;
  }

  // ─── KOT HTML ──────────────────────────────────────────────
  generateKOTHtml(order, items, kotNumber = null, stationName = null, isReprint = false) {
    const reprintBadge = isReprint
      ? '<div style="background:#000;color:#fff;text-align:center;font-weight:bold;margin-bottom:5px;">*** REPRINT KOT ***</div>' : '';

    const d = new Date();
    const dateStr = d.toLocaleDateString('en-GB');
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const itemsHtml = (items || []).map(item => {
      let itemDisplay = item.item_name;
      if (item.variant) {
        try {
          const v = typeof item.variant === 'string' ? JSON.parse(item.variant) : item.variant;
          if (v && v.name) itemDisplay += ` (${v.name})`;
        } catch (_) {}
      }

      let addonsList = [];
      if (item.addons) {
        try {
          const a = typeof item.addons === 'string' ? JSON.parse(item.addons) : item.addons;
          if (Array.isArray(a)) {
            a.forEach(addon => addonsList.push(addon.name));
          }
        } catch (_) {}
      }
      
      const specialNote = [
        ...addonsList,
        item.special_instructions
      ].filter(Boolean).join(', ');

      return `
        <tr>
          <td>
            ${itemDisplay}
          </td>
          <td class="kot-special">
            ${specialNote || ''}
          </td>
          <td class="kot-qty">
            ${item.quantity}
          </td>
        </tr>`;
    }).join('');

    const isToken = !!order.table_number;
    const tokenDisplay = order.table_number || order.order_number || 'N/A';
    const labelDisplay = isToken ? 'Token No:' : 'Bill No:';
    const orderType = (order.order_type === 'pickup' ? 'PickUp' : (order.order_type || 'dine_in').replace('_', ' ')).replace(/\b\w/g, l => l.toUpperCase());

    return `
      <div class="kot-content">
        ${reprintBadge}
      <div class="kot-header">${stationName || 'Kitchen 1'}</div>
      <div class="info-row text-center">
        <span>${dateStr} ${timeStr}</span>
      </div>
      
      <div class="kot-num text-center">Bill No: ${order.order_number || ''}</div>
      ${order.table_number ? `<div class="kot-num text-center">Token No: ${order.table_number}</div>` : ''}
      <div class="bold text-center" style="font-size:18px;">${orderType}</div>
      
      <table class="kot-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Special Note</th>
            <th>Qty.</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
      
      ${order.chef_instructions ? `
        <div style="margin-top: 5px; padding: 4px; border: 1px solid #000; font-weight: 400; font-size: 13px;">
          Note: ${order.chef_instructions}
        </div>
      ` : ''}
      </div>
    `;
  }

  // ─── Void KOT HTML ────────────────────────────────────────
  generateVoidKOTHtml(order, items, reason, kotNumber = null) {
    const itemsHtml = (items || []).map(item => `
      <div style="font-size: 15px; font-weight: 400; margin-bottom: 6px; text-decoration: line-through;">
        ${item.quantity || 1} × ${item.item_name || item.name || 'Item'}
      </div>
    `).join('');

    return `
      <div class="void-badge">❌ VOID KOT ❌</div>
      
      ${kotNumber ? `<div style="font-size: 16px; font-weight: 400; text-align: center;">KOT #${kotNumber}</div>` : ''}
      
      <div class="divider-solid"></div>
      
      <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 400;">
        <span>Order #: ${order.order_number || 'N/A'}</span>
        <span>${new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
      </div>
      ${order.table_number ? `<div style="font-size: 18px; font-weight: 900; text-align: center; margin: 6px 0;">TABLE ${order.table_number}</div>` : ''}
      
      <div class="divider-solid"></div>
      
      <div style="font-weight: 400; margin-bottom: 8px; font-size: 14px;">CANCELLED ITEMS:</div>
      ${itemsHtml}
      
      ${reason ? `
        <div class="divider"></div>
        <div style="font-weight: 400; font-size: 13px;">Reason: ${reason}</div>
      ` : ''}
      
      <div class="divider" style="margin-top: 12px;"></div>
      <div class="text-center" style="font-size: 11px; font-weight: 400;">--- Void Copy ---</div>
    `;
  }

  // ─── QR Code HTML ──────────────────────────────────────────
  generateQRCodeHtml(qrData, tableName) {
    return `
      <div style="text-align: center; padding: 15px 0;">
        <div style="font-size: 20px; font-weight: 800; margin-bottom: 15px; text-transform: uppercase;">SCAN FOR MENU</div>
        
        ${tableName ? `
          <div style="font-size: 24px; font-weight: 900; margin-bottom: 10px; padding: 5px; border: 2px solid #000;">
            TABLE: ${tableName}
          </div>
        ` : ''}
        
        <div style="margin: 20px auto; width: 140px; height: 140px; padding: 10px; background: #fff; border: 1px solid #000;">
          <img src="${qrData}" style="width: 100%; height: 100%;" />
        </div>
        
        <div style="font-size: 14px; font-weight: 600; margin-top: 15px;">FlashBill Digital POS</div>
        <div style="font-size: 11px; margin-top: 5px;">Scan to view menu & order</div>
        
        <div class="line-dashed" style="margin-top: 20px;"></div>
      </div>
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
      <div class="row"><span class="label">Pick Up:</span><span class="bold">₹${(sales.pickup_amount || 0).toFixed(2)}</span></div>
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
