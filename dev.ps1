# Starts the backend and the front end, each in its own window.
$root = $PSScriptRoot

$backend = Start-Process powershell -PassThru -ArgumentList '-NoExit', '-Command', "cd '$root\backend'; .\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000"
$front   = Start-Process powershell -PassThru -ArgumentList '-NoExit', '-Command', "cd '$root'; npm run dev"

# remember the windows so stop.ps1 can close them
"$($backend.Id)`n$($front.Id)" | Set-Content "$root\.dev-pids"

Write-Host 'Backend: http://localhost:8000/health'
Write-Host 'Front end: http://localhost:5173'
Write-Host 'To stop everything: powershell -ExecutionPolicy Bypass -File .\stop.ps1'