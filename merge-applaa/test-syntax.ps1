# Quick syntax test for merge-dyad-to-applaa.ps1
Write-Host "🔍 Testing PowerShell syntax..." -ForegroundColor Cyan

try {
    # Test if the script can be parsed without executing
    $null = [System.Management.Automation.PSParser]::Tokenize(
        (Get-Content ".\merge-dyad-to-applaa.ps1" -Raw), 
        [ref]$null
    )
    Write-Host "✅ PowerShell syntax is valid!" -ForegroundColor Green
} catch {
    Write-Host "❌ Syntax error found:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

Write-Host ""
Write-Host "🎯 To test the merge system:" -ForegroundColor Cyan
Write-Host "1. First run: .\merge-dyad-to-applaa.ps1 -DryRun" -ForegroundColor White
Write-Host "2. Then run: .\merge-dyad-to-applaa.ps1" -ForegroundColor White







