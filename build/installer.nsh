; Custom NSIS hooks to auto-kill running ZapBill POS before install/uninstall
; This eliminates the "ZapBill POS cannot be closed. Please close it manually" error.

!macro customInit
  ; Kill the running process before install begins
  nsExec::ExecToLog 'taskkill /F /IM "ZapBill POS.exe"'
  ; Small delay to allow the process to fully terminate and release file locks
  Sleep 1000
!macroend

!macro customUnInit
  ; Kill the running process before uninstall begins
  nsExec::ExecToLog 'taskkill /F /IM "ZapBill POS.exe"'
  Sleep 1000
!macroend
