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
    this.lastReportSentDate = null;
    
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

  // Send or queue email
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
      // Only queue on the very first try if we didn't know it was a hard error,
      // but nodemailer errors might be bad auth. To be safe, if not a retry, we queue.
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
    
    // 30 minutes = 30 * 60 * 1000
    this.queueInterval = setInterval(async () => {
      const isOnline = await this.checkInternet();
      if (!isOnline) return;

      const pending = this.db.getPendingEmails();
      for (const email of pending) {
        // Only try to retry if it hasn't been tried recently (e.g., 30 mins)
        // For simplicity, we just attempt all pending here as interval is 30m
        await this.sendEmail(email.subject, email.html_content, email.attachment_path, true, email.id);
      }
    }, 30 * 60 * 1000);
  }

  // Check every minute if an hour has passed to send the report
  startHourlyReportJob() {
    if (this.dailyJobInterval) clearInterval(this.dailyJobInterval);

    this.dailyJobInterval = setInterval(() => {
      const config = this.db.getEmailConfig();
      if (!config || !config.is_active) return;

      const now = new Date();
      const currentDateHourStr = `${now.toISOString().split('T')[0]}_${now.getHours()}`;

      if (this.lastReportSentKey !== currentDateHourStr) {
        this.lastReportSentKey = currentDateHourStr;
        this.generateAndSendDailyReport();
      }
    }, 60 * 1000); // Check every minute
  }

  async generateAndSendDailyReport() {
    try {
      // 1. Capture screen
      let screenshotPath = null;
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        const image = await this.mainWindow.webContents.capturePage();
        const userDataPath = app.getPath('userData');
        screenshotPath = path.join(userDataPath, `billing_screen_${Date.now()}.png`);
        fs.writeFileSync(screenshotPath, image.toPNG());
      }

      // 2. Fetch Report Data
      const now = new Date();
      const todayDate = now.toISOString().split('T')[0];
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      // Get all orders for today
      // In SQLite, date(created_at) compares with YYYY-MM-DD
      const orders = this.db.execute(
        "SELECT * FROM orders WHERE date(created_at) = date('now') AND status != 'cancelled' ORDER BY created_at DESC"
      );

      const totalBills = orders.length;
      const totalSales = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
      const avgBill = totalBills > 0 ? (totalSales / totalBills) : 0;

      // Top 10 selling items
      const topItems = this.db.execute(`
        SELECT item_name, SUM(quantity) as qty
        FROM order_items 
        WHERE order_id IN (
          SELECT id FROM orders WHERE date(created_at) = date('now') AND status != 'cancelled'
        )
        GROUP BY item_name 
        ORDER BY qty DESC 
        LIMIT 10`
      );

      // Top 10 selling add-ons
      const topAddons = this.db.getAddonSales(todayDate, todayDate)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10);

      // 3. Format HTML
      let html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h2 style="color: #0096FF; text-align: center; border-bottom: 2px solid #f0f0f0; padding-bottom: 10px;">ZapBill Hourly Sales Report</h2>
          <p style="text-align: center; color: #666;">Date: ${todayDate} | Time: ${timeStr}</p>
          
          <div style="display: flex; justify-content: space-between; background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <div style="text-align: center;">
              <div style="font-size: 12px; color: #64748b; text-transform: uppercase;">Total Sales (Today)</div>
              <div style="font-size: 24px; font-weight: bold; color: #10b981;">₹${totalSales.toFixed(2)}</div>
            </div>
            <div style="text-align: center;">
              <div style="font-size: 12px; color: #64748b; text-transform: uppercase;">Total Bills</div>
              <div style="font-size: 24px; font-weight: bold; color: #3b82f6;">${totalBills}</div>
            </div>
            <div style="text-align: center;">
              <div style="font-size: 12px; color: #64748b; text-transform: uppercase;">Avg Bill</div>
              <div style="font-size: 24px; font-weight: bold; color: #f59e0b;">₹${avgBill.toFixed(2)}</div>
            </div>
          </div>

          <h3 style="color: #334155; margin-top: 30px;">Top Selling Items (Today)</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background: #e2e8f0; text-align: left;">
                <th style="padding: 8px; border: 1px solid #cbd5e1;">Item Name</th>
                <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">Quantity Sold</th>
              </tr>
            </thead>
            <tbody>
              ${topItems.length > 0 ? topItems.map(item => `
                <tr>
                  <td style="padding: 8px; border: 1px solid #cbd5e1;">${item.item_name}</td>
                  <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold;">${item.qty}</td>
                </tr>
              `).join('') : '<tr><td colspan="2" style="padding: 8px; text-align: center; color: #94a3b8;">No items sold today</td></tr>'}
            </tbody>
          </table>

          <h3 style="color: #334155; margin-top: 30px;">Top Selling Add-ons (Today)</h3>
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

          <h3 style="color: #334155;">Recent Bills Summary</h3>
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
              ${orders.slice(0, 20).map(order => `
                <tr>
                  <td style="padding: 8px; border: 1px solid #cbd5e1;">#${order.order_number}</td>
                  <td style="padding: 8px; border: 1px solid #cbd5e1;">${new Date(order.created_at).toLocaleTimeString()}</td>
                  <td style="padding: 8px; border: 1px solid #cbd5e1; text-transform: capitalize;">${order.payment_method || '-'}</td>
                  <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right; font-weight: bold;">₹${order.total_amount.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 40px;">
            This is an automated hourly report generated by ZapBill Offline POS. 
            A screenshot of the billing interface at the time of generation is attached if available.
          </p>
        </div>
      `;

      const subject = `Sales Report - ${todayDate} ${timeStr} - ZapBill`;
      const result = await this.sendEmail(subject, html, screenshotPath);

      // Clean up the screenshot file after trying to send
      if (screenshotPath && fs.existsSync(screenshotPath)) {
        setTimeout(() => {
          try { fs.unlinkSync(screenshotPath); } catch(e) {}
        }, 60000); // wait a minute just in case nodemailer holds the file
      }

      return result;
    } catch (e) {
      console.error('Failed to generate daily report:', e);
      return { success: false, error: e.message };
    }
  }
}

module.exports = EmailService;
