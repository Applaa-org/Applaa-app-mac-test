# 🍊 Applaa Upstream Merge Script - Smart merge with Dyad updates
# This script intelligently merges upstream Dyad changes while preserving Applaa customizations

param(
    [Parameter(Mandatory=$true)]
    [string]$UpstreamPath,
    [switch]$DryRun,
    [switch]$Verbose,
    [string]$BackupPath = ""
)

# Set strict error handling
$ErrorActionPreference = "Stop"

Write-Host "🍊 Applaa Upstream Merge Script" -ForegroundColor DarkYellow
Write-Host "===============================" -ForegroundColor DarkYellow

if ($DryRun) {
    Write-Host "🔍 DRY RUN MODE - No files will be modified" -ForegroundColor Magenta
}

# Validate upstream path
if (!(Test-Path $UpstreamPath)) {
    Write-Host "❌ Error: Upstream path not found: $UpstreamPath" -ForegroundColor Red
    exit 1
}

if (!(Test-Path (Join-Path $UpstreamPath "package.json"))) {
    Write-Host "❌ Error: Invalid Dyad repository - package.json not found" -ForegroundColor Red
    exit 1
}

Write-Host "📁 Upstream source: $UpstreamPath" -ForegroundColor Cyan

# Create backup if not in dry run mode
if (!$DryRun) {
    Write-Host ""
    Write-Host "📦 Creating backup..." -ForegroundColor Yellow
    $backupResult = & "$PSScriptRoot\1-backup-current.ps1" -BackupPath $BackupPath
    if (!$backupResult.Success) {
        Write-Host "❌ Backup failed! Aborting merge." -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Backup created at: $($backupResult.BackupPath)" -ForegroundColor Green
}

# Files that should NEVER be overwritten (Applaa-specific)
$protectedFiles = @(
    "assets/applaa-logo.svg",
    "assets/icon/logo.png", 
    "assets/icon/logo.ico",
    "assets/icon/logo.icns",
    "assets/mobile-template-icon.svg",
    "expo-templates/expo-base-master/**",
    "src/components/expo/SimpleMobilePreview.tsx",
    "src/components/expo/MobilePreview.tsx",
    "src/components/SparkModeSelector.tsx",
    "src/components/PlatformSelector.tsx", 
    "src/components/AppTypeSelector.tsx",
    "src/components/CustomAppsDirectorySelector.tsx",
    "src/lib/appTypeDetector.ts",
    "src/prompts/expo_system_prompt.ts",
    "src/prompts/system_prompt.ts",
    "src/prompts/build_system_prompt.ts",
    "src/prompts/ask_mode_system_prompt.ts",
    "src/prompts/optimization_system_prompt.ts",
    "merge-applaa/**"
)

# Files that need careful merging (preserve specific Applaa changes)
$carefulMergeFiles = @(
    @{ 
        File = "package.json"
        ApplaaFields = @("name", "productName", "description", "version", "repository")
        Description = "Preserve Applaa metadata while updating dependencies"
    },
    @{
        File = "index.html"
        ApplaaContent = @("<title>Applaa</title>")
        Description = "Preserve Applaa title and branding"
    },
    @{
        File = "src/styles/globals.css"
        ApplaaContent = @("--primary: oklch(0.65 0.18 45)", "--secondary-brand: oklch(0.55 0.15 140)")
        Description = "Preserve Applaa orange/green color theme"
    }
)

# Directories to merge normally (overwrite with upstream)
$normalMergeDirectories = @(
    "drizzle",
    "e2e-tests", 
    "packages",
    "scripts",
    "shared",
    "testing",
    "tools",
    "worker", 
    "workers"
)

# Individual files to merge normally
$normalMergeFiles = @(
    "forge.config.ts",
    "forge.env.d.ts", 
    "drizzle.config.ts",
    "tsconfig.json",
    "tsconfig.app.json", 
    "tsconfig.node.json",
    "vite.*.config.mts",
    "vitest.config.ts",
    "playwright.config.ts",
    "biome.json",
    "components.json",
    ".prettierrc",
    ".prettierignore",
    ".eslintrc.json",
    ".gitignore"
)

Write-Host ""
Write-Host "🔍 Analyzing merge requirements..." -ForegroundColor Cyan

# Count files to be processed
$totalFiles = 0
$protectedCount = 0
$carefulCount = 0
$normalCount = 0

# Scan upstream directory
$upstreamFiles = Get-ChildItem $UpstreamPath -Recurse -File | ForEach-Object {
    $_.FullName.Substring($UpstreamPath.Length + 1).Replace('\', '/')
}

foreach ($file in $upstreamFiles) {
    $totalFiles++
    
    $isProtected = $false
    foreach ($protected in $protectedFiles) {
        if ($protected.EndsWith("/**")) {
            $dir = $protected.Substring(0, $protected.Length - 3)
            if ($file.StartsWith($dir + "/")) {
                $isProtected = $true
                break
            }
        } elseif ($file -eq $protected) {
            $isProtected = $true
            break
        }
    }
    
    if ($isProtected) {
        $protectedCount++
        continue
    }
    
    $isCareful = $carefulMergeFiles | Where-Object { $_.File -eq $file }
    if ($isCareful) {
        $carefulCount++
        continue
    }
    
    $normalCount++
}

Write-Host "📊 Merge Analysis:" -ForegroundColor White
Write-Host "  • Total files in upstream: $totalFiles" -ForegroundColor Gray
Write-Host "  • Protected (Applaa-only): $protectedCount files" -ForegroundColor Green
Write-Host "  • Careful merge required: $carefulCount files" -ForegroundColor Yellow  
Write-Host "  • Normal merge: $normalCount files" -ForegroundColor Cyan

if ($DryRun) {
    Write-Host ""
    Write-Host "🔍 DRY RUN - Would perform these operations:" -ForegroundColor Magenta
    Write-Host ""
    
    Write-Host "🛡️  PROTECTED FILES (would be preserved):" -ForegroundColor Green
    foreach ($protected in $protectedFiles) {
        if (Test-Path $protected) {
            Write-Host "  ✅ $protected" -ForegroundColor Green
        }
    }
    
    Write-Host ""
    Write-Host "⚠️  CAREFUL MERGE FILES (would be selectively merged):" -ForegroundColor Yellow
    foreach ($careful in $carefulMergeFiles) {
        if (Test-Path $careful.File) {
            Write-Host "  🔧 $($careful.File) - $($careful.Description)" -ForegroundColor Yellow
        }
    }
    
    Write-Host ""
    Write-Host "🔄 NORMAL MERGE (would be overwritten with upstream):" -ForegroundColor Cyan
    foreach ($file in $upstreamFiles) {
        $shouldMerge = $true
        
        # Check if protected
        foreach ($protected in $protectedFiles) {
            if ($protected.EndsWith("/**")) {
                $dir = $protected.Substring(0, $protected.Length - 3)
                if ($file.StartsWith($dir + "/")) {
                    $shouldMerge = $false
                    break
                }
            } elseif ($file -eq $protected) {
                $shouldMerge = $false
                break
            }
        }
        
        # Check if careful merge
        if ($shouldMerge) {
            $isCareful = $carefulMergeFiles | Where-Object { $_.File -eq $file }
            if ($isCareful) {
                $shouldMerge = $false
            }
        }
        
        if ($shouldMerge) {
            Write-Host "  📄 $file" -ForegroundColor Cyan
        }
    }
    
    Write-Host ""
    Write-Host "🎯 After merge, would apply Applaa branding..." -ForegroundColor Magenta
    Write-Host "✅ DRY RUN complete - no files were modified" -ForegroundColor Green
    return
}

Write-Host ""
Write-Host "🚀 Starting actual merge..." -ForegroundColor Green

# Step 1: Merge normal files and directories
Write-Host "📁 Merging normal files and directories..." -ForegroundColor Cyan

foreach ($dir in $normalMergeDirectories) {
    $sourcePath = Join-Path $UpstreamPath $dir
    if (Test-Path $sourcePath) {
        if (Test-Path $dir) {
            Remove-Item $dir -Recurse -Force
        }
        Copy-Item $sourcePath . -Recurse -Force
        Write-Host "  ✅ $dir/" -ForegroundColor Green
    }
}

foreach ($file in $normalMergeFiles) {
    $sourcePath = Join-Path $UpstreamPath $file
    if (Test-Path $sourcePath) {
        Copy-Item $sourcePath . -Force
        Write-Host "  ✅ $file" -ForegroundColor Green
    }
}

# Step 2: Merge src directory selectively
Write-Host "🔧 Merging src directory (selective)..." -ForegroundColor Yellow

$srcPath = Join-Path $UpstreamPath "src"
if (Test-Path $srcPath) {
    $srcFiles = Get-ChildItem $srcPath -Recurse -File
    
    foreach ($srcFile in $srcFiles) {
        $relativePath = "src/" + $srcFile.FullName.Substring($srcPath.Length + 1).Replace('\', '/')
        
        # Check if this file is protected
        $isProtected = $false
        foreach ($protected in $protectedFiles) {
            if ($protected.EndsWith("/**")) {
                $dir = $protected.Substring(0, $protected.Length - 3)
                if ($relativePath.StartsWith($dir + "/")) {
                    $isProtected = $true
                    break
                }
            } elseif ($relativePath -eq $protected) {
                $isProtected = $true
                break
            }
        }
        
        if (!$isProtected) {
            $destPath = $relativePath
            $destDir = Split-Path $destPath -Parent
            
            if (![string]::IsNullOrEmpty($destDir) -and !(Test-Path $destDir)) {
                New-Item -ItemType Directory -Path $destDir -Force | Out-Null
            }
            
            Copy-Item $srcFile.FullName $destPath -Force
            if ($Verbose) {
                Write-Host "  ✅ $relativePath" -ForegroundColor Green
            }
        } else {
            if ($Verbose) {
                Write-Host "  🛡️  Protected: $relativePath" -ForegroundColor Yellow
            }
        }
    }
}

# Step 3: Careful merge of specific files
Write-Host "⚖️  Performing careful merge of critical files..." -ForegroundColor Yellow

foreach ($carefulFile in $carefulMergeFiles) {
    $filePath = $carefulFile.File
    $upstreamFilePath = Join-Path $UpstreamPath $filePath
    
    if ((Test-Path $upstreamFilePath) -and (Test-Path $filePath)) {
        Write-Host "  🔧 Merging $filePath..." -ForegroundColor Yellow
        
        if ($filePath -eq "package.json") {
            # Smart package.json merge
            $currentPackage = Get-Content $filePath | ConvertFrom-Json
            $upstreamPackage = Get-Content $upstreamFilePath | ConvertFrom-Json
            
            # Preserve Applaa-specific fields
            $upstreamPackage.name = "applaa"
            $upstreamPackage.productName = "Applaa"
            $upstreamPackage.description = "Applaa - Your local AI app builder with beautiful orange and green design"
            $upstreamPackage.version = $currentPackage.version
            if ($currentPackage.repository) {
                $upstreamPackage.repository = $currentPackage.repository
            }
            
            $upstreamPackage | ConvertTo-Json -Depth 10 | Set-Content $filePath
            Write-Host "    ✅ Preserved Applaa metadata in package.json" -ForegroundColor Green
            
        } else {
            # For other files, copy from upstream and mark for branding
            Copy-Item $upstreamFilePath $filePath -Force
            Write-Host "    ✅ $filePath updated (will apply branding next)" -ForegroundColor Green
        }
    }
}

Write-Host ""
Write-Host "🎨 Applying Applaa branding and customizations..." -ForegroundColor Magenta

# Run the branding script
& "$PSScriptRoot\3-apply-branding.ps1" -Verbose:$Verbose

Write-Host ""
Write-Host "🎉 Merge Complete!" -ForegroundColor Green
Write-Host "📝 Summary:" -ForegroundColor White
Write-Host "  • ✅ Protected $protectedCount Applaa-specific files" -ForegroundColor Green
Write-Host "  • 🔧 Carefully merged $carefulCount critical files" -ForegroundColor Yellow  
Write-Host "  • 🔄 Updated $normalCount files from upstream" -ForegroundColor Cyan
Write-Host "  • 🎨 Applied Applaa branding and customizations" -ForegroundColor Magenta

Write-Host ""
Write-Host "🔍 Next steps:" -ForegroundColor Cyan
Write-Host "  1. Run validation: .\merge-applaa\4-validate-merge.ps1" -ForegroundColor White
Write-Host "  2. Test the application: npm start" -ForegroundColor White
Write-Host "  3. Verify all Applaa features work correctly" -ForegroundColor White

return @{
    Success = $true
    ProtectedFiles = $protectedCount
    CarefulMergeFiles = $carefulCount
    NormalMergeFiles = $normalCount
    BackupPath = if ($backupResult) { $backupResult.BackupPath } else { "" }
}
