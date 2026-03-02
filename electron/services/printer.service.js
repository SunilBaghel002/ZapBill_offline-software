const log = require('electron-log');
const { BrowserWindow } = require('electron');

/**
 * PrinterService — Comprehensive printing for receipts, KOTs, void KOTs, reprints.
 * Supports station-wise KOT routing, customizable bill format, print pool, and 58/80mm paper.
 * Handles same-printer bill/KOT separation with sequential queuing.
 * 
 * Bill design matches the OrdersPage BillViewModal format exactly.
 * Kitchen gets one copy of the same bill (not a separate KOT format).
 */
class PrinterService {
  constructor() {
    this.printPool = []; // Reusable hidden windows for faster printing
    this.maxPoolSize = 3;
    this.activePrints = new Set();
    this.SAME_PRINTER_DELAY = 1500; // ms delay between prints on same printer
  }

  // ─── Print Pool (High-Speed) ─────────────────────────────
  _getOrCreatePrintWindow() {
    if (this.printPool.length > 0) {
      const win = this.printPool.pop();
      if (!win.isDestroyed()) return win;
    }
    const win = new BrowserWindow({
      show: false,
      width: 350,
      height: 800,
      webPreferences: { nodeIntegration: false, contextIsolation: true }
    });
    return win;
  }

  _returnToPool(win) {
    if (!win || win.isDestroyed()) return;
    if (this.printPool.length < this.maxPoolSize) {
      this.printPool.push(win);
    } else {
      win.close();
    }
  }

