Set WshShell = CreateObject("WScript.Shell")
' Start Vite dev server silently (port 5180)
WshShell.Run "cmd.exe /c npx vite --port 5180", 0, False
' Wait 3 seconds for Vite to start
WScript.Sleep 3000
' Start Electron app silently
WshShell.Run "cmd.exe /c npm run electron:dev", 0, False
