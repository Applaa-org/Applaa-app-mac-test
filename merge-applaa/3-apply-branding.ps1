# 🍊 Applaa Branding Application Script - Apply all Applaa customizations
# This script applies comprehensive Applaa branding and customizations after upstream merge

param(
    [switch]$Verbose,
    [switch]$SkipAssets
)

# Set strict error handling
$ErrorActionPreference = "Stop"

Write-Host "🍊 Applaa Branding Application Script" -ForegroundColor DarkYellow
Write-Host "====================================" -ForegroundColor DarkYellow

# Text replacements to apply throughout the codebase
$textReplacements = @(
    @{
        From = "Dyad"
        To = "Applaa"
        Description = "Main branding replacement"
        Files = @(
            "src/**/*.ts",
            "src/**/*.tsx", 
            "src/**/*.js",
            "src/**/*.jsx",
            "index.html",
            "README.md"
        )
        Exceptions = @(
            "src/components/chat/DyadAddDependency.tsx",  # Keep component name for compatibility
            "src/components/chat/DyadMarkdownParser.tsx", # Keep component name for compatibility
            "merge-applaa/**/*"  # Don't modify merge scripts
        )
    },
    @{
        From = "dyad"
        To = "applaa" 
        Description = "Lowercase branding replacement"
        Files = @(
            "src/**/*.ts",
            "src/**/*.tsx",
            "index.html"
        )
        Exceptions = @(
            "merge-applaa/**/*",
            "**/*dyad*"  # Don't modify files with dyad in the name
        )
    },
    @{
        From = '"Ask Dyad to build'
        To = '"Ask Applaa to build'
        Description = "Chat input placeholder text"
        Files = @("src/**/*.tsx")
    },
    @{
        From = "Turbo Edits"
        To = "Spark Edits" 
        Description = "Feature rebranding"
        Files = @("src/**/*.tsx", "src/**/*.ts")
    },
    @{
        From = "Smart Context"
        To = "Spark Context"
        Description = "Feature rebranding" 
        Files = @("src/**/*.tsx", "src/**/*.ts")
    },
    @{
        From = "Get Dyad Pro"
        To = "Get Applaa Pro"
        Description = "Pro mode branding"
        Files = @("src/**/*.tsx")
    }
)

# CSS color theme replacements
$cssReplacements = @(
    @{
        File = "src/styles/globals.css"
        Replacements = @(
            @{
                From = "--primary:.*"
                To = "--primary: oklch(0.65 0.18 45); /* Applaa Orange */"
                IsRegex = $true
            },
            @{
                From = "--secondary-brand:.*"
                To = "--secondary-brand: oklch(0.55 0.15 140); /* Applaa Green */"
                IsRegex = $true
            },
            @{
                From = "--accent:.*"
                To = "--accent: oklch(0.55 0.15 140); /* Applaa Green */"
                IsRegex = $true
            }
        )
    }
)

# Asset files to ensure are in place
$requiredAssets = @(
    @{
        Source = "$PSScriptRoot/assets/applaa-logo.svg"
        Dest = "assets/applaa-logo.svg"
        Description = "Main Applaa logo"
    },
    @{
        Source = "$PSScriptRoot/assets/logo.png"
        Dest = "assets/icon/logo.png" 
        Description = "Application icon PNG"
    },
    @{
        Source = "$PSScriptRoot/assets/logo.ico"
        Dest = "assets/icon/logo.ico"
        Description = "Application icon ICO"
    },
    @{
        Source = "$PSScriptRoot/assets/mobile-template-icon.svg"
        Dest = "assets/mobile-template-icon.svg"
        Description = "Mobile template icon"
    }
)

# Critical Applaa files to restore from merge-applaa backup
$criticalFiles = @(
    @{
        Source = "$PSScriptRoot/src/components/expo/SimpleMobilePreview.tsx"
        Dest = "src/components/expo/SimpleMobilePreview.tsx"
        Description = "Enhanced mobile preview component"
    },
    @{
        Source = "$PSScriptRoot/src/components/chat/MessagesList.tsx"
        Dest = "src/components/chat/MessagesList.tsx"
        Description = "Chat messages with hidden banners"
    },
    @{
        Source = "$PSScriptRoot/src/hooks/useStreamChat.ts"
        Dest = "src/hooks/useStreamChat.ts"
        Description = "Auto-refresh functionality"
    },
    @{
        Source = "$PSScriptRoot/expo-templates"
        Dest = "expo-templates"
        Description = "Applaa mobile app templates"
        IsDirectory = $true
    }
)

