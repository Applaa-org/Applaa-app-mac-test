# 🍊 Applaa Merge Validation Script - Comprehensive validation after merge
# This script thoroughly validates that all Applaa customizations are properly in place

param(
    [switch]$Verbose,
    [switch]$FixIssues
)

# Set strict error handling  
$ErrorActionPreference = "Stop"

Write-Host "🍊 Applaa Merge Validation Script" -ForegroundColor DarkYellow
Write-Host "=================================" -ForegroundColor DarkYellow

$validationResults = @{
    TotalChecks = 0
    PassedChecks = 0
    FailedChecks = 0
    WarningChecks = 0
    Issues = @()
    Fixes = @()
}

function Test-ApplaaCheck {
    param(
        [string]$Name,
        [scriptblock]$Check,
        [scriptblock]$Fix = $null,
        [string]$Severity = "Error"  # Error, Warning, Info
    )
    
    $validationResults.TotalChecks++
    
    try {
        $result = & $Check
        if ($result -eq $true) {
            $validationResults.PassedChecks++
            Write-Host "  ✅ $Name" -ForegroundColor Green
            return $true
        } else {
            if ($Severity -eq "Warning") {
                $validationResults.WarningChecks++
                Write-Host "  ⚠️  $Name" -ForegroundColor Yellow
            } else {
                $validationResults.FailedChecks++
                Write-Host "  ❌ $Name" -ForegroundColor Red
            }
            
            $issue = @{
                Name = $Name
                Severity = $Severity
                Result = $result
                Fix = $Fix
            }
            $validationResults.Issues += $issue
            
            # Try to fix if requested and fix is available
            if ($FixIssues -and $Fix) {
                Write-Host "    🔧 Attempting to fix..." -ForegroundColor Cyan
                try {
                    $fixResult = & $Fix
                    if ($fixResult -eq $true) {
                        Write-Host "    ✅ Fixed successfully" -ForegroundColor Green
                        $validationResults.Fixes += $Name
                        return $true
                    } else {
                        Write-Host "    ❌ Fix failed: $fixResult" -ForegroundColor Red
                    }
                } catch {
                    Write-Host "    ❌ Fix error: $($_.Exception.Message)" -ForegroundColor Red
                }
            }
            
            return $false
        }
    } catch {
        $validationResults.FailedChecks++
        Write-Host "  ❌ $Name (Exception: $($_.Exception.Message))" -ForegroundColor Red
        return $false
    }
}

Write-Host "🔍 Running comprehensive validation checks..." -ForegroundColor Cyan
Write-Host ""

# 1. Core File Structure Validation
Write-Host "📁 File Structure Checks:" -ForegroundColor White

Test-ApplaaCheck "Package.json exists" {
    Test-Path "package.json"
}

Test-ApplaaCheck "Source directory exists" {
    Test-Path "src"
}

Test-ApplaaCheck "Assets directory exists" {
    Test-Path "assets"
}

Test-ApplaaCheck "Expo templates directory exists" {
    Test-Path "expo-templates"
} {
    if (Test-Path "$PSScriptRoot/expo-templates") {
        Copy-Item "$PSScriptRoot/expo-templates" . -Recurse -Force
        return $true
    }
    return "Could not restore expo-templates"
}

# 2. Applaa Branding Validation
Write-Host ""
Write-Host "🍊 Branding Checks:" -ForegroundColor White

Test-ApplaaCheck "Package.json has Applaa name" {
    if (Test-Path "package.json") {
        $package = Get-Content "package.json" | ConvertFrom-Json
        return $package.name -eq "applaa"
    }
    return $false
} {
    if (Test-Path "package.json") {
        $package = Get-Content "package.json" | ConvertFrom-Json
        $package.name = "applaa"
        $package.productName = "Applaa"
        $package | ConvertTo-Json -Depth 10 | Set-Content "package.json"
        return $true
    }
    return "Package.json not found"
}

