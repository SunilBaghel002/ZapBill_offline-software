const log = require('electron-log');
const { BrowserWindow } = require('electron');

/**
 * Printer Service for printing HTML content
 * Supports system printers using Electron's webContents.print
 */
class PrinterService {
  constructor() {
    this.printWindows = new Set();
  }

  /**
   * Get list of available printers
   */
  async getPrinters() {
    try {
      // Create a dummy window if needed or use main window if accessible
      // Since this runs in main process, we can use any window or create a temp one
      const win = new BrowserWindow({ show: false, width: 100, height: 100 });
      const printers = await win.webContents.getPrintersAsync();
      win.close();
      return printers;
    } catch (error) {
      log.error('Get printers error:', error);
      return [];
    }
  }

  /**
   * Print a receipt for an order
   */
  async printReceipt(order, printerName = null) {
    try {
      const html = this.generateReceiptHtml(order);
      return await this.printHtml(html, printerName);
    } catch (error) {
      log.error('Print receipt error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Print Kitchen Order Ticket (KOT)
   */
  async printKOT(order, items, printerName = null) {
    try {
      const html = this.generateKOTHtml(order, items);
      return await this.printHtml(html, printerName);
    } catch (error) {
      log.error('Print KOT error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Test print functionality
   */
  async testPrint(printerName = null) {
    try {
      const html = `
        <html>
          <body style="font-family: monospace; text-align: center; width: 300px; margin: 0 auto;">
            <h1 style="font-size: 24px;">TEST PRINT</h1>
            <hr/>
            <p>Printer is working correctly!</p>
            <p>${new Date().toLocaleString()}</p>
            <hr/>
          </body>
        </html>
      `;
      return await this.printHtml(html, printerName);
    } catch (error) {
      log.error('Test print error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Print HTML content to a specific printer
   */
  async printHtml(htmlContent, printerName) {
    return new Promise((resolve) => {
      // Create a hidden window for printing
      // Width set to match typical thermal paper (80mm ~ 300px-350px)
      const printWindow = new BrowserWindow({
        show: false,
        width: 300, // Reduced window width
        height: 600,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      });

      // Add to set to prevent GC
      this.printWindows.add(printWindow);

      // Load HTML content
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <style>
              @page {
                margin: 0;
                size: 72mm auto; /* Attempt to force dynamic height */
              }
              body { 
                margin: 0; 
                padding: 5px; 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; 
                font-size: 12px; 
                color: black; 
                background: white; 
                width: 270px; /* Approx 72mm printable width for 80mm paper */
                line-height: 1.2;
              }
              *, *::before, *::after { box-sizing: border-box; }
              h1, h2, h3, h4, h5, h6 { margin: 0; padding: 0; }
              p { margin: 0; padding: 0; }
              table { width: 100%; border-collapse: collapse; }
              th, td { text-align: left; padding: 2px 0; }
              .text-right { text-align: right; }
              .text-center { text-align: center; }
              .bold { font-weight: bold; }
              .divider { border-top: 1px dashed #000; margin: 6px 0; }
              .header { font-size: 16px; font-weight: bold; text-align: center; margin-bottom: 2px; text-transform: uppercase; }
              .subheader { font-size: 12px; text-align: center; margin-bottom: 2px; }
              .item-row { margin-bottom: 4px; padding-bottom: 2px; }
              .instructions { font-size: 11px; font-style: italic; margin-top: 2px; }
              .total-row { display: flex; justify-content: space-between; font-weight: bold; font-size: 14px; margin-top: 4px; }
            </style>
          </head>
          <body>
            ${htmlContent}
          </body>
        </html>
      `;

      // Use a data URL to load the HTML
      printWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));

      printWindow.webContents.on('did-finish-load', () => {
        // Print options
        const options = {
          silent: true,
          printBackground: false,
          color: false,
          margin: { marginType: 'custom', top: 0, bottom: 0, left: 0, right: 0 }
        };

        if (printerName) {
          options.deviceName = printerName;
        }

        printWindow.webContents.print(options, (success, errorType) => {
          if (!success) {
            log.error('Print failed:', errorType);
            resolve({ success: false, error: errorType });
          } else {
            resolve({ success: true });
          }
          
          // Close window after printing
          setTimeout(() => {
            if (!printWindow.isDestroyed()) {
              printWindow.close();
            }
            this.printWindows.delete(printWindow);
          }, 5000);
        });
      });
    });
  }

  /**
   * Generate Receipt HTML
   */
  generateReceiptHtml(order) {
    const items = order.items || [];
    
    // Format items rows
    const itemsHtml = items.map(item => {
      let details = '';
      if (item.variant) {
        try {
          const v = typeof item.variant === 'string' ? JSON.parse(item.variant) : item.variant;
          if (v && v.name) details += `<div style="font-size: 11px; padding-left: 8px; color: #333;">- Size: ${v.name}</div>`;
        } catch (e) {}
      }
      if (item.addons) {
        try {
          const a = typeof item.addons === 'string' ? JSON.parse(item.addons) : item.addons;
          if (Array.isArray(a)) {
            a.forEach(addon => {
              details += `<div style="font-size: 11px; padding-left: 8px; color: #333;">+ ${addon.name}</div>`;
            });
          }
        } catch (e) {}
      }
      
      return `
        <div class="item-row">
          <div style="display: flex; justify-content: space-between;">
            <div style="flex: 1;">${item.item_name} <span style="font-size: 11px;">x${item.quantity}</span></div>
            <div class="bold">${(item.item_total || 0).toFixed(2)}</div>
          </div>
          ${details}
        </div>
      `;
    }).join('');
    
    // Restaurant Info
    const restaurantName = order.restaurantName || 'RESTAURANT';
    const address = order.restaurantAddress ? `<div class="subheader">${order.restaurantAddress}</div>` : '';
    const phone = order.restaurantPhone ? `<div class="subheader">Tel: ${order.restaurantPhone}</div>` : '';
    const gst = order.gstNumber ? `<div class="subheader">GST: ${order.gstNumber}</div>` : '';

    return `
      <div class="header">${restaurantName}</div>
      ${address}
      ${phone}
      ${gst}
      
      <div class="divider"></div>
      
      <div style="display: flex; justify-content: space-between; font-size: 12px;">
        <span>Bill No: ${order.order_number}</span>
        <span>${new Date().toLocaleDateString()}</span>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 12px;">
        <span>${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
        <span>${order.order_type?.replace('_', ' ').toUpperCase()}</span>
      </div>
      ${order.table_number ? `<div style="font-size: 12px;">Table: <b>${order.table_number}</b></div>` : ''}
      ${order.customer_name ? `<div style="font-size: 12px;">Cust: ${order.customer_name}</div>` : ''}
      
      <div class="divider"></div>
      
      <div style="font-size: 12px; font-weight: bold; margin-bottom: 4px;">ITEMS</div>
      ${itemsHtml}
      
      <div class="divider"></div>
      
      <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
        <span>Subtotal</span>
        <span>${(order.subtotal || 0).toFixed(2)}</span>
      </div>
      ${(order.tax_amount > 0) ? `
        <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
          <span>Tax</span>
          <span>${order.tax_amount.toFixed(2)}</span>
        </div>
      ` : ''}
      ${(order.discount_amount > 0) ? `
        <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
          <span>Discount</span>
          <span>-${order.discount_amount.toFixed(2)}</span>
        </div>
      ` : ''}
      
      <div class="divider"></div>
      
      <div class="total-row">
        <span>TOTAL</span>
        <span style="font-size: 16px;">${(order.total_amount || 0).toFixed(2)}</span>
      </div>
      
      <div class="divider"></div>
      
      <div class="subheader" style="margin-top: 8px; font-weight: 500;">${order.receiptFooter || 'Thank You!'}</div>
      <div class="subheader" style="font-size: 10px; margin-top: 4px; color: #555;">Powered by Offline POS</div>
    `;
  }

  /**
   * Generate KOT HTML
   */
  generateKOTHtml(order, items) {
    // Format items
    const itemsHtml = items.map(item => {
      let details = '';
      if (item.variant) {
        try {
          const v = typeof item.variant === 'string' ? JSON.parse(item.variant) : item.variant;
          if (v && v.name) details += `<div style="font-size: 12px; padding-left: 10px;">Size: ${v.name}</div>`;
        } catch (e) {}
      }
      if (item.addons) {
        try {
          const a = typeof item.addons === 'string' ? JSON.parse(item.addons) : item.addons;
          if (Array.isArray(a)) {
            a.forEach(addon => {
              details += `<div style="font-size: 12px; padding-left: 10px;">+ ${addon.name}</div>`;
            });
          }
        } catch (e) {}
      }
      if (item.special_instructions) {
        details += `<div style="font-size: 12px; background: #eee; font-weight: bold; padding: 2px; margin-top: 2px;">NOTE: ${item.special_instructions}</div>`;
      }
      
      return `
        <div class="item-row" style="margin-bottom: 8px; border-bottom: 1px dotted #ccc; padding-bottom: 4px;">
          <div style="font-weight: bold; font-size: 14px;">${item.quantity} x ${item.item_name}</div>
          ${details}
        </div>
      `;
    }).join('');

    const urgency = order.urgency || 'normal';
    const urgencyBadge = urgency === 'urgent' || urgency === 'critical' 
      ? `<div style="text-align: center; background: black; color: white; font-weight: bold; padding: 4px; margin-bottom: 6px;">${urgency.toUpperCase()}</div>`
      : '';

    return `
      ${urgencyBadge}
      <div class="header" style="font-size: 16px;">KITCHEN TICKET (KOT)</div>
      <div class="subheader" style="font-size: 14px; font-weight: bold;">${order.order_type?.replace('_', ' ').toUpperCase()}</div>
      
      <div class="divider"></div>
      
      <div style="display: flex; justify-content: space-between; font-size: 14px;">
        <span>Order #: <b>${order.order_number}</b></span>
      </div>
      <div style="font-size: 13px;">Date: ${new Date().toLocaleString([], {hour: '2-digit', minute:'2-digit'})}</div>
      ${order.table_number ? `<div style="font-size: 18px; font-weight: bold; margin: 6px 0;">TABLE: ${order.table_number}</div>` : ''}
      
      <div class="divider"></div>
      
      <div style="margin-top: 8px;">
        ${itemsHtml}
      </div>
      
      ${order.chef_instructions ? `
        <div style="margin-top: 8px; padding: 6px; border: 2px solid black; font-weight: bold; font-size: 14px;">
          CHEF NOTE: ${order.chef_instructions}
        </div>
      ` : ''}
      
      <div class="divider" style="margin-top: 15px;"></div>
      <div class="text-center" style="font-size: 11px;">--- Kitchen Copy ---</div>
    `;
  }
}

module.exports = PrinterService;
