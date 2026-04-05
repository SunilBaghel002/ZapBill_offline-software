# ZapBill POS - Offline Restaurant Management System

## Overview
ZapBill POS is a robust, offline-first desktop application tailored for comprehensive restaurant management. It empowers you to streamline operations, manage orders, track inventory, and generate detailed reports seamlessly without requiring an active internet connection.

## 🚀 Key Features

* **Offline-First Point of Sale (POS)**: Lightning-fast, reliable billing interface designed for high-paced restaurant environments.
* **Smart Menu Management**: Effortlessly manage categories, items, varied pricing, item combinations, and customizable **Add-ons** & **Variants**.
* **QR-Based Digital Ordering**: Allow dine-in customers to place orders directly from their smartphones via a local network setup, automatically real-time syncing to the POS.
* **Real-time KOT Management**: Send Kitchen Order Tickets (KOT) instantly to the kitchen display or active printers, ensuring smooth kitchen communication.
* **Hardware Integration**: Built-in, direct support for **USB and Network ESC/POS Receipt Printers**.
* **Automated Reporting & Analytics**: Track overall sales, add-on performance, and top-selling items. Supports comprehensive data visualization and **automated hourly/daily email reporting**.
* **Inventory & Expense Tracking**: Maintain an accurate eye on stock levels and centrally manage daily operational expenses.
* **User & Role Management**: Staff authentication and dynamic role-based access control to keep your system secure.
* **Discount & Offer Management**: Apply custom discounts, promo codes, and offers dynamically during the checkout process.

## 🛠 Technology Stack

* **Frontend Engine**: React 18, Vite, Zustand (State Management), React Router.
* **UI/Styling**: Custom CSS and Lucide React (Icons), Recharts for responsive analytics dashboards.
* **Desktop Environment**: native OS experience powered by **Electron**.
* **Database Architecture**: Local SQLite (via `sql.js`) for exceptionally fast full offline data persistence.
* **Networking & Real-time Sync**: Express and Socket.io power the local APIs and real-time frontend syncing (crucial for local QR digital menus & KOTs).
* **Hardware & Utility Layers**: `escpos` and `escpos-usb` for raw printer commands, `nodemailer` for email connectivity.

## 💻 Installation & Offline Usage

### How to Install
1. **Download**: Secure the latest installer (e.g., `ZapBill-POS-Setup-2.0.0.exe`) from the official release source.
2. **Install**: Run the installer executable. The application will elegantly install to your local machine (typically within `AppData/Local/Programs/ZapBill`).
3. **Run**: Launch "ZapBill POS" explicitly from your desktop shortcut or start menu.

### Offline Capabilities
- **Uninterrupted Operations**: Core capabilities like billing, configuring local menus, standard KOT processing, and viewing local reports operate completely free from cloud reliance. Core operations execute instantly through the localized database.
- **Printers**: The system interfaces directly with your local USB/Network ESC/POS printers over your local machine or internal network structure.

## 🔄 Updates & Versioning

### How Updates Work
- The application integrates a background auto-updater mechanism (built upon `electron-updater`).
- Upon connection to the internet, your system naturally detects updates and provides an update prompt.
- **Manual Update Check**: Merely downloading and running the latest setup wizard safely overwrites existing executable files while naturally ensuring your inner database remains **entirely intact**.

### Data Persistence Principles
- Master databases alongside error logs and precise application configurations strictly reside inside your operating system's localized user data directory:
  - **Windows Reference Path**: `C:\Users\<YourUser>\AppData\Roaming\ZapBill POS`
- **Critical Guarantee**: Installing fresh patches/updates (or issuing a generic uninstallation via control panels) will **NOT** forcibly scrub this directory, heavily guaranteeing menu logic, configuration templates, and sales histories remain impeccably secure.

## ⚙️ Advanced Configuration

### Database Storage Path
Our engineering aligns database storage to reside cleanly inside standard `AppData` folders, actively optimizing runtime security loops and basic OS-level protections against unprivileged overrides.

**Manual Override Guidelines (Targeted for Advanced Users Context):**
Operating logic currently confines database routing intrinsically within `electron/database/db.js`. To architect a customized routing format:
1. *Future Roadmap Provision*: We look towards implementing a localized UI or `config.json` drop-in module beside the runtime binary.
2. **Immediate Backup Steps**: Ensure physical safety copying of the `restaurant_pos.db` artifact safely from the aforementioned central configuration directory.

## 👨‍💻 For Developers / Deployment

### Building the Installer Locally
If your aim is compiling raw assets to construct standard Windows installers (`.exe`) meant for internal staging or mass deployment protocols:

1. **Install Environment Node Dependencies**:
   ```bash
   npm install
   ```

2. **Trigger Electron Build Compilations**:
   ```bash
   npm run build:win
   ```
   *Execution successfully loops Vite for compiled frontend assets securely packaged alongside the integrated electron-build layer. Outputs routinely populate within the local `dist-electron` directory.*

### Engaging Development Mode
Whenever modifying local software structures for granular visual reviews on-the-fly:
```bash
npm run dev
```
*(Triggers the automated concurrent loading of the Vite hot-reloading dev server simultaneously alongside your initialized native Electron framework wrapper).*

## 📄 License
This application acts as proprietary software. All inherent legal rights fundamentally reserved. 
*(Consult the integrated [LICENSE](./LICENSE) directory text for expanded contextual particulars).*