Test-ApplaaCheck "Package.json has Applaa productName" {
    if (Test-Path "package.json") {
        $package = Get-Content "package.json" | ConvertFrom-Json
        return $package.productName -eq "Applaa"
    }
    return $false
}

Test-ApplaaCheck "HTML title is Applaa" {
    if (Test-Path "index.html") {
        $content = Get-Content "index.html" -Raw
        return $content -match "<title>Applaa</title>"
    }
    return $false
} {
    if (Test-Path "index.html") {
        $content = Get-Content "index.html" -Raw
        $content = $content -replace "<title>.*</title>", "<title>Applaa</title>"
        Set-Content "index.html" -Value $content -NoNewline
        return $true
    }
    return "index.html not found"
}

# 3. Asset Validation
Write-Host ""
Write-Host "🎨 Asset Checks:" -ForegroundColor White

Test-ApplaaCheck "Applaa logo exists" {
    Test-Path "assets/applaa-logo.svg"
} {
    if (Test-Path "$PSScriptRoot/assets/applaa-logo.svg") {
        if (!(Test-Path "assets")) { New-Item -ItemType Directory -Path "assets" -Force | Out-Null }
        Copy-Item "$PSScriptRoot/assets/applaa-logo.svg" "assets/applaa-logo.svg" -Force
        return $true
    }
    return "Source logo not found in merge-applaa"
}

Test-ApplaaCheck "Application icon PNG exists" {
    Test-Path "assets/icon/logo.png"
} {
    if (Test-Path "$PSScriptRoot/assets/logo.png") {
        if (!(Test-Path "assets/icon")) { New-Item -ItemType Directory -Path "assets/icon" -Force | Out-Null }
        Copy-Item "$PSScriptRoot/assets/logo.png" "assets/icon/logo.png" -Force
        return $true
    }
    return "Source icon not found in merge-applaa"
}

Test-ApplaaCheck "Application icon ICO exists" {
    Test-Path "assets/icon/logo.ico"
} {
    if (Test-Path "$PSScriptRoot/assets/logo.ico") {
        if (!(Test-Path "assets/icon")) { New-Item -ItemType Directory -Path "assets/icon" -Force | Out-Null }
        Copy-Item "$PSScriptRoot/assets/logo.ico" "assets/icon/logo.ico" -Force
        return $true
    }
    return "Source icon not found in merge-applaa"
}

# 4. Critical Component Validation
Write-Host ""
Write-Host "🔧 Component Checks:" -ForegroundColor White

Test-ApplaaCheck "SimpleMobilePreview component exists" {
    Test-Path "src/components/expo/SimpleMobilePreview.tsx"
} {
    if (Test-Path "$PSScriptRoot/src/components/expo/SimpleMobilePreview.tsx") {
        if (!(Test-Path "src/components/expo")) { New-Item -ItemType Directory -Path "src/components/expo" -Force | Out-Null }
        Copy-Item "$PSScriptRoot/src/components/expo/SimpleMobilePreview.tsx" "src/components/expo/SimpleMobilePreview.tsx" -Force
        return $true
    }
    return "Source component not found in merge-applaa"
}

Test-ApplaaCheck "useStreamChat hook has auto-refresh" {
    if (Test-Path "src/hooks/useStreamChat.ts") {
        $content = Get-Content "src/hooks/useStreamChat.ts" -Raw
        return $content -match "refreshAppIframe\(\)"
    }
    return $false
} {
    if (Test-Path "$PSScriptRoot/src/hooks/useStreamChat.ts") {
        Copy-Item "$PSScriptRoot/src/hooks/useStreamChat.ts" "src/hooks/useStreamChat.ts" -Force
        return $true
    }
    return "Source hook not found in merge-applaa"
}

