Write-Host "1. Cleaning build folders..."
Remove-Item -Recurse -Force dist-electron -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force dist -ErrorAction SilentlyContinue

Write-Host "2. Cleaning Electron caches..."
Remove-Item -Recurse -Force "$env:LOCALAPPDATA\electron\Cache" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$env:LOCALAPPDATA\electron-builder\Cache" -ErrorAction SilentlyContinue

Write-Host "3. Reinstalling Electron..."
npm uninstall electron
npm install electron --save-dev

Write-Host "4. Building Project..."
npm run build:win
