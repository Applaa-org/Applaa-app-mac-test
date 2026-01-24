# Clear Browser Tabs - Safe Cleanup Script
# This script safely clears old browser tabs from the database

Write-Host "🧹 Applaa Browser Tabs Cleanup Script" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Database path
$dbPath = "$env:APPDATA\applaa-builder-v1\applaa.db"

# Check if database exists
if (-not (Test-Path $dbPath)) {
    Write-Host "❌ Database not found at: $dbPath" -ForegroundColor Red
    Write-Host "The database will be created fresh when you start the app." -ForegroundColor Yellow
    exit 0
}

Write-Host "📍 Database found: $dbPath" -ForegroundColor Green

# Check if app is running
$appProcess = Get-Process -Name "applaa-builder-v1" -ErrorAction SilentlyContinue
if ($appProcess) {
    Write-Host "⚠️  Applaa is currently running. Please close it first." -ForegroundColor Yellow
    Write-Host "   Process ID: $($appProcess.Id)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Would you like me to close it for you? (Y/N): " -NoNewline -ForegroundColor Yellow
    $response = Read-Host
    
    if ($response -eq 'Y' -or $response -eq 'y') {
        Write-Host "🛑 Stopping Applaa..." -ForegroundColor Yellow
        Stop-Process -Id $appProcess.Id -Force
        Start-Sleep -Seconds 2
        Write-Host "✅ Applaa stopped" -ForegroundColor Green
    }
    else {
        Write-Host "❌ Please close Applaa manually and run this script again." -ForegroundColor Red
        exit 1
    }
}

# Install sqlite3 module if not available
Write-Host "📦 Checking for PSSQLite module..." -ForegroundColor Cyan
if (-not (Get-Module -ListAvailable -Name PSSQLite)) {
    Write-Host "Installing PSSQLite module..." -ForegroundColor Yellow
    Install-Module -Name PSSQLite -Force -Scope CurrentUser -AllowClobber
    Write-Host "✅ PSSQLite installed" -ForegroundColor Green
}

Import-Module PSSQLite

try {
    # Count existing tabs
    Write-Host "🔍 Checking existing tabs..." -ForegroundColor Cyan
    $countQuery = "SELECT COUNT(*) as count FROM browser_tabs"
    $count = Invoke-SqliteQuery -DataSource $dbPath -Query $countQuery
    $tabCount = $count.count
    
    if ($tabCount -eq 0) {
        Write-Host "✅ No browser tabs found. Database is already clean!" -ForegroundColor Green
        exit 0
    }
    
    Write-Host "📊 Found $tabCount browser tab(s) in database" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "⚠️  This will DELETE all browser tabs. Continue? (Y/N): " -NoNewline -ForegroundColor Yellow
    $confirm = Read-Host
    
    if ($confirm -ne 'Y' -and $confirm -ne 'y') {
        Write-Host "❌ Cleanup cancelled." -ForegroundColor Red
        exit 0
    }
    
    # Delete tabs
    Write-Host "🗑️  Deleting browser tabs..." -ForegroundColor Yellow
    $deleteQuery = "DELETE FROM browser_tabs"
    Invoke-SqliteQuery -DataSource $dbPath -Query $deleteQuery
    
    Write-Host "✅ Successfully cleared $tabCount browser tab(s)!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🎉 Database cleanup complete!" -ForegroundColor Green
    Write-Host "   You can now start Applaa with a fresh browser state." -ForegroundColor Gray
    
}
catch {
    Write-Host "❌ Error during cleanup: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Alternative: You can manually delete the database file:" -ForegroundColor Yellow
    Write-Host "   $dbPath" -ForegroundColor Gray
    Write-Host "   The app will create a fresh database on next start." -ForegroundColor Gray
    exit 1
}

Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
