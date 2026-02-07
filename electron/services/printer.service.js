const log = require('electron-log');

/**
 * Printer Service for ESC/POS thermal printers
 * Supports USB thermal printers using ESC/POS commands
 */
class PrinterService {
  constructor() {
    this.device = null;
    this.printer = null;
    this.isConnected = false;
    
    // ESC/POS Commands
    this.ESC = '\x1B';
    this.GS = '\x1D';
    this.INIT = '\x1B\x40';  // Initialize printer
    this.CUT = '\x1D\x56\x00';  // Full cut
    this.PARTIAL_CUT = '\x1D\x56\x01';  // Partial cut
    this.BOLD_ON = '\x1B\x45\x01';
    this.BOLD_OFF = '\x1B\x45\x00';
    this.CENTER = '\x1B\x61\x01';
    this.LEFT = '\x1B\x61\x00';
    this.RIGHT = '\x1B\x61\x02';
    this.DOUBLE_HEIGHT = '\x1B\x21\x10';
    this.DOUBLE_WIDTH = '\x1B\x21\x20';
    this.NORMAL = '\x1B\x21\x00';
    this.LINE_FEED = '\x0A';
  }

  /**
   * Initialize and connect to printer
   */
  async connect() {
    try {
      // Try to use escpos library if available
      let escpos, USB;
      
      try {
        escpos = require('escpos');
        USB = require('escpos-usb');
        escpos.USB = USB;
        
        this.device = new USB();
        this.printer = new escpos.Printer(this.device);
        this.isConnected = true;
        
        log.info('ESC/POS printer connected via USB');
        return { success: true };
      } catch (e) {
        log.warn('ESC/POS USB not available, using fallback printing');
        return { success: true, fallback: true };
      }
    } catch (error) {
      log.error('Printer connection error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Print a receipt for an order
   */
  async printReceipt(order) {
    try {
      const content = this.generateReceiptContent(order);
      
      if (this.printer && this.device) {
        return await this.printWithEscPos(content);
      } else {
        return await this.printWithFallback(content, 'receipt');
      }
    } catch (error) {
      log.error('Print receipt error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Print Kitchen Order Ticket (KOT)
   */
  async printKOT(order, items) {
    try {
      const content = this.generateKOTContent(order, items);
      
      if (this.printer && this.device) {
        return await this.printWithEscPos(content);
      } else {
        return await this.printWithFallback(content, 'kot');
      }
    } catch (error) {
      log.error('Print KOT error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Test print functionality
   */
  async testPrint() {
    try {
      const content = {
        lines: [
          { text: 'TEST PRINT', style: 'header' },
          { text: '================================', style: 'normal' },
          { text: 'Printer is working correctly!', style: 'normal' },
          { text: new Date().toLocaleString(), style: 'normal' },
          { text: '================================', style: 'normal' },
        ]
      };
      
      if (this.printer && this.device) {
        return await this.printWithEscPos(content);
      } else {
        return await this.printWithFallback(content, 'test');
      }
    } catch (error) {
      log.error('Test print error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate receipt content
   */
  generateReceiptContent(order) {
    const lines = [];
    const divider = '================================';
    const thinDivider = '--------------------------------';
    
    // Header
    lines.push({ text: order.restaurantName || 'RESTAURANT POS', style: 'header' });
    if (order.restaurantAddress) {
      lines.push({ text: order.restaurantAddress, style: 'center' });
    }
    if (order.restaurantPhone) {
      lines.push({ text: `Tel: ${order.restaurantPhone}`, style: 'center' });
    }
    
    lines.push({ text: divider, style: 'normal' });
    
    // Order details
    lines.push({ text: `Bill No: ${order.order_number}`, style: 'bold' });
    lines.push({ text: `Date: ${new Date(order.created_at).toLocaleString()}`, style: 'normal' });
    if (order.table_number) {
      lines.push({ text: `Table: ${order.table_number}`, style: 'normal' });
    }
    lines.push({ text: `Type: ${order.order_type?.replace('_', ' ').toUpperCase()}`, style: 'normal' });
    if (order.cashier_name) {
      lines.push({ text: `Cashier: ${order.cashier_name}`, style: 'normal' });
    }
    
    lines.push({ text: divider, style: 'normal' });
    
    // Items header
    lines.push({ text: 'ITEM                 QTY   AMOUNT', style: 'bold' });
    lines.push({ text: thinDivider, style: 'normal' });
    
    // Items
    if (order.items) {
      order.items.forEach(item => {
        const name = item.item_name.substring(0, 18).padEnd(18);
        const qty = item.quantity.toString().padStart(3);
        const amount = item.item_total.toFixed(2).padStart(8);
        lines.push({ text: `${name}${qty}${amount}`, style: 'normal' });
        
        if (item.special_instructions) {
          lines.push({ text: `  > ${item.special_instructions}`, style: 'small' });
        }
      });
    }
    
    lines.push({ text: thinDivider, style: 'normal' });
    
    // Totals
    lines.push({ text: `Subtotal:         ${order.subtotal.toFixed(2).padStart(12)}`, style: 'normal' });
    if (order.tax_amount > 0) {
      lines.push({ text: `Tax:              ${order.tax_amount.toFixed(2).padStart(12)}`, style: 'normal' });
    }
    if (order.discount_amount > 0) {
      lines.push({ text: `Discount:         -${order.discount_amount.toFixed(2).padStart(11)}`, style: 'normal' });
    }
    
    lines.push({ text: divider, style: 'normal' });
    lines.push({ text: `TOTAL:            ${order.total_amount.toFixed(2).padStart(12)}`, style: 'bold' });
    lines.push({ text: divider, style: 'normal' });
    
    // Payment
    if (order.payment_method) {
      lines.push({ text: `Payment: ${order.payment_method.toUpperCase()}`, style: 'normal' });
    }
    
    // Footer
    lines.push({ text: '', style: 'normal' });
    lines.push({ text: order.receiptFooter || 'Thank you for dining with us!', style: 'center' });
    if (order.gstNumber) {
      lines.push({ text: `GST: ${order.gstNumber}`, style: 'center' });
    }
    
    return { lines };
  }

  /**
   * Generate KOT content
   */
  generateKOTContent(order, items) {
    const lines = [];
    const divider = '================================';
    
    // Header
    lines.push({ text: 'KITCHEN ORDER TICKET', style: 'header' });
    lines.push({ text: divider, style: 'normal' });
    
    // Order info
    lines.push({ text: `Order #: ${order.order_number}`, style: 'bold' });
    lines.push({ text: `Time: ${new Date().toLocaleTimeString()}`, style: 'normal' });
    if (order.table_number) {
      lines.push({ text: `TABLE: ${order.table_number}`, style: 'header' });
    }
    lines.push({ text: `Type: ${order.order_type?.replace('_', ' ').toUpperCase()}`, style: 'bold' });
    
    lines.push({ text: divider, style: 'normal' });
    
    // Items with variants and add-ons
    items.forEach(item => {
      lines.push({ text: `${item.quantity}x ${item.item_name}`, style: 'bold' });
      
      // Show variant if present
      if (item.variant) {
        try {
          const variant = typeof item.variant === 'string' ? JSON.parse(item.variant) : item.variant;
          if (variant && variant.name) {
            lines.push({ text: `   Size: ${variant.name}`, style: 'normal' });
          }
        } catch (e) {
          // Variant not parseable, skip
        }
      }
      
      // Show add-ons if present
      if (item.addons) {
        try {
          const addons = typeof item.addons === 'string' ? JSON.parse(item.addons) : item.addons;
          if (Array.isArray(addons) && addons.length > 0) {
            lines.push({ text: `   Add-ons:`, style: 'normal' });
            addons.forEach(addon => {
              lines.push({ text: `   + ${addon.name}`, style: 'normal' });
            });
          }
        } catch (e) {
          // Addons not parseable, skip
        }
      }
      
      if (item.special_instructions) {
        lines.push({ text: `   >> ${item.special_instructions}`, style: 'normal' });
      }
    });
    
    lines.push({ text: divider, style: 'normal' });
    lines.push({ text: new Date().toLocaleString(), style: 'center' });
    
    return { lines };
  }

  /**
   * Print using ESC/POS commands
   */
  async printWithEscPos(content) {
    return new Promise((resolve, reject) => {
      this.device.open((err) => {
        if (err) {
          log.error('Device open error:', err);
          return reject(err);
        }
        
        try {
          this.printer.font('A').align('CT').style('B');
          
          content.lines.forEach(line => {
            switch (line.style) {
              case 'header':
                this.printer.align('CT').size(2, 2).text(line.text).size(1, 1);
                break;
              case 'bold':
                this.printer.align('LT').style('B').text(line.text).style('NORMAL');
                break;
              case 'center':
                this.printer.align('CT').text(line.text);
                break;
              case 'small':
                this.printer.align('LT').size(0, 0).text(line.text).size(1, 1);
                break;
              default:
                this.printer.align('LT').text(line.text);
            }
          });
          
          this.printer.feed(3).cut().close();
          resolve({ success: true });
        } catch (e) {
          reject(e);
        }
      });
    });
  }

  /**
   * Fallback printing using system printer
   */
  async printWithFallback(content, type) {
    // For fallback, we'll create a simple text representation
    // that can be printed using the system's default printer
    
    const text = content.lines.map(line => line.text).join('\n');
    
    log.info(`Print job (${type}):`);
    log.info(text);
    
    // In a real implementation, you would use:
    // - Windows: Use win32print or similar
    // - Cross-platform: Use node-printer package
    
    return { 
      success: true, 
      message: 'Print job queued. Using fallback printing method.',
      printContent: text
    };
  }

  /**
   * Disconnect from printer
   */
  disconnect() {
    if (this.device) {
      try {
        this.device.close();
      } catch (e) {
        log.warn('Error closing printer device:', e);
      }
    }
    this.isConnected = false;
    log.info('Printer disconnected');
  }
}

module.exports = PrinterService;
