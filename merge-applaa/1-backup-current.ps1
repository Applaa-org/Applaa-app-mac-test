# 🍊 Applaa Backup Script - Create Complete Backup Before Merge
# This script creates a timestamped backup of the current Applaa state

param(
    [string]$BackupPath = "",
    [switch]$Verbose
)

# Set strict error handling
$ErrorActionPreference = "Stop"

Write-Host "🍊 Applaa Backup Script" -ForegroundColor DarkYellow
Write-Host "======================" -ForegroundColor DarkYellow

# Generate backup path if not provided
if ([string]::IsNullOrEmpty($BackupPath)) {
    $timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
    $BackupPath = "backup-applaa-$timestamp"
}

Write-Host "📁 Creating backup at: $BackupPath" -ForegroundColor Cyan

# Create backup directory
if (Test-Path $BackupPath) {
    Write-Host "⚠️  Backup directory already exists, removing..." -ForegroundColor Yellow
    Remove-Item $BackupPath -Recurse -Force
}
New-Item -ItemType Directory -Path $BackupPath -Force | Out-Null

# Files and directories to backup
$itemsToBackup = @(
    # Core source files
    @{ Source = "src"; Dest = "src"; Type = "Directory" },
    @{ Source = "assets"; Dest = "assets"; Type = "Directory" },
    @{ Source = "expo-templates"; Dest = "expo-templates"; Type = "Directory" },
    
    # Configuration files
    @{ Source = "package.json"; Dest = "package.json"; Type = "File" },
    @{ Source = "package-lock.json"; Dest = "package-lock.json"; Type = "File" },
    @{ Source = "index.html"; Dest = "index.html"; Type = "File" },
    @{ Source = "forge.config.ts"; Dest = "forge.config.ts"; Type = "File" },
    
    # Documentation
    @{ Source = "README.md"; Dest = "README.md"; Type = "File" },
    @{ Source = "docs"; Dest = "docs"; Type = "Directory" }
)

Write-Host "📦 Backing up files and directories..." -ForegroundColor Green

foreach ($item in $itemsToBackup) {
    $sourcePath = $item.Source
    $destPath = Join-Path $BackupPath $item.Dest
    
    if (Test-Path $sourcePath) {
        $destDir = Split-Path $destPath -Parent
        if (![string]::IsNullOrEmpty($destDir) -and !(Test-Path $destDir)) {
            New-Item -ItemType Directory -Path $destDir -Force | Out-Null
        }
        
        if ($item.Type -eq "Directory") {
            Copy-Item $sourcePath $destPath -Recurse -Force
            if ($Verbose) {
                $fileCount = (Get-ChildItem $sourcePath -Recurse -File).Count
                Write-Host "  ✅ $sourcePath/ ($fileCount files)" -ForegroundColor Green
            } else {
                Write-Host "  ✅ $sourcePath/" -ForegroundColor Green
            }
        } else {
            Copy-Item $sourcePath $destPath -Force
            Write-Host "  ✅ $sourcePath" -ForegroundColor Green
        }
    } else {
        Write-Host "  ⚠️  Missing: $sourcePath" -ForegroundColor Yellow
    }
}

# Create backup metadata
$metadata = @{
    BackupDate = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    BackupVersion = "Applaa v1.1.0"
    GitCommit = ""
    GitBranch = ""
    Notes = "Pre-merge backup of Applaa customizations"
}

# Try to get git info
try {
    $metadata.GitCommit = (git rev-parse HEAD 2>$null)
    $metadata.GitBranch = (git branch --show-current 2>$null)
} catch {
    Write-Host "  ℹ️  Git info not available" -ForegroundColor Gray
}

# Save metadata
$metadataPath = Join-Path $BackupPath "backup-metadata.json"
$metadata | ConvertTo-Json -Depth 3 | Set-Content $metadataPath
Write-Host "  ✅ backup-metadata.json" -ForegroundColor Green

# Calculate backup size
$backupSize = (Get-ChildItem $BackupPath -Recurse -File | Measure-Object -Property Length -Sum).Sum
$backupSizeMB = [Math]::Round($backupSize / 1MB, 2)

Write-Host ""
Write-Host "🎉 Backup Complete!" -ForegroundColor Green
Write-Host "📍 Location: $BackupPath" -ForegroundColor White
Write-Host "📊 Size: $backupSizeMB MB" -ForegroundColor White
Write-Host "🕒 Created: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor White

# Create restore instructions
$restoreInstructions = @"
# 🔄 Restore Instructions

To restore from this backup:

1. **Stop any running processes** (npm, Expo, etc.)
2. **Navigate to project root**
3. **Run restore commands:**

```powershell
# Remove current files
Remove-Item src -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item assets -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item expo-templates -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item package.json -Force -ErrorAction SilentlyContinue
Remove-Item package-lock.json -Force -ErrorAction SilentlyContinue
Remove-Item index.html -Force -ErrorAction SilentlyContinue

# Restore from backup
Copy-Item "$BackupPath\*" . -Recurse -Force

# Reinstall dependencies
npm install
```

**Backup Created:** $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
**Version:** Applaa v1.1.0
**Git Commit:** $($metadata.GitCommit)
**Git Branch:** $($metadata.GitBranch)
"@

$restoreInstructions | Set-Content (Join-Path $BackupPath "RESTORE-INSTRUCTIONS.md")
Write-Host "📝 Restore instructions saved to RESTORE-INSTRUCTIONS.md" -ForegroundColor Cyan

Write-Host ""
Write-Host "🛡️  Your Applaa customizations are safely backed up!" -ForegroundColor Green
Write-Host "   You can now proceed with the merge process." -ForegroundColor White

return @{
    Success = $true
    BackupPath = $BackupPath
    BackupSizeMB = $backupSizeMB
    Metadata = $metadata
}







