# ZapBill POS - Offline Restaurant Management System

## Overview
ZapBill POS is an offline-first desktop application for restaurant management. It allows you to manage orders, menu items, inventory, and reports without needing an active internet connection.

## Installation & Offline Usage

### How to Install
1. **Download**: Get the installer (e.g., `ZapBill-POS-Setup-1.0.0.exe`) from the provided release source.
2. **Install**: Double-click the installer. The application will install to your local machine (typically in `AppData/Local/Programs/ZapBill`).
3. **Run**: Launch "ZapBill POS" from your desktop or start menu.

### Offline Capabilities
- **Database**: The application uses a local SQLite database stored on your computer. No cloud connection is required for core operations (billing, menu, reports).
- **Printers**: Works directly with local USB/Network ESC/POS printers.

## Updates & Versioning

### How Updates Work
- The application includes an auto-updater mechanism.
- If a new version is released, the app can detect it (if internet is available) and prompt to update.
- **Manual Update**: You can simply download the new installer and run it. It will overwrite the application files but **keep your database and settings intact**.

### Data Persistence
- User data (database, logs, config) is stored in your operating system's user data directory:
  - **Windows**: `C:\Users\<YourUser>\AppData\Roaming\ZapBill POS`
- **Important**: Installing a new version (or even uninstalling usually) does **NOT** begin by deleting this folder, so your menu and sales history remain safe.

## Advanced Configuration

### Database Storage Path
By default, the database is stored in the standard application data folder for security and reliability.

**Manual Override (Advanced Users Only):**
Currently, the database path is managed by the application internals (`electron/database/db.js`). To support a custom path:
1. *Future Feature*: A "Data Path" setting can be added to the login screen or a config file (e.g., `config.json`) placed next to the executable.
2. **Backup**: You can manually backup the `restaurant_pos.db` file from the AppData folder mentioned above.

## For Developers / Deployment

### Building the Installer
To generate the installer (`.exe`) for distribution:

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Build**:
   ```bash
   npm run build:win
   ```
   This will create the installer in the `dist-electron` folder.

### License
This project is proprietary software. All rights reserved. 
(See [LICENSE](./LICENSE) file for details).
