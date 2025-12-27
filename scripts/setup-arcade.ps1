# Setup MakeCode Arcade for Applaa
# This script downloads and builds MakeCode Arcade locally

Write-Host "Setting up MakeCode Arcade for Applaa..." -ForegroundColor Green

# Create makecode directory
$makeCodeDir = "C:\Users\rahul\Documents\Applaa_Project\makecode"
if (-not (Test-Path $makeCodeDir)) {
    New-Item -ItemType Directory -Path $makeCodeDir
    Write-Host "Created makecode directory" -ForegroundColor Green
}

Set-Location $makeCodeDir

# Clone PXT (core framework)
Write-Host "Cloning PXT core..." -ForegroundColor Yellow
if (-not (Test-Path "pxt")) {
    git clone https://github.com/microsoft/pxt.git
    Set-Location pxt
    npm install
    npm run build
    Set-Location ..
    Write-Host "PXT core installed" -ForegroundColor Green
}
else {
    Write-Host "PXT already exists, skipping..." -ForegroundColor Yellow
}

# Clone PXT-Arcade
Write-Host "Cloning PXT-Arcade..." -ForegroundColor Yellow
if (-not (Test-Path "pxt-arcade")) {
    git clone https://github.com/microsoft/pxt-arcade.git
    Set-Location pxt-arcade
    npm install
    Write-Host "PXT-Arcade cloned" -ForegroundColor Green
}
else {
    Write-Host "PXT-Arcade already exists, skipping..." -ForegroundColor Yellow
    Set-Location pxt-arcade
}

# Link to local PXT
Write-Host "Linking to local PXT..." -ForegroundColor Yellow
npm link ../pxt

# Build Arcade
Write-Host "Building Arcade editor..." -ForegroundColor Yellow
npm run build

Write-Host ""
Write-Host "Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Run: cd $makeCodeDir\pxt-arcade" -ForegroundColor White
Write-Host "2. Run: pxt serve" -ForegroundColor White
Write-Host "3. Open: http://localhost:3232" -ForegroundColor White
Write-Host ""
Write-Host "The Arcade editor will be available locally!" -ForegroundColor Green