Test-ApplaaCheck "MessagesList hides Dyad banners" {
    if (Test-Path "src/components/chat/MessagesList.tsx") {
        $content = Get-Content "src/components/chat/MessagesList.tsx" -Raw
        return $content -match "// import \{ PromoMessage \} from"
    }
    return $false
} {
    if (Test-Path "$PSScriptRoot/src/components/chat/MessagesList.tsx") {
        Copy-Item "$PSScriptRoot/src/components/chat/MessagesList.tsx" "src/components/chat/MessagesList.tsx" -Force
        return $true
    }
    return "Source component not found in merge-applaa"
}

# 5. System Prompt Validation
Write-Host ""
Write-Host "📝 System Prompt Checks:" -ForegroundColor White

Test-ApplaaCheck "Expo system prompt has routing fixes" {
    if (Test-Path "src/prompts/expo_system_prompt.ts") {
        $content = Get-Content "src/prompts/expo_system_prompt.ts" -Raw
        return $content -match "Prevent.*Unmatched Route.*Errors"
    }
    return $false
} {
    if (Test-Path "$PSScriptRoot/prompts/expo_system_prompt.ts") {
        Copy-Item "$PSScriptRoot/prompts/expo_system_prompt.ts" "src/prompts/expo_system_prompt.ts" -Force
        return $true
    }
    return "Source prompt not found in merge-applaa"
}

Test-ApplaaCheck "Expo system prompt has TypeScript fixes" {
    if (Test-Path "src/prompts/expo_system_prompt.ts") {
        $content = Get-Content "src/prompts/expo_system_prompt.ts" -Raw
        return $content -match "Icon Import Rules.*avoid build errors"
    }
    return $false
}

Test-ApplaaCheck "System prompts mention Applaa" {
    if (Test-Path "src/prompts/expo_system_prompt.ts") {
        $content = Get-Content "src/prompts/expo_system_prompt.ts" -Raw
        return $content -match "Applaa"
    }
    return $false
}

# 6. Color Theme Validation
Write-Host ""
Write-Host "🎨 Color Theme Checks:" -ForegroundColor White

Test-ApplaaCheck "CSS has Applaa orange primary color" {
    if (Test-Path "src/styles/globals.css") {
        $content = Get-Content "src/styles/globals.css" -Raw
        return $content -match "--primary:.*oklch\(0\.65 0\.18 45\)"
    }
    return $false
} {
    if (Test-Path "src/styles/globals.css") {
        $content = Get-Content "src/styles/globals.css" -Raw
        $content = $content -replace "--primary:.*", "--primary: oklch(0.65 0.18 45); /* Applaa Orange */"
        Set-Content "src/styles/globals.css" -Value $content -NoNewline
        return $true
    }
    return "globals.css not found"
}

Test-ApplaaCheck "CSS has Applaa green secondary color" {
    if (Test-Path "src/styles/globals.css") {
        $content = Get-Content "src/styles/globals.css" -Raw
        return $content -match "--secondary-brand:.*oklch\(0\.55 0\.15 140\)"
    }
    return $false
} {
    if (Test-Path "src/styles/globals.css") {
        $content = Get-Content "src/styles/globals.css" -Raw
        $content = $content -replace "--secondary-brand:.*", "--secondary-brand: oklch(0.55 0.15 140); /* Applaa Green */"
        Set-Content "src/styles/globals.css" -Value $content -NoNewline
        return $true
    }
    return "globals.css not found"
}

# 7. Dependency Validation
Write-Host ""
Write-Host "📦 Dependency Checks:" -ForegroundColor White

Test-ApplaaCheck "Node modules directory exists" {
    Test-Path "node_modules"
} -Severity "Warning"

Test-ApplaaCheck "Package-lock.json exists" {
    Test-Path "package-lock.json"
} -Severity "Warning"

# 8. Template Validation
Write-Host ""
Write-Host "📱 Mobile Template Checks:" -ForegroundColor White

