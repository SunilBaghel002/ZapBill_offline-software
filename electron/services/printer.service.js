const log = require('electron-log');
const { BrowserWindow } = require('electron');

/**
 * PrinterService — Comprehensive printing for receipts, KOTs, void KOTs, reprints.
 * Supports station-wise KOT routing, customizable bill format, print pool, and 58/80mm paper.
 */
class PrinterService {
  constructor() {
    this.printPool = []; // Reusable hidden windows for faster printing
    this.maxPoolSize = 3;
    this.activePrints = new Set();
  }

  // ─── Print Pool (High-Speed) ─────────────────────────────
  _getOrCreatePrintWindow() {
    // Reuse from pool if available
    if (this.printPool.length > 0) {
      const win = this.printPool.pop();
      if (!win.isDestroyed()) return win;
    }
    // Create new
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

      const contentWidth = paperWidth === '58' ? 190 : 270;
      const pageSize = paperWidth === '58' ? '58mm' : '72mm';

      const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <style>
      @page { margin: 0; size: ${pageSize} auto; }
      body { 
        margin: 0; padding: 5px; 
        font-family: 'Consolas', 'Courier New', monospace;
        font-size: 12px; color: #000; background: #fff;
        width: ${contentWidth}px; line-height: 1.3;
      }
      *, *::before, *::after { box-sizing: border-box; }
      h1,h2,h3,h4,h5,h6,p { margin: 0; padding: 0; }
      table { width: 100%; border-collapse: collapse; }
      th, td { text-align: left; padding: 1px 0; vertical-align: top; }
      .text-right { text-align: right; }
      .text-center { text-align: center; }
      .bold { font-weight: bold; }
      .divider { border-top: 1px dashed #000; margin: 5px 0; }
      .double-divider { border-top: 2px solid #000; margin: 5px 0; }
      .header { font-size: 16px; font-weight: bold; text-align: center; text-transform: uppercase; }
      .subheader { font-size: 11px; text-align: center; }
      .total-row { display: flex; justify-content: space-between; font-weight: bold; font-size: 14px; }
      .reprint-badge { text-align: center; background: #000; color: #fff; font-weight: bold; padding: 3px; font-size: 13px; letter-spacing: 2px; margin-bottom: 4px; }
      .void-badge { text-align: center; border: 3px solid #000; font-weight: bold; padding: 6px; font-size: 18px; letter-spacing: 3px; margin-bottom: 6px; }
      .logo { text-align: center; margin-bottom: 4px; }
      .logo img { max-width: ${contentWidth - 40}px; max-height: 80px; object-fit: contain; }
      .qr-section { text-align: center; margin-top: 6px; }
      .qr-section img { width: 120px; height: 120px; }
      .item-row { margin-bottom: 3px; }
      .item-detail { font-size: 10px; padding-left: 10px; color: #333; }
      .tax-detail { font-size: 10px; color: #555; }
      .kot-header { font-size: 18px; font-weight: bold; text-align: center; letter-spacing: 1px; }
      .station-name { text-align: center; background: #000; color: #fff; font-weight: bold; padding: 4px; font-size: 14px; margin-bottom: 4px; }
      .kot-item { font-size: 14px; font-weight: bold; margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1px dotted #aaa; }
      .kot-note { font-size: 12px; background: #eee; font-weight: bold; padding: 3px 6px; margin-top: 2px; }
    </style>
  </head>
  <body>${htmlContent}</body>
</html>`;

      printWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));

      printWindow.webContents.on('did-finish-load', () => {
        const options = {
          silent: true,
          printBackground: false,
          color: false,
          margin: { marginType: 'custom', top: 0, bottom: 0, left: 0, right: 0 }
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

  // ─── Print KOT ────────────────────────────────────────────
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
          <div style="font-size: 20px; font-weight: bold; margin-bottom: 8px;">✓ TEST PRINT</div>
          <div class="divider"></div>
          <p style="font-size: 13px; margin: 8px 0;">Printer is working correctly!</p>
          <p style="font-size: 11px; color: #666;">${new Date().toLocaleString()}</p>
          <div class="divider"></div>
          <p style="font-size: 10px; color: #888; margin-top: 6px;">ZapBill POS System</p>
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
  // ═══════════════════════════════════════════════════════════

  // ─── Receipt HTML ─────────────────────────────────────────
  generateReceiptHtml(order) {
    const items = order.items || [];
    const cs = order.currencySymbol || '₹';

    // REPRINT badge
    const reprintBadge = order.isReprint
      ? '<div class="reprint-badge">*** REPRINT ***</div>' : '';

    // Logo
    const logoHtml = order.showLogo && order.logoPath
      ? `<div class="logo"><img src="${order.logoPath}" alt="Logo"></div>` : '';

    // Restaurant header
    const restaurantName = order.restaurantName || 'RESTAURANT';
    const address = order.restaurantAddress ? `<div class="subheader">${order.restaurantAddress}</div>` : '';
    const phone = order.restaurantPhone ? `<div class="subheader">Tel: ${order.restaurantPhone}</div>` : '';
    const gst = order.gstNumber ? `<div class="subheader">GSTIN: ${order.gstNumber}</div>` : '';
    const fssai = order.fssaiNumber ? `<div class="subheader">FSSAI: ${order.fssaiNumber}</div>` : '';

    // Customer info
    let customerHtml = '';
    if (order.showCustomerDetails !== false) {
      const parts = [];
      if (order.customer_name) parts.push(`Cust: ${order.customer_name}`);
      if (order.customer_phone) parts.push(`Ph: ${order.customer_phone}`);
      if (parts.length > 0) {
        customerHtml = `<div style="font-size: 11px; margin-bottom: 2px;">${parts.join(' | ')}</div>`;
      }
    }

    // Items with optional item-wise tax
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

      let taxInfo = '';
      if (order.showItemwiseTax && item.tax_rate) {
        const taxAmt = ((item.item_total || 0) * (item.tax_rate / 100)).toFixed(2);
        taxInfo = `<div class="tax-detail">Tax ${item.tax_rate}%: ${cs}${taxAmt}</div>`;
      }

      return `
        <div class="item-row">
          <div style="display:flex; justify-content:space-between;">
            <span style="flex:1;">${item.item_name} <span style="font-size:10px;">x${item.quantity}</span></span>
            <span class="bold">${cs}${(item.item_total || 0).toFixed(2)}</span>
          </div>
          ${details}${taxInfo}
        </div>`;
    }).join('');

    // Totals
    const subtotalRow = `<div style="display:flex; justify-content:space-between; margin-bottom:2px;"><span>Subtotal</span><span>${cs}${(order.subtotal || 0).toFixed(2)}</span></div>`;
    
    const taxRow = (order.tax_amount > 0) ? `
      <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
        <span>Tax</span><span>${cs}${order.tax_amount.toFixed(2)}</span>
      </div>` : '';

    const deliveryRow = (order.delivery_charge > 0) ? `
      <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
        <span>Delivery Charge</span><span>${cs}${order.delivery_charge.toFixed(2)}</span>
      </div>` : '';

    const containerRow = (order.container_charge > 0) ? `
      <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
        <span>Container Charge</span><span>${cs}${order.container_charge.toFixed(2)}</span>
      </div>` : '';

    const discountRow = (order.discount_amount > 0) ? `
      <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
        <span>Discount</span><span>-${cs}${order.discount_amount.toFixed(2)}</span>
      </div>` : '';

    // Payment info
    const paymentMethod = order.payment_method ? order.payment_method.toUpperCase() : '';
    const paymentRow = paymentMethod ? `
      <div style="font-size:11px; text-align:center; margin-top:2px;">
        Paid via: <strong>${paymentMethod}</strong>
      </div>` : '';

    // QR Code (simple SVG-based UPI QR if enabled)
    let qrHtml = '';
    if (order.showQR && order.qrUpiId) {
      // Using a text-based UPI link display since we can't generate real QR in this context
      qrHtml = `
        <div class="qr-section">
          <div class="divider"></div>
          <div style="font-size:11px; font-weight:bold; margin-bottom:4px;">Scan to Pay via UPI</div>
          <div style="border:2px solid #000; padding:8px; display:inline-block; font-size:11px;">
            <div style="font-weight:bold;">UPI: ${order.qrUpiId}</div>
            <div style="font-size:10px; color:#555;">Amount: ${cs}${(order.total_amount || 0).toFixed(2)}</div>
          </div>
        </div>`;
    }

    return `
      ${reprintBadge}
      ${logoHtml}
      <div class="header">${restaurantName}</div>
      ${address}${phone}${gst}${fssai}
      
      <div class="divider"></div>
      
      <div style="display:flex; justify-content:space-between; font-size:11px;">
        <span>Bill #: <strong>${order.order_number || ''}</strong></span>
        <span>${new Date(order.created_at || Date.now()).toLocaleDateString()}</span>
      </div>
      <div style="display:flex; justify-content:space-between; font-size:11px;">
        <span>${new Date(order.created_at || Date.now()).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
        <span>${(order.order_type || '').replace('_', ' ').toUpperCase()}</span>
      </div>
      ${order.table_number ? `<div style="font-size:11px;">Table: <strong>${order.table_number}</strong></div>` : ''}
      ${customerHtml}
      
      <div class="double-divider"></div>
      
      <table>
        <tr style="font-weight:bold; font-size:11px; border-bottom:1px solid #000;">
          <td>Item</td>
          <td class="text-right">Qty</td>
          <td class="text-right">Amt</td>
        </tr>
      </table>
      ${itemsHtml}
      
      <div class="divider"></div>
      
      ${subtotalRow}${taxRow}${deliveryRow}${containerRow}${discountRow}
      
      <div class="double-divider"></div>
      
      <div class="total-row">
        <span>TOTAL</span>
        <span style="font-size:16px;">${cs}${(order.total_amount || 0).toFixed(2)}</span>
      </div>
      
      ${paymentRow}
      ${qrHtml}
      
      <div class="divider" style="margin-top:6px;"></div>
      <div class="subheader" style="font-weight:500;">${order.receiptFooter || 'Thank You!'}</div>
      <div class="subheader" style="font-size:9px; margin-top:3px; color:#888;">Powered by ZapBill POS</div>
    `;
  }

  // ─── KOT HTML ─────────────────────────────────────────────
  generateKOTHtml(order, items, kotNumber = null, stationName = null, isReprint = false) {
    const reprintBadge = isReprint
      ? '<div class="reprint-badge">*** REPRINT KOT ***</div>' : '';

    const stationBadge = stationName
      ? `<div class="station-name">📍 ${stationName.toUpperCase()}</div>` : '';

    const kotNumberLine = kotNumber
      ? `<div style="font-size:16px; font-weight:bold; text-align:center;">KOT #${kotNumber}</div>` : '';

    // Items
    const itemsHtml = (items || []).map(item => {
      let details = '';
      if (item.variant) {
        try {
          const v = typeof item.variant === 'string' ? JSON.parse(item.variant) : item.variant;
          if (v && v.name) details += `<div style="font-size:12px; padding-left:12px;">↳ ${v.name}</div>`;
        } catch (_) {}
      }
      if (item.addons) {
        try {
          const a = typeof item.addons === 'string' ? JSON.parse(item.addons) : item.addons;
          if (Array.isArray(a)) {
            a.forEach(addon => {
              details += `<div style="font-size:12px; padding-left:12px;">+ ${addon.name}</div>`;
            });
          }
        } catch (_) {}
      }
      if (item.special_instructions) {
        details += `<div class="kot-note">📝 ${item.special_instructions}</div>`;
      }

      return `
        <div class="kot-item">
          <div style="font-size:15px;">${item.quantity} × ${item.item_name}</div>
          ${details}
        </div>`;
    }).join('');

    // Urgency banner
    const urgency = order.urgency || 'normal';
    const urgencyBadge = (urgency === 'urgent' || urgency === 'critical')
      ? `<div style="text-align:center; background:#000; color:#fff; font-weight:bold; padding:5px; font-size:14px; letter-spacing:2px; margin-bottom:4px;">⚡ ${urgency.toUpperCase()} ⚡</div>`
      : '';

    return `
      ${urgencyBadge}
      ${reprintBadge}
      ${stationBadge}
      
      <div class="kot-header">KITCHEN ORDER TICKET</div>
      ${kotNumberLine}
      <div style="text-align:center; font-size:13px; font-weight:bold;">${(order.order_type || '').replace('_', ' ').toUpperCase()}</div>
      
      <div class="divider"></div>
      
      <div style="display:flex; justify-content:space-between; font-size:13px;">
        <span>Order #: <strong>${order.order_number || 'N/A'}</strong></span>
        <span>${new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
      </div>
      ${order.table_number ? `<div style="font-size:18px; font-weight:bold; text-align:center; margin:5px 0; background:#eee; padding:4px;">TABLE ${order.table_number}</div>` : ''}
      
      <div class="double-divider"></div>
      
      ${itemsHtml}
      
      ${order.chef_instructions ? `
        <div style="margin-top:6px; padding:5px; border:2px solid #000; font-weight:bold; font-size:13px;">
          🍳 CHEF: ${order.chef_instructions}
        </div>
      ` : ''}
      
      <div class="divider" style="margin-top:10px;"></div>
      <div class="text-center" style="font-size:10px;">--- Kitchen Copy ---</div>
    `;
  }

  // ─── Void KOT HTML ────────────────────────────────────────
  generateVoidKOTHtml(order, items, reason, kotNumber = null) {
    const itemsHtml = (items || []).map(item => `
      <div style="font-size:14px; font-weight:bold; margin-bottom:4px; text-decoration:line-through;">
        ${item.quantity || 1} × ${item.item_name || item.name || 'Item'}
      </div>
    `).join('');

    return `
      <div class="void-badge">❌ VOID KOT ❌</div>
      
      ${kotNumber ? `<div style="font-size:14px; font-weight:bold; text-align:center;">KOT #${kotNumber}</div>` : ''}
      
      <div class="divider"></div>
      
      <div style="display:flex; justify-content:space-between; font-size:12px;">
        <span>Order #: <strong>${order.order_number || 'N/A'}</strong></span>
        <span>${new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
      </div>
      ${order.table_number ? `<div style="font-size:16px; font-weight:bold; text-align:center; margin:4px 0;">TABLE ${order.table_number}</div>` : ''}
      
      <div class="divider"></div>
      
      <div style="font-weight:bold; margin-bottom:6px; font-size:13px;">CANCELLED ITEMS:</div>
      ${itemsHtml}
      
      ${reason ? `
        <div class="divider"></div>
        <div style="font-weight:bold; font-size:12px;">Reason: ${reason}</div>
      ` : ''}
      
      <div class="divider" style="margin-top:10px;"></div>
      <div class="text-center" style="font-size:10px;">--- Void Copy ---</div>
    `;
  }

  // ─── Mini-Bill HTML (condensed bill summary for KOT attachment) ──
  generateMiniBillHtml(order, allItems) {
    const currencySymbol = order.currencySymbol || '₹';
    
    const itemsHtml = (allItems || []).map(item => {
      const price = parseFloat(item.price || 0) * parseInt(item.quantity || 1);
      return `
        <div style="display:flex; justify-content:space-between; font-size:11px; padding:1px 0;">
          <span>${item.quantity} × ${item.item_name}</span>
          <span>${currencySymbol}${price.toFixed(2)}</span>
        </div>`;
    }).join('');

    return `
      <div style="border-top:2px dashed #000; margin-top:8px; padding-top:6px;">
        <div style="text-align:center; font-size:10px; font-weight:bold; letter-spacing:1px; margin-bottom:4px;">
          ✂ - - - - - - TEAR HERE - - - - - - ✂
        </div>
        <div style="text-align:center; font-size:13px; font-weight:bold; margin-bottom:4px;">
          ${order.restaurantName || 'BILL SUMMARY'}
        </div>
        <div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:2px;">
          <span>Order #: <strong>${order.order_number || 'N/A'}</strong></span>
          <span>${new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
        </div>
        ${order.table_number ? `<div style="font-size:11px; margin-bottom:2px;">Table: <strong>${order.table_number}</strong></div>` : ''}
        ${order.customer_name ? `<div style="font-size:11px; margin-bottom:2px;">Customer: ${order.customer_name}</div>` : ''}
        
        <div style="border-top:1px solid #000; margin:4px 0;"></div>
        ${itemsHtml}
        <div style="border-top:1px solid #000; margin:4px 0;"></div>
        
        ${order.subtotal ? `
        <div style="display:flex; justify-content:space-between; font-size:11px;">
          <span>Subtotal</span><span>${currencySymbol}${parseFloat(order.subtotal).toFixed(2)}</span>
        </div>` : ''}
        ${order.tax_amount ? `
        <div style="display:flex; justify-content:space-between; font-size:11px;">
          <span>Tax</span><span>${currencySymbol}${parseFloat(order.tax_amount).toFixed(2)}</span>
        </div>` : ''}
        ${order.discount_amount ? `
        <div style="display:flex; justify-content:space-between; font-size:11px;">
          <span>Discount</span><span>-${currencySymbol}${parseFloat(order.discount_amount).toFixed(2)}</span>
        </div>` : ''}
        <div style="display:flex; justify-content:space-between; font-size:13px; font-weight:bold; border-top:1px solid #000; padding-top:3px; margin-top:3px;">
          <span>TOTAL</span><span>${currencySymbol}${parseFloat(order.total || order.grand_total || 0).toFixed(2)}</span>
        </div>
        
        <div style="text-align:center; font-size:9px; margin-top:6px; color:#555;">--- Bill Copy (Kitchen Ref) ---</div>
      </div>
    `;
  }

  // ─── Print KOT with attached mini-bill ────────────────────
  async printKOTWithBill(order, kotItems, allItems, printerName, stationName = null) {
    try {
      const kotHtml = this.generateKOTHtml(order, kotItems, null, stationName);
      const miniBillHtml = this.generateMiniBillHtml(order, allItems);
      const combinedHtml = kotHtml + miniBillHtml;
      return await this.printHtml(combinedHtml, printerName, '80');
    } catch (error) {
      log.error('Print KOT with bill error:', error);
      return { success: false, error: error.message };
    }
  }

  // ─── Station-Wise KOT Routing ─────────────────────────────
  /**
   * Routes items to correct station printers based on category-station mapping.
   * @param {Object} order - The order object (enriched with restaurant info for mini-bill)
   * @param {Array} items - Array of order items with category_id
   * @param {Array} stationMap - Array of {category_id, station_id, station_name, printer_name}
   * @param {string} defaultPrinterName - Fallback KOT printer for unmapped categories
   * @param {boolean} attachBill - Whether to attach a mini-bill to each KOT
   * @returns {Promise} - Results of all station prints
   */
  async printStationKOTs(order, items, stationMap, defaultPrinterName, attachBill = false) {
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

    // Print to each station concurrently
    const printJobs = [];

    for (const [, group] of Object.entries(stationGroups)) {
      if (attachBill) {
        printJobs.push(
          this.printKOTWithBill(order, group.items, items, group.printerName, group.stationName)
            .catch(err => ({ success: false, error: err.message, station: group.stationName }))
        );
      } else {
        printJobs.push(
          this.printKOT(order, group.items, group.printerName, null, group.stationName)
            .catch(err => ({ success: false, error: err.message, station: group.stationName }))
        );
      }
    }

    // Print unmapped items to default KOT printer
    if (unmappedItems.length > 0) {
      if (attachBill) {
        printJobs.push(
          this.printKOTWithBill(order, unmappedItems, items, defaultPrinterName)
            .catch(err => ({ success: false, error: err.message, station: 'Default' }))
        );
      } else {
        printJobs.push(
          this.printKOT(order, unmappedItems, defaultPrinterName)
            .catch(err => ({ success: false, error: err.message, station: 'Default' }))
        );
      }
    }

    const results = await Promise.allSettled(printJobs);
    const failures = results.filter(r => r.status === 'rejected' || (r.value && !r.value.success));
    
    if (failures.length > 0) {
      log.warn('Some station KOTs failed:', failures);
    }

    return { success: true, stationCount: Object.keys(stationGroups).length + (unmappedItems.length > 0 ? 1 : 0) };
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
