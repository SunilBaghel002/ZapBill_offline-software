# How to Release Your Software on GitHub (Free)

This guide explains how to build your ZapBill POS installer and host it on GitHub so clients can download it for free.

## Prerequisites
- A GitHub account.
- This project must be uploaded to a GitHub repository.

## Step 1: Build the Installer
First, you need to generate the `.exe` file on your computer.

1. Open your terminal (VS Code terminal is fine).
2. Run the build command:
   ```bash
   npm run build:win
   ```
3. Wait for the process to finish. It may take a few minutes.
4. Once done, locate the installer file:
   - Go to your project folder: `ZapBill_offline-software`
   - Open the `dist-electron` folder.
   - Look for a file named roughly `ZapBill POS Setup 1.0.0.exe`.

## Step 2: Create a Release on GitHub
Now you will upload this file to GitHub.

1. **Open GitHub**: Go to your repository page on GitHub.com.
2. **Go to Releases**:
   - Look at the right sidebar (or the "Actions" tab area depending on layout).
   - Click on **"Releases"** (or "Create a new release").
3. **Draft a New Release**:
   - Click the **"Draft a new release"** button.
4. **Choose a Tag**:
   - Click "Choose a tag".
   - Type a version number, e.g., `v1.0.0`.
   - Click "Create new tag: v1.0.0".
5. **Fill in Details**:
   - **Release title**: Enter a name, e.g., "ZapBill POS v1.0.0".
   - **Description**: Describe changes (e.g., "Initial release with offline database support").
6. **Upload the Installer**:
   - Drag and drop your `.exe` file (from Step 1) into the box that says "Attach binaries by dropping them here or selecting them".
   - **Wait** for the upload to finish (the progress bar must complete).
7. **Publish**:
   - Click the green **"Publish release"** button.

## Step 3: Share with Clients
1. Once published, you will be redirected to the Release page.
2. Scroll down to the **"Assets"** section.
3. You will see your `.exe` file there.
4. **Right-click** the file and copy the link address.
5. Send this link to your clients. They can download and install it directly!

## Future Updates
When you make changes to the code:
1. Increase the version number in `package.json` (e.g., to `1.0.1`).
2. Run `npm run build:win` again.
3. Create a new Release on GitHub (e.g., `v1.0.1`).
4. Upload the new `.exe`.

## Troubleshooting Build Errors

### "Cannot create symbolic link" or "Privilege not held"
If you see an error like `Cannot create symbolic link` while building:

1. **Run as Administrator**:
   - Close your current terminal/VS Code.
   - Right-click VS Code and select **"Run as administrator"**.
   - Try the `npm run build:win` command again.

2. **Enable Developer Mode**:
   - Go to Windows Settings -> **System** -> **For developers**.
   - Turn on **"Developer Mode"**.
   - This allows the creation of symbolic links without full admin rights.

