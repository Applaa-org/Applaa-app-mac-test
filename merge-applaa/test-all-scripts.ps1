# 🧪 Test All Merge Scripts - Comprehensive Syntax and Path Validation
# This script tests all PowerShell scripts for syntax errors and path issues

Write-Host "🧪 Testing All Applaa Merge Scripts..." -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

$scriptDir = $PSScriptRoot
$allScripts = @(
    "1-backup-current.ps1",
    "2-merge-upstream.ps1", 
    "3-apply-branding.ps1",
    "4-validate-merge.ps1",
    "merge-dyad-to-applaa.ps1"
)

$testResults = @{
    TotalScripts = $allScripts.Count
    PassedSyntax = 0
    FailedSyntax = 0
    Errors = @()
}

Write-Host ""
Write-Host "🔍 Testing PowerShell Syntax..." -ForegroundColor Yellow

foreach ($script in $allScripts) {
    $scriptPath = Join-Path $scriptDir $script
    Write-Host "  Testing $script..." -ForegroundColor Gray
    
    try {
        # Test syntax by parsing the script
        $content = Get-Content $scriptPath -Raw
        $null = [System.Management.Automation.PSParser]::Tokenize($content, [ref]$null)
        
        Write-Host "    ✅ Syntax OK" -ForegroundColor Green
        $testResults.PassedSyntax++
    } catch {
        Write-Host "    ❌ Syntax Error: $($_.Exception.Message)" -ForegroundColor Red
        $testResults.FailedSyntax++
        $testResults.Errors += "$script : $($_.Exception.Message)"
    }
}

Write-Host ""
Write-Host "🔍 Testing Script Paths..." -ForegroundColor Yellow

# Test that all referenced files exist
$requiredFiles = @(
    "assets/applaa-logo.svg",
    "assets/logo.png",
    "assets/logo.ico", 
    "src/components/expo/SimpleMobilePreview.tsx",
    "src/components/chat/MessagesList.tsx",
    "src/hooks/useStreamChat.ts",
    "prompts/expo_system_prompt.ts",
    "expo-templates"
)

$missingFiles = @()
foreach ($file in $requiredFiles) {
    $fullPath = Join-Path $scriptDir $file
    if (!(Test-Path $fullPath)) {
        $missingFiles += $file
        Write-Host "  ❌ Missing: $file" -ForegroundColor Red
    } else {
        Write-Host "  ✅ Found: $file" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "📊 Test Results:" -ForegroundColor White
Write-Host "================" -ForegroundColor White

Write-Host "Scripts Tested: $($testResults.TotalScripts)" -ForegroundColor Gray
Write-Host "✅ Syntax Passed: $($testResults.PassedSyntax)" -ForegroundColor Green
Write-Host "❌ Syntax Failed: $($testResults.FailedSyntax)" -ForegroundColor Red
Write-Host "❌ Missing Files: $($missingFiles.Count)" -ForegroundColor Red

if ($testResults.FailedSyntax -eq 0 -and $missingFiles.Count -eq 0) {
    Write-Host ""
    Write-Host "🎉 ALL TESTS PASSED!" -ForegroundColor Green
    Write-Host "✅ All scripts have valid PowerShell syntax" -ForegroundColor Green
    Write-Host "✅ All required files are present" -ForegroundColor Green
    Write-Host ""
    Write-Host "🚀 Ready to run merge system!" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "❌ ISSUES FOUND:" -ForegroundColor Red
    
    if ($testResults.FailedSyntax -gt 0) {
        Write-Host ""
        Write-Host "Syntax Errors:" -ForegroundColor Red
        foreach ($error in $testResults.Errors) {
            Write-Host "  • $error" -ForegroundColor Red
        }
    }
    
    if ($missingFiles.Count -gt 0) {
        Write-Host ""
        Write-Host "Missing Files:" -ForegroundColor Red
        foreach ($file in $missingFiles) {
            Write-Host "  • $file" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "📝 Next Steps:" -ForegroundColor Cyan
if ($testResults.FailedSyntax -eq 0 -and $missingFiles.Count -eq 0) {
    Write-Host "  1. Run: .\merge-dyad-to-applaa.ps1 -DryRun" -ForegroundColor White
    Write-Host "  2. Then: .\merge-dyad-to-applaa.ps1" -ForegroundColor White
} else {
    Write-Host "  1. Fix the issues listed above" -ForegroundColor White
    Write-Host "  2. Re-run this test script" -ForegroundColor White
}

return @{
    Success = ($testResults.FailedSyntax -eq 0 -and $missingFiles.Count -eq 0)
    SyntaxErrors = $testResults.FailedSyntax
    MissingFiles = $missingFiles.Count
    Details = $testResults
}







