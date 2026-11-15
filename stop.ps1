# Stops everything started by dev.ps1.
$root = $PSScriptRoot
$pidFile = "$root\.dev-pids"

# 1) close the two windows and everything they started
if (Test-Path $pidFile) {
  foreach ($id in Get-Content $pidFile) {
    if ($id) { taskkill /PID $id /T /F 2>$null | Out-Null }
  }
  Remove-Item $pidFile -Force
}

# 2) safety net: anything still listening on the two ports
foreach ($port in 8000, 5173) {
  Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
}

Write-Host 'Stopped backend and front end.'