Write-Host "🎨 Applying text replacements..." -ForegroundColor Cyan

foreach ($replacement in $textReplacements) {
    Write-Host "  🔄 $($replacement.Description): '$($replacement.From)' → '$($replacement.To)'" -ForegroundColor Yellow
    
    foreach ($filePattern in $replacement.Files) {
        # Get files matching the pattern
        $files = @()
        if ($filePattern.Contains("**")) {
            # Handle glob patterns
            $basePath = $filePattern.Split("**")[0].TrimEnd("/", "\")
            if ([string]::IsNullOrEmpty($basePath)) { $basePath = "." }
            
            if (Test-Path $basePath) {
                $extension = "*"
                if ($filePattern.Contains(".")) {
                    $extension = "*" + $filePattern.Substring($filePattern.LastIndexOf("."))
                }
                $files = Get-ChildItem $basePath -Recurse -File -Filter $extension | Where-Object {
                    $_.Extension -in @(".ts", ".tsx", ".js", ".jsx", ".html", ".md", ".css")
                }
            }
        } else {
            # Handle direct file paths
            if (Test-Path $filePattern) {
                $files = @(Get-Item $filePattern)
            }
        }
        
        foreach ($file in $files) {
            # Check if file should be excluded
            $shouldSkip = $false
            foreach ($exception in $replacement.Exceptions) {
                if ($exception.Contains("**")) {
                    $exceptionBase = $exception.Split("**")[0].TrimEnd("/", "\")
                    if ($file.FullName.Contains($exceptionBase)) {
                        $shouldSkip = $true
                        break
                    }
                } elseif ($file.FullName.EndsWith($exception.Replace("/", "\"))) {
                    $shouldSkip = $true
                    break
                }
            }
            
            if ($shouldSkip) {
                if ($Verbose) {
                    Write-Host "    ⏭️  Skipped: $($file.Name)" -ForegroundColor Gray
                }
                continue
            }
            
            # Apply replacement
            $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
            if ($content -and $content.Contains($replacement.From)) {
                $newContent = $content -replace [regex]::Escape($replacement.From), $replacement.To
                Set-Content $file.FullName -Value $newContent -NoNewline
                if ($Verbose) {
                    Write-Host "    ✅ Updated: $($file.Name)" -ForegroundColor Green
                } else {
                    Write-Host "    ✅ $($file.Name)" -ForegroundColor Green
                }
            }
        }
    }
}

Write-Host ""
Write-Host "🎨 Applying CSS color theme..." -ForegroundColor Cyan

foreach ($cssFile in $cssReplacements) {
    if (Test-Path $cssFile.File) {
        $content = Get-Content $cssFile.File -Raw
        $modified = $false
        
        foreach ($replacement in $cssFile.Replacements) {
            if ($replacement.IsRegex) {
                if ($content -match $replacement.From) {
                    $content = $content -replace $replacement.From, $replacement.To
                    $modified = $true
                    Write-Host "  ✅ Applied color: $($replacement.To)" -ForegroundColor Green
                }
            } else {
                if ($content.Contains($replacement.From)) {
                    $content = $content -replace [regex]::Escape($replacement.From), $replacement.To
                    $modified = $true
                    Write-Host "  ✅ Applied: $($replacement.From) → $($replacement.To)" -ForegroundColor Green
                }
            }
        }
        
        if ($modified) {
            Set-Content $cssFile.File -Value $content -NoNewline
            Write-Host "  🎨 Updated: $($cssFile.File)" -ForegroundColor Cyan
        }
    }
}

if (!$SkipAssets) {
    Write-Host ""
    Write-Host "📦 Ensuring Applaa assets are in place..." -ForegroundColor Cyan
    
    foreach ($asset in $requiredAssets) {
        if (Test-Path $asset.Source) {
            $destDir = Split-Path $asset.Dest -Parent
            if (![string]::IsNullOrEmpty($destDir) -and !(Test-Path $destDir)) {
                New-Item -ItemType Directory -Path $destDir -Force | Out-Null
            }
            
            Copy-Item $asset.Source $asset.Dest -Force
            Write-Host "  ✅ $($asset.Description): $($asset.Dest)" -ForegroundColor Green
        } else {
            Write-Host "  ⚠️  Missing source: $($asset.Source)" -ForegroundColor Yellow
        }
    }
}

Write-Host ""
Write-Host "🔧 Restoring critical Applaa components..." -ForegroundColor Cyan

foreach ($criticalFile in $criticalFiles) {
    if (Test-Path $criticalFile.Source) {
        $destDir = Split-Path $criticalFile.Dest -Parent
        if (![string]::IsNullOrEmpty($destDir) -and !(Test-Path $destDir)) {
            New-Item -ItemType Directory -Path $destDir -Force | Out-Null
        }
        
        if ($criticalFile.IsDirectory) {
            if (Test-Path $criticalFile.Dest) {
                Remove-Item $criticalFile.Dest -Recurse -Force
            }
            Copy-Item $criticalFile.Source $criticalFile.Dest -Recurse -Force
            Write-Host "  ✅ $($criticalFile.Description): $($criticalFile.Dest)/" -ForegroundColor Green
        } else {
            Copy-Item $criticalFile.Source $criticalFile.Dest -Force
            Write-Host "  ✅ $($criticalFile.Description): $($criticalFile.Dest)" -ForegroundColor Green
        }
    } else {
        Write-Host "  ⚠️  Missing critical file: $($criticalFile.Source)" -ForegroundColor Yellow
    }
}

# Special handling for HTML title
Write-Host ""
Write-Host "🌐 Updating HTML title..." -ForegroundColor Cyan

if (Test-Path "index.html") {
    $htmlContent = Get-Content "index.html" -Raw
    if ($htmlContent -match "<title>.*</title>") {
        $htmlContent = $htmlContent -replace "<title>.*</title>", "<title>Applaa</title>"
        Set-Content "index.html" -Value $htmlContent -NoNewline
        Write-Host "  ✅ HTML title updated to 'Applaa'" -ForegroundColor Green
    }
}

# Verify critical prompts are in place
Write-Host ""
Write-Host "📝 Verifying critical system prompts..." -ForegroundColor Cyan

$criticalPrompts = @(
    "src/prompts/expo_system_prompt.ts",
    "src/prompts/system_prompt.ts", 
    "src/prompts/build_system_prompt.ts"
)

foreach ($prompt in $criticalPrompts) {
    $sourcePrompt = "$PSScriptRoot/prompts/" + (Split-Path $prompt -Leaf)
    if ((Test-Path $sourcePrompt) -and (Test-Path $prompt)) {
        # Check if our enhanced version is in place
        $currentContent = Get-Content $prompt -Raw
        $expectedContent = Get-Content $sourcePrompt -Raw
        
        if ($currentContent -ne $expectedContent) {
            Copy-Item $sourcePrompt $prompt -Force
            Write-Host "  🔄 Updated: $prompt" -ForegroundColor Yellow
        } else {
            Write-Host "  ✅ Current: $prompt" -ForegroundColor Green
        }
    }
}

Write-Host ""
Write-Host "🎉 Branding Application Complete!" -ForegroundColor Green
Write-Host "📝 Applied customizations:" -ForegroundColor White
Write-Host "  • ✅ Text replacements (Dyad → Applaa)" -ForegroundColor Green
Write-Host "  • 🎨 Orange/Green color theme" -ForegroundColor Green  
Write-Host "  • 📦 Applaa assets and logos" -ForegroundColor Green
Write-Host "  • 🔧 Critical component functionality" -ForegroundColor Green
Write-Host "  • 📝 Enhanced system prompts" -ForegroundColor Green

Write-Host ""
Write-Host "🍊 Your codebase is now fully Applaa-branded!" -ForegroundColor DarkYellow

return @{
    Success = $true
    TextReplacements = $textReplacements.Count
    AssetsRestored = $requiredAssets.Count
    CriticalFilesRestored = $criticalFiles.Count
}
