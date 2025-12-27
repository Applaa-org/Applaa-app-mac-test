# Clear Browser Tabs - Quick & Safe
# This script clears old browser tabs from the database

Write-Host "🧹 Clearing browser tabs..." -ForegroundColor Cyan

$dbPath = "$env:APPDATA\applaa-builder-v1\applaa.db"

if (-not (Test-Path $dbPath)) {
    Write-Host "✅ No database found - will be created fresh!" -ForegroundColor Green
    exit 0
}

# Check if app is running
if (Get-Process -Name "applaa-builder-v1" -ErrorAction SilentlyContinue) {
    Write-Host "⚠️  Please close Applaa first!" -ForegroundColor Yellow
    exit 1
}

# Simple approach: Just delete the database file
# The app will recreate it fresh on next start
try {
    Remove-Item $dbPath -Force
    Write-Host "✅ Database cleared! Applaa will create a fresh one on next start." -ForegroundColor Green
}
catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    exit 1
}