Test-ApplaaCheck "Expo base master template exists" {
    Test-Path "expo-templates/expo-base-master"
} {
    if (Test-Path "$PSScriptRoot/expo-templates") {
        Copy-Item "$PSScriptRoot/expo-templates" . -Recurse -Force
        return $true
    }
    return "Source templates not found in merge-applaa"
}

Test-ApplaaCheck "Mobile template icon exists" {
    Test-Path "assets/mobile-template-icon.svg"
} {
    if (Test-Path "$PSScriptRoot/assets/mobile-template-icon.svg") {
        Copy-Item "$PSScriptRoot/assets/mobile-template-icon.svg" "assets/mobile-template-icon.svg" -Force
        return $true
    }
    return "Source icon not found in merge-applaa"
}

# Generate validation report
Write-Host ""
Write-Host "📊 Validation Summary:" -ForegroundColor White
Write-Host "======================" -ForegroundColor White

$passRate = if ($validationResults.TotalChecks -gt 0) { 
    [Math]::Round(($validationResults.PassedChecks / $validationResults.TotalChecks) * 100, 1) 
} else { 0 }

Write-Host "Total Checks: $($validationResults.TotalChecks)" -ForegroundColor Gray
Write-Host "✅ Passed: $($validationResults.PassedChecks)" -ForegroundColor Green
Write-Host "❌ Failed: $($validationResults.FailedChecks)" -ForegroundColor Red
Write-Host "⚠️  Warnings: $($validationResults.WarningChecks)" -ForegroundColor Yellow
Write-Host "📈 Pass Rate: $passRate%" -ForegroundColor $(if ($passRate -ge 90) { "Green" } elseif ($passRate -ge 75) { "Yellow" } else { "Red" })

if ($validationResults.Fixes.Count -gt 0) {
    Write-Host ""
    Write-Host "🔧 Fixes Applied:" -ForegroundColor Cyan
    foreach ($fix in $validationResults.Fixes) {
        Write-Host "  ✅ $fix" -ForegroundColor Green
    }
}

if ($validationResults.FailedChecks -gt 0) {
    Write-Host ""
    Write-Host "❌ Issues Found:" -ForegroundColor Red
    foreach ($issue in $validationResults.Issues | Where-Object { $_.Severity -eq "Error" }) {
        Write-Host "  • $($issue.Name)" -ForegroundColor Red
        if ($issue.Result -ne $false -and $issue.Result -ne $true) {
            Write-Host "    Details: $($issue.Result)" -ForegroundColor Gray
        }
    }
}

if ($validationResults.WarningChecks -gt 0) {
    Write-Host ""
    Write-Host "⚠️  Warnings:" -ForegroundColor Yellow
    foreach ($issue in $validationResults.Issues | Where-Object { $_.Severity -eq "Warning" }) {
        Write-Host "  • $($issue.Name)" -ForegroundColor Yellow
        if ($issue.Result -ne $false -and $issue.Result -ne $true) {
            Write-Host "    Details: $($issue.Result)" -ForegroundColor Gray
        }
    }
}

Write-Host ""
if ($validationResults.FailedChecks -eq 0) {
    Write-Host "🎉 All critical checks passed! Applaa merge is successful!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🚀 Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Run 'npm install' to ensure dependencies are up to date" -ForegroundColor White
    Write-Host "  2. Run 'npm start' to test the application" -ForegroundColor White
    Write-Host "  3. Test mobile preview functionality" -ForegroundColor White
    Write-Host "  4. Verify all Applaa features work correctly" -ForegroundColor White
} else {
    Write-Host "⚠️  Some checks failed. Consider running with -FixIssues to attempt automatic fixes." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Manual fixes may be required for:" -ForegroundColor Red
    foreach ($issue in $validationResults.Issues | Where-Object { $_.Severity -eq "Error" -and !$_.Fix }) {
        Write-Host "  • $($issue.Name)" -ForegroundColor Red
    }
}

return $validationResults
