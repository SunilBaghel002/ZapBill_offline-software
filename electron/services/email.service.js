const nodemailer = require('nodemailer');
const dns = require('dns');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

class EmailService {
  constructor(db, mainWindow) {
    this.db = db;
    this.mainWindow = mainWindow;
    this.queueInterval = null;
    this.dailyJobInterval = null;
    this.lastReportSentKey = null;
    
    // Start processing queue
    this.startQueueProcessing();
    
    // Start hourly reporting job
    this.startHourlyReportJob();
  }

  // Helper to check internet connectivity
  checkInternet() {
    return new Promise((resolve) => {
      dns.lookup('google.com', (err) => {
        if (err && err.code === 'ENOTFOUND') {
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  }

  // Get configured nodemailer transporter
  getTransporter(config) {
    if (!config || !config.sender_email || !config.app_password) {
      return null;
    }

    return nodemailer.createTransport({
      service: config.service || 'gmail',
      auth: {
        user: config.sender_email,
        pass: config.app_password
      }
    });
  }

  // Send or queue email — SINGLE pathway, no duplicate calls
  async sendEmail(subject, htmlContent, attachmentPath = null, isRetry = false, originalQueueId = null) {
    const config = this.db.getEmailConfig();
    
    if (!config || !config.is_active || !config.owner_email) {
      return { success: false, error: 'Email configuration is missing or inactive' };
    }

    const isOnline = await this.checkInternet();

    if (!isOnline) {
      if (!isRetry) {
        // Queue it
        this.db.addEmailToQueue(subject, htmlContent, attachmentPath);
      }
      return { success: false, error: 'No internet connection. Email queued.' };
    }

    const transporter = this.getTransporter(config);
    if (!transporter) {
      return { success: false, error: 'Invalid email credentials configured' };
    }

    const mailOptions = {
      from: `ZapBill POS <${config.sender_email}>`,
      to: config.owner_email,
      subject: subject,
      html: htmlContent
    };

    if (attachmentPath && fs.existsSync(attachmentPath)) {
      mailOptions.attachments = [
        {
          filename: path.basename(attachmentPath),
          path: attachmentPath
        }
      ];
    }

    try {
      await transporter.sendMail(mailOptions);
      if (isRetry && originalQueueId) {
        this.db.updateEmailStatus(originalQueueId, 'sent');
      }
      return { success: true };
    } catch (err) {
      console.error('Failed to send email:', err);
      if (!isRetry) {
        this.db.addEmailToQueue(subject, htmlContent, attachmentPath);
      } else if (originalQueueId) {
        this.db.updateEmailStatus(originalQueueId, 'failed');
      }
      return { success: false, error: err.message };
    }
  }

  // Process queued emails every 30 minutes
  startQueueProcessing() {
    if (this.queueInterval) clearInterval(this.queueInterval);
    
    this.queueInterval = setInterval(async () => {
      const isOnline = await this.checkInternet();
      if (!isOnline) return;

      const pending = this.db.getPendingEmails();
      for (const email of pending) {
        await this.sendEmail(email.subject, email.html_content, email.attachment_path, true, email.id);
      }
    }, 30 * 60 * 1000);
  }

  // Check every minute if an hour has passed — sends ONE email per hour, nothing more
  startHourlyReportJob() {
    if (this.dailyJobInterval) clearInterval(this.dailyJobInterval);

    this.dailyJobInterval = setInterval(() => {
      const config = this.db.getEmailConfig();
      if (!config || !config.is_active) return;

      const now = new Date();
      const currentDateHourStr = `${now.toISOString().split('T')[0]}_${now.getHours()}`;

      // Strict dedup: only ONE email per calendar hour
      if (this.lastReportSentKey !== currentDateHourStr) {
        this.lastReportSentKey = currentDateHourStr;
        this.generateAndSendDailyReport();
      }
    }, 60 * 1000); // Check every minute
  }

  async generateAndSendDailyReport() {
    try {
      // 1. Always capture screen (opened tab screenshot)
      let screenshotPath = null;
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        const image = await this.mainWindow.webContents.capturePage();
        const userDataPath = app.getPath('userData');
        screenshotPath = path.join(userDataPath, `billing_screen_${Date.now()}.png`);
        fs.writeFileSync(screenshotPath, image.toPNG());
      }

      // 2. Fetch config and report settings
      const config = this.db.getEmailConfig();
      const rs = config.report_settings || {
        items_mode: 'top',
        items_top_count: 20,
        items_custom_ids: [],
        addons_mode: 'top',
        addons_top_count: 10,
        addons_custom_names: [],
        bills_count: 20
      };

      const now = new Date();
      const todayDate = now.toISOString().split('T')[0];
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      // 3. Fetch base data
      const orders = this.db.execute(
        "SELECT * FROM orders WHERE date(created_at) = date('now') AND status != 'cancelled' AND is_deleted = 0 ORDER BY created_at DESC"
      );

      const totalBills = orders.length;
      const totalSales = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
      const avgBill = totalBills > 0 ? (totalSales / totalBills) : 0;

      // 4. Build items list based on mode
      const topItems = this._getReportItems(rs, todayDate);

      // 5. Build addons list based on mode
      const topAddons = this._getReportAddons(rs, todayDate);

      // 6. Recent bills (limited by bills_count)
      const billsCount = rs.bills_count || 20;
      const recentBills = orders.slice(0, billsCount);

      // 7. Format the SINGLE consolidated email HTML
      let html = this._buildEmailHTML({
        todayDate, timeStr, totalSales, totalBills, avgBill,
        topItems, topAddons, recentBills, rs
      });

      const subject = `Sales Report - ${todayDate} ${timeStr} - ZapBill`;
      const result = await this.sendEmail(subject, html, screenshotPath);

      // Clean up the screenshot file after trying to send
      if (screenshotPath && fs.existsSync(screenshotPath)) {
        setTimeout(() => {
          try { fs.unlinkSync(screenshotPath); } catch(e) {}
        }, 60000);
      }

      return result;
    } catch (e) {
      console.error('Failed to generate daily report:', e);
      return { success: false, error: e.message };
    }
  }

  // Get items for the report based on admin settings
  _getReportItems(rs, todayDate) {
    const mode = rs.items_mode || 'top';
    const topCount = rs.items_top_count || 20;
    const customIds = rs.items_custom_ids || [];
    const showZeroQty = rs.items_show_zero_qty ?? true; // fallback to true

    // Always fetch top selling items
    const allTopItems = this.db.execute(`
      SELECT oi.item_name, oi.menu_item_id, SUM(oi.quantity) as qty, c.name as category_name
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
      LEFT JOIN categories c ON mi.category_id = c.id
      WHERE date(o.created_at) = date('now') 
        AND o.status != 'cancelled' 
        AND o.is_deleted = 0
        AND (oi.is_deleted = 0 OR oi.is_deleted IS NULL)
      GROUP BY oi.item_name, oi.menu_item_id, c.name
      ORDER BY qty DESC
    `);

    if (mode === 'top') {
      return allTopItems.slice(0, topCount);
    }

    if (mode === 'custom') {
      if (customIds.length === 0) return allTopItems.slice(0, topCount);
      
      const customItems = [];
      for (const itemId of customIds) {
        const found = allTopItems.find(i => i.menu_item_id === itemId);
        if (found) {
          customItems.push(found);
        } else if (showZeroQty) {
          // Item not sold today, fetch name and category from menu
          const menuItem = this.db.execute(`
            SELECT mi.name, c.name as category_name 
            FROM menu_items mi 
            LEFT JOIN categories c ON mi.category_id = c.id
            WHERE mi.id = ?
          `, [itemId]);
          if (menuItem.length > 0) {
            customItems.push({ item_name: menuItem[0].name, menu_item_id: itemId, qty: 0, category_name: menuItem[0].category_name });
          }
        }
      }
      return customItems;
    }

    if (mode === 'mixed') {
      const customItems = [];
      for (const itemId of customIds) {
        const found = allTopItems.find(i => i.menu_item_id === itemId);
        if (found) {
          customItems.push(found);
        } else if (showZeroQty) {
          const menuItem = this.db.execute(`
            SELECT mi.name, c.name as category_name 
            FROM menu_items mi 
            LEFT JOIN categories c ON mi.category_id = c.id
            WHERE mi.id = ?
          `, [itemId]);
          if (menuItem.length > 0) {
            customItems.push({ item_name: menuItem[0].name, menu_item_id: itemId, qty: 0, category_name: menuItem[0].category_name });
          }
        }
      }

      // Fill rest from top items (excluding already-added custom items)
      const customIdSet = new Set(customIds);
      const remaining = allTopItems.filter(i => !customIdSet.has(i.menu_item_id));
      const slotsLeft = Math.max(0, topCount - customItems.length);
      
      return [...customItems, ...remaining.slice(0, slotsLeft)];
    }

    return allTopItems.slice(0, topCount);
  }

  // Get addons for the report based on admin settings
  _getReportAddons(rs, todayDate) {
    const mode = rs.addons_mode || 'top';
    const topCount = rs.addons_top_count || 10;
    const customNames = rs.addons_custom_names || [];

    const allAddons = this.db.getAddonSales(todayDate, todayDate)
      .sort((a, b) => b.quantity - a.quantity);

    if (mode === 'top') {
      return allAddons.slice(0, topCount);
    }

    if (mode === 'custom') {
      if (customNames.length === 0) return allAddons.slice(0, topCount);
      
      const customAddons = [];
      for (const name of customNames) {
        const found = allAddons.find(a => a.name === name);
        if (found) {
          customAddons.push(found);
        } else {
          customAddons.push({ name, quantity: 0, revenue: 0 });
        }
      }
      return customAddons;
    }

    if (mode === 'mixed') {
      const customAddons = [];
      for (const name of customNames) {
        const found = allAddons.find(a => a.name === name);
        if (found) {
          customAddons.push(found);
        } else {
          customAddons.push({ name, quantity: 0, revenue: 0 });
        }
      }

      const customNameSet = new Set(customNames);
      const remaining = allAddons.filter(a => !customNameSet.has(a.name));
      const slotsLeft = Math.max(0, topCount - customAddons.length);

      return [...customAddons, ...remaining.slice(0, slotsLeft)];
    }

    return allAddons.slice(0, topCount);
  }

  // Build the single consolidated email HTML
  _buildEmailHTML({ todayDate, timeStr, totalSales, totalBills, avgBill, topItems, topAddons, recentBills, rs }) {
    const modeLabel = (mode) => {
      if (mode === 'top') return 'Top Selling';
      if (mode === 'custom') return 'Custom Selection';
      if (mode === 'mixed') return 'Custom + Top Selling';
      return 'Top Selling';
    };

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #0096FF; text-align: center; border-bottom: 2px solid #f0f0f0; padding-bottom: 10px;">ZapBill Hourly Sales Report</h2>
        <p style="text-align: center; color: #666;">Date: ${todayDate} | Time: ${timeStr}</p>
        
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
          <tr>
            <td width="33%" style="padding: 4px;">
              <div style="text-align: center; background: #f0fdf4; padding: 16px 10px; border-radius: 10px; border: 1px solid #bbf7d0;">
                <div style="font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Total Sales (Today)</div>
                <div style="font-size: 22px; font-weight: bold; color: #10b981;">₹${totalSales.toFixed(2)}</div>
              </div>
            </td>
            <td width="33%" style="padding: 4px;">
              <div style="text-align: center; background: #eff6ff; padding: 16px 10px; border-radius: 10px; border: 1px solid #bfdbfe;">
                <div style="font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Total Bills</div>
                <div style="font-size: 22px; font-weight: bold; color: #3b82f6;">${totalBills}</div>
              </div>
            </td>
            <td width="33%" style="padding: 4px;">
              <div style="text-align: center; background: #fffbeb; padding: 16px 10px; border-radius: 10px; border: 1px solid #fde68a;">
                <div style="font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Avg Bill</div>
                <div style="font-size: 22px; font-weight: bold; color: #f59e0b;">₹${avgBill.toFixed(2)}</div>
              </div>
            </td>
          </tr>
        </table>

        <h3 style="color: #334155; margin-top: 30px;">${modeLabel(rs.items_mode)} Items (Today)</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background: #e2e8f0; text-align: left;">
              <th style="padding: 8px; border: 1px solid #cbd5e1;">Item Name</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1;">Category</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">Quantity Sold</th>
            </tr>
          </thead>
          <tbody>
            ${topItems.length > 0 ? topItems.map(item => `
              <tr>
                <td style="padding: 8px; border: 1px solid #cbd5e1;">${item.item_name}</td>
                <td style="padding: 8px; border: 1px solid #cbd5e1;">${item.category_name || '-'}</td>
                <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold;">${item.qty}</td>
              </tr>
            `).join('') : '<tr><td colspan="3" style="padding: 8px; text-align: center; color: #94a3b8;">No items sold today</td></tr>'}
          </tbody>
        </table>

        <h3 style="color: #334155; margin-top: 30px;">${modeLabel(rs.addons_mode)} Add-ons (Today)</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background: #e2e8f0; text-align: left;">
              <th style="padding: 8px; border: 1px solid #cbd5e1;">Add-on Name</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">Quantity Sold</th>
            </tr>
          </thead>
          <tbody>
            ${topAddons.length > 0 ? topAddons.map(addon => `
              <tr>
                <td style="padding: 8px; border: 1px solid #cbd5e1;">${addon.name}</td>
                <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold;">${addon.quantity}</td>
              </tr>
            `).join('') : '<tr><td colspan="2" style="padding: 8px; text-align: center; color: #94a3b8;">No add-ons sold today</td></tr>'}
          </tbody>
        </table>

        <h3 style="color: #334155;">Recent Bills Summary (Last ${rs.bills_count || 20})</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background: #e2e8f0; text-align: left;">
              <th style="padding: 8px; border: 1px solid #cbd5e1;">Bill #</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1;">Time</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1;">Method</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${recentBills.length > 0 ? recentBills.map(order => `
              <tr>
                <td style="padding: 8px; border: 1px solid #cbd5e1;">#${order.order_number}</td>
                <td style="padding: 8px; border: 1px solid #cbd5e1;">${new Date(order.created_at).toLocaleTimeString()}</td>
                <td style="padding: 8px; border: 1px solid #cbd5e1; text-transform: capitalize;">${order.payment_method || '-'}</td>
                <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right; font-weight: bold;">₹${(order.total_amount || 0).toFixed(2)}</td>
              </tr>
            `).join('') : '<tr><td colspan="4" style="padding: 8px; text-align: center; color: #94a3b8;">No bills today</td></tr>'}
          </tbody>
        </table>
        
        <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 40px;">
          This is an automated hourly report generated by ZapBill Offline POS. 
          A screenshot of the billing interface at the time of generation is attached.
        </p>
      </div>
    `;
  }
}

module.exports = EmailService;