  // ─── Core Print Method ────────────────────────────────────
  async printHtml(htmlContent, printerName, paperWidth = '80') {
    return new Promise((resolve) => {
      const printWindow = this._getOrCreatePrintWindow();
      this.activePrints.add(printWindow);

      const contentWidth = paperWidth === '58' ? 190 : 272;
      const pageSize = paperWidth === '58' ? '58mm' : '72mm';

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
    </style>
  </head>
  <body>${htmlContent}</body>
</html>`;

      printWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));

      printWindow.webContents.on('did-finish-load', () => {
        const options = {
          silent: true,
          printBackground: true,
          color: false,
          margin: { marginType: 'custom', top: 0, bottom: 0, left: 0, right: 0 },
          scaleFactor: 100
        };
        if (printerName) options.deviceName = printerName;

        printWindow.webContents.print(options, (success, errorType) => {
          if (!success) {
            log.error('Print failed:', errorType);
            resolve({ success: false, error: errorType });
          } else {
            resolve({ success: true });
          }
          
          setTimeout(() => {
            this.activePrints.delete(printWindow);
            this._returnToPool(printWindow);
          }, 1500);
        });
      });
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

  // ─── Print Receipt ────────────────────────────────────────
  async printReceipt(order, printerName = null) {
    try {
      const html = this.generateReceiptHtml(order);
      return await this.printHtml(html, printerName, order.paperWidth || '80');
    } catch (error) {
      log.error('Print receipt error:', error);
      return { success: false, error: error.message };
    }
  }

  // ─── Print Kitchen Bill Copy (same design as customer bill, marked as Kitchen Copy) ──
  async printKitchenBillCopy(order, printerName = null) {
    try {
      const html = this.generateReceiptHtml(order, true); // isKitchenCopy = true
      return await this.printHtml(html, printerName, order.paperWidth || '80');
    } catch (error) {
      log.error('Print kitchen bill copy error:', error);
      return { success: false, error: error.message };
    }
  }

  // ─── Print KOT (kept for backward compatibility / void KOTs) ──
  async printKOT(order, items, printerName = null, kotNumber = null, stationName = null, isReprint = false) {
    try {
      const html = this.generateKOTHtml(order, items, kotNumber, stationName, isReprint);
      return await this.printHtml(html, printerName, '80');
    } catch (error) {
      log.error('Print KOT error:', error);
      return { success: false, error: error.message };
    }
  }

  // ─── Print Void KOT ───────────────────────────────────────
  async printVoidKOT(order, items, reason, printerName = null, kotNumber = null) {
    try {
      const html = this.generateVoidKOTHtml(order, items, reason, kotNumber);
      return await this.printHtml(html, printerName, '80');
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
          <div class="divider-solid"></div>
          <p style="font-size: 11px; color: #000; margin-top: 8px;">ZapBill POS System</p>
        </div>
      `;
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
   * 
   * @param {Object} order - Enriched order object
   * @param {boolean} isKitchenCopy - If true, adds "KITCHEN COPY" badge at top
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

    // Restaurant header — matches BillViewModal style
    const restaurantName = order.restaurantName || 'Restaurant POS';
    const address = order.restaurantAddress ? `<div class="subheader">${order.restaurantAddress}</div>` : '';
    const phone = order.restaurantPhone ? `<div class="subheader">Tel: ${order.restaurantPhone}</div>` : '';
    const gst = order.gstNumber ? `<div class="subheader" style="font-weight:700;">GSTIN: ${order.gstNumber}</div>` : '';
    const fssai = order.fssaiNumber ? `<div class="subheader">FSSAI: ${order.fssaiNumber}</div>` : '';

    // Format date like BillViewModal
    const formatDate = (dateStr) => {
      try {
        return new Date(dateStr).toLocaleString('en-IN', {
          day: '2-digit', month: 'short', year: 'numeric',
          hour: '2-digit', minute: '2-digit'
        });
      } catch (e) { return ''; }
    };

    // Order details — key:value pairs like BillViewModal
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

    // Items — matches BillViewModal format: "Item Name × Qty  ₹Amount"
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

    // Totals — matches BillViewModal format
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

  // ─── KOT HTML (kept for void KOTs and backward compat) ────
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

  // ─── Print KOT with attached mini-bill (backward compat) ──
  async printKOTWithBill(order, kotItems, allItems, printerName, stationName = null) {
    try {
      const kotHtml = this.generateKOTHtml(order, kotItems, null, stationName);
      return await this.printHtml(kotHtml, printerName, '80');
    } catch (error) {
      log.error('Print KOT with bill error:', error);
      return { success: false, error: error.message };
    }
  }

  // ─── Station-Wise KOT Routing (backward compat) ──────────
  async printStationKOTs(order, items, stationMap, defaultPrinterName, attachBill = false, billPrinterName = null) {
    // Group items by station
    const stationGroups = {};
    const unmappedItems = [];

    for (const item of items) {
      const mapping = stationMap.find(m => m.category_id === item.category_id);
      if (mapping) {
        const key = mapping.station_id;
        if (!stationGroups[key]) {
          stationGroups[key] = {
            stationId: mapping.station_id,
            stationName: mapping.station_name,
            printerName: mapping.printer_name,
            items: []
          };
        }
        stationGroups[key].items.push(item);
      } else {
        unmappedItems.push(item);
      }
    }

    // Collect unique printer names we need to send the kitchen bill copy to
    const kitchenPrinters = new Set();
    for (const [, group] of Object.entries(stationGroups)) {
      kitchenPrinters.add(group.printerName);
    }
    if (unmappedItems.length > 0 && defaultPrinterName) {
      kitchenPrinters.add(defaultPrinterName);
    }

    // Send ONE bill copy to each unique kitchen printer
    const printJobs = [];
    for (const printerName of kitchenPrinters) {
      // If this printer is the same as bill printer, it will be handled sequentially by smartPrint
      if (billPrinterName && printerName === billPrinterName) {
        // Sequential — print after delay (handled by smartPrint caller)
        printJobs.push(
          this.printKitchenBillCopy(order, printerName)
            .catch(err => ({ success: false, error: err.message, printer: printerName }))
        );
      } else {
        // Different printer — fire immediately
        printJobs.push(
          this.printKitchenBillCopy(order, printerName)
            .catch(err => ({ success: false, error: err.message, printer: printerName }))
        );
      }
    }

    const results = await Promise.allSettled(printJobs);
    const failures = results.filter(r => r.status === 'rejected' || (r.value && !r.value.success));
    if (failures.length > 0) {
      log.warn('Some kitchen bill copies failed:', failures);
    }

    return {
      success: true,
      printerCount: kitchenPrinters.size
    };
  }

  /**
   * Smart print: Customer bill + one kitchen bill copy.
   * When same printer: bill first → delay → kitchen copy.
   * When different printers: both fire in parallel.
   *
   * @param {Object} order - Enriched order object
   * @param {Array} items - Order items (used only for excluded items filtering on the kitchen copy order)
   * @param {Array} stationMap - Category-station mappings (used to find kitchen printers)
   * @param {string} defaultKotPrinter - Fallback kitchen printer
   * @param {boolean} attachBill - (unused, kept for API compatibility)
   * @param {string} billPrinterName - Bill printer name
   * @param {boolean} printBill - Whether to print the customer bill
   * @param {Array} excludedItemIds - Item IDs excluded from kitchen copy
   * @returns {Promise}
   */
  async smartPrint(order, items, stationMap, defaultKotPrinter, attachBill, billPrinterName, printBill = false, excludedItemIds = []) {
    // 1. Build a kitchen-specific order with excluded items filtered out
    const kitchenItems = items.filter(item => {
      const itemId = item.menu_item_id || item.id;
      return !excludedItemIds.includes(itemId);
    });
    const kitchenOrder = { ...order, items: kitchenItems };

    // 2. Determine kitchen printer(s) from station map
    const kitchenPrinters = new Set();
    for (const item of kitchenItems) {
      const mapping = stationMap.find(m => m.category_id === item.category_id);
      if (mapping) {
        kitchenPrinters.add(mapping.printer_name);
      } else if (defaultKotPrinter) {
        kitchenPrinters.add(defaultKotPrinter);
      }
    }

    // If no kitchen printers identified but we have a default, use it
    if (kitchenPrinters.size === 0 && defaultKotPrinter && kitchenItems.length > 0) {
      kitchenPrinters.add(defaultKotPrinter);
    }

    // 3. Check if any kitchen printer is the same as the bill printer
    const hasSamePrinterConflict = billPrinterName && kitchenPrinters.has(billPrinterName);

    if (printBill && billPrinterName && hasSamePrinterConflict) {
      // SEQUENTIAL: Bill first → wait → kitchen copy on same printer
      log.info('Same printer detected for bill and kitchen — printing sequentially');

      // Print customer bill first
      const billResult = await this.printReceipt(order, billPrinterName)
        .catch(err => ({ success: false, error: err.message, type: 'receipt' }));

      // Wait for bill to complete and eject paper
      await this._delay(this.SAME_PRINTER_DELAY);

      // Print kitchen copy on same printer
      const samePrinterKitchenResult = await this.printKitchenBillCopy(kitchenOrder, billPrinterName)
        .catch(err => ({ success: false, error: err.message, type: 'kitchen' }));

      // Print kitchen copies on other printers (parallel)
      const otherPrinterJobs = [];
      for (const printerName of kitchenPrinters) {
        if (printerName !== billPrinterName) {
          otherPrinterJobs.push(
            this.printKitchenBillCopy(kitchenOrder, printerName)
              .catch(err => ({ success: false, error: err.message, type: 'kitchen' }))
          );
        }
      }
      if (otherPrinterJobs.length > 0) {
        await Promise.allSettled(otherPrinterJobs);
      }

      return { success: true, billResult, kitchenResult: samePrinterKitchenResult, sequential: true };

    } else {
      // PARALLEL: Different printers — fire all at once
      log.info('Different printers for bill and kitchen — printing in parallel');

      const printJobs = [];

      // Kitchen copies
      for (const printerName of kitchenPrinters) {
        printJobs.push(
          this.printKitchenBillCopy(kitchenOrder, printerName)
            .catch(err => ({ success: false, error: err.message, type: 'kitchen' }))
        );
      }

      // Customer bill
      if (printBill && billPrinterName) {
        printJobs.push(
          this.printReceipt(order, billPrinterName)
            .catch(err => ({ success: false, error: err.message, type: 'receipt' }))
        );
      }

      const results = await Promise.allSettled(printJobs);
      return {
        success: true,
        kitchenResult: results[0]?.value,
        billResult: printBill ? results[results.length - 1]?.value : null,
        sequential: false
      };
    }
  }

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
      return await this.printHtml(html, printerName, '80');
    } catch (error) {
      log.error('Print summary report error:', error);
      return { success: false, error: error.message };
    }
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
  }
}

module.exports = PrinterService;
