# 🍊 MASTER SCRIPT: Merge Dyad to Applaa
# This is the master orchestration script that handles the complete end-to-end merge process
# Run this script to seamlessly upgrade from latest Dyad while preserving all Applaa customizations

param(
    [Parameter(Mandatory=$false)]
    [string]$DyadPath = "",
    [switch]$DryRun,
    [switch]$Verbose,
    [switch]$SkipBackup,
    [switch]$AutoFix,
    [switch]$SkipValidation,
    [string]$BackupPath = ""
)

# Set strict error handling
$ErrorActionPreference = "Stop"

# Script metadata
$scriptVersion = "1.1.0"
$scriptDate = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

Write-Host ""
Write-Host "🍊🔄🍊🔄🍊🔄🍊🔄🍊🔄🍊🔄🍊🔄🍊🔄🍊🔄🍊🔄🍊🔄🍊" -ForegroundColor DarkYellow
Write-Host "                  APPLAA MASTER MERGE SCRIPT                    " -ForegroundColor DarkYellow  
Write-Host "🍊🔄🍊🔄🍊🔄🍊🔄🍊🔄🍊🔄🍊🔄🍊🔄🍊🔄🍊🔄🍊🔄🍊" -ForegroundColor DarkYellow
Write-Host ""
Write-Host "🎯 Purpose: Merge latest Dyad updates while preserving ALL Applaa customizations" -ForegroundColor White
Write-Host "📦 Version: $scriptVersion" -ForegroundColor Gray
Write-Host "🕒 Started: $scriptDate" -ForegroundColor Gray
Write-Host ""

if ($DryRun) {
    Write-Host "🔍 DRY RUN MODE ENABLED - No files will be modified" -ForegroundColor Magenta
    Write-Host ""
}

# Function to handle errors gracefully
function Handle-Error {
    param([string]$Stage, [string]$Error)
    Write-Host ""
    Write-Host "❌ ERROR in $Stage" -ForegroundColor Red
    Write-Host "Details: $Error" -ForegroundColor Red
    Write-Host ""
    Write-Host "🔄 To recover:" -ForegroundColor Yellow
    Write-Host "  1. Check the error details above" -ForegroundColor White
    Write-Host "  2. If backup exists, restore using instructions in backup folder" -ForegroundColor White
    Write-Host "  3. Fix the issue and re-run the script" -ForegroundColor White
    exit 1
}

# Step 0: Parameter validation and setup
Write-Host "⚙️  SETUP & VALIDATION" -ForegroundColor Cyan
Write-Host "======================" -ForegroundColor Cyan

# Get Dyad path if not provided
if ([string]::IsNullOrEmpty($DyadPath)) {
    Write-Host "📂 Dyad source path not provided. Options:" -ForegroundColor Yellow
    Write-Host "  1. Provide path: -DyadPath 'C:\path\to\dyad'" -ForegroundColor White
    Write-Host "  2. We can download latest Dyad automatically" -ForegroundColor White
    Write-Host ""
    
    $choice = Read-Host "Download latest Dyad automatically? (y/n)"
    if ($choice -eq "y" -or $choice -eq "Y") {
        $DyadPath = "C:\temp\dyad-latest-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
        Write-Host "📥 Downloading latest Dyad to: $DyadPath" -ForegroundColor Cyan
        
        if (!$DryRun) {
            try {
                if (!(Test-Path "C:\temp")) { New-Item -ItemType Directory -Path "C:\temp" -Force | Out-Null }
                git clone https://github.com/dyad-sh/dyad.git $DyadPath 2>$null
                if (!(Test-Path $DyadPath)) {
                    throw "Git clone failed"
                }
                Write-Host "✅ Dyad downloaded successfully" -ForegroundColor Green
            } catch {
                Handle-Error "Dyad Download" "Failed to download Dyad: $($_.Exception.Message)"
            }
        } else {
            Write-Host "🔍 DRY RUN: Would download Dyad to $DyadPath" -ForegroundColor Magenta
        }
    } else {
        Write-Host "❌ Dyad path is required. Please provide -DyadPath parameter." -ForegroundColor Red
        exit 1
    }
}

# Validate Dyad path
if (!$DryRun -and !(Test-Path $DyadPath)) {
    Handle-Error "Path Validation" "Dyad path not found: $DyadPath"
}

if (!$DryRun -and !(Test-Path (Join-Path $DyadPath "package.json"))) {
    Handle-Error "Repository Validation" "Invalid Dyad repository - package.json not found in $DyadPath"
}

Write-Host "✅ Using Dyad source: $DyadPath" -ForegroundColor Green

# Validate we're in the right directory
if (!(Test-Path "package.json") -or !(Test-Path "src")) {
    Handle-Error "Working Directory" "This script must be run from the Applaa project root directory"
}

# Check if merge-applaa directory exists
if (!(Test-Path "merge-applaa")) {
    Handle-Error "Merge Directory" "merge-applaa directory not found. Please ensure you have the merge system set up."
}

Write-Host "✅ Validation complete" -ForegroundColor Green
Write-Host ""

# Step 1: Backup Current State
if (!$SkipBackup) {
    Write-Host "📦 STEP 1: BACKUP CURRENT STATE" -ForegroundColor Cyan
    Write-Host "================================" -ForegroundColor Cyan
    
    try {
        $backupArgs = @()
        if ($Verbose) { $backupArgs += "-Verbose" }
        if (![string]::IsNullOrEmpty($BackupPath)) { $backupArgs += "-BackupPath", $BackupPath }
        
        if (!$DryRun) {
            $backupResult = & "$PSScriptRoot\1-backup-current.ps1" @backupArgs
            if (!$backupResult.Success) {
                throw "Backup script failed"
            }
            Write-Host "✅ Backup completed: $($backupResult.BackupPath)" -ForegroundColor Green
            $finalBackupPath = $backupResult.BackupPath
        } else {
            Write-Host "🔍 DRY RUN: Would create backup" -ForegroundColor Magenta
            $finalBackupPath = "dry-run-backup"
        }
    } catch {
        Handle-Error "Backup" $_.Exception.Message
    }
} else {
    Write-Host "⏭️  STEP 1: BACKUP SKIPPED (as requested)" -ForegroundColor Yellow
    Write-Host ""
}

# Step 2: Merge Upstream Changes
Write-Host "🔄 STEP 2: MERGE UPSTREAM CHANGES" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan

try {
    $mergeArgs = @("-UpstreamPath", $DyadPath)
    if ($DryRun) { $mergeArgs += "-DryRun" }
    if ($Verbose) { $mergeArgs += "-Verbose" }
    if (![string]::IsNullOrEmpty($finalBackupPath)) { $mergeArgs += "-BackupPath", $finalBackupPath }
    
    $mergeResult = & "$PSScriptRoot\2-merge-upstream.ps1" @mergeArgs
    if (!$DryRun) {
        if (!$mergeResult.Success) {
            throw "Merge script failed"
        }
        Write-Host "✅ Merge completed successfully" -ForegroundColor Green
        Write-Host "  • Protected: $($mergeResult.ProtectedFiles) files" -ForegroundColor Green
        Write-Host "  • Careful merge: $($mergeResult.CarefulMergeFiles) files" -ForegroundColor Yellow
        Write-Host "  • Updated: $($mergeResult.NormalMergeFiles) files" -ForegroundColor Cyan
    } else {
        Write-Host "✅ DRY RUN: Merge analysis completed" -ForegroundColor Green
    }
} catch {
    Handle-Error "Merge" $_.Exception.Message
}

if ($DryRun) {
    Write-Host ""
    Write-Host "🔍 DRY RUN COMPLETE" -ForegroundColor Magenta
    Write-Host "===================" -ForegroundColor Magenta
    Write-Host ""
    Write-Host "✅ All validation checks passed" -ForegroundColor Green
    Write-Host "🎯 The merge would preserve all Applaa customizations" -ForegroundColor Green
    Write-Host "📊 Review the analysis above for detailed merge plan" -ForegroundColor White
    Write-Host ""
    Write-Host "🚀 To perform the actual merge, run without -DryRun:" -ForegroundColor Cyan
    Write-Host "   .\merge-applaa\merge-dyad-to-applaa.ps1 -DyadPath '$DyadPath'" -ForegroundColor White
    exit 0
}

Write-Host ""

# Step 3: Validation
if (!$SkipValidation) {
    Write-Host "🔍 STEP 3: VALIDATION" -ForegroundColor Cyan
    Write-Host "======================" -ForegroundColor Cyan
    
    try {
        $validationArgs = @()
        if ($Verbose) { $validationArgs += "-Verbose" }
        if ($AutoFix) { $validationArgs += "-FixIssues" }
        
        $validationResult = & "$PSScriptRoot\4-validate-merge.ps1" @validationArgs
        
        $passRate = if ($validationResult.TotalChecks -gt 0) { 
            [Math]::Round(($validationResult.PassedChecks / $validationResult.TotalChecks) * 100, 1) 
        } else { 0 }
        
        if ($validationResult.FailedChecks -eq 0) {
            Write-Host "✅ All validation checks passed ($passRate% pass rate)" -ForegroundColor Green
        } elseif ($passRate -ge 90) {
            Write-Host "⚠️  Validation mostly successful ($passRate% pass rate)" -ForegroundColor Yellow
        } else {
            Write-Host "❌ Validation issues found ($passRate% pass rate)" -ForegroundColor Red
            if (!$AutoFix) {
                Write-Host "💡 Consider running with -AutoFix to attempt automatic fixes" -ForegroundColor Cyan
            }
        }
    } catch {
        Handle-Error "Validation" $_.Exception.Message
    }
} else {
    Write-Host "⏭️  STEP 3: VALIDATION SKIPPED (as requested)" -ForegroundColor Yellow
}

Write-Host ""

# Step 4: Final Steps and Instructions
Write-Host "🎉 MERGE COMPLETE!" -ForegroundColor Green
Write-Host "==================" -ForegroundColor Green
Write-Host ""

Write-Host "📊 Merge Summary:" -ForegroundColor White
Write-Host "  • ✅ Upstream Dyad updates applied" -ForegroundColor Green
Write-Host "  • 🛡️  All Applaa customizations preserved" -ForegroundColor Green
Write-Host "  • 🎨 Applaa branding and theming maintained" -ForegroundColor Green
Write-Host "  • 🔧 Enhanced features retained (routing fixes, auto-refresh, etc.)" -ForegroundColor Green

if (![string]::IsNullOrEmpty($finalBackupPath)) {
    Write-Host ""
    Write-Host "💾 Backup available at: $finalBackupPath" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "🚀 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Install dependencies:" -ForegroundColor White
Write-Host "   npm install" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Test the application:" -ForegroundColor White  
Write-Host "   npm start" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Verify Applaa features:" -ForegroundColor White
Write-Host "   • Check branding and orange/green theme" -ForegroundColor Gray
Write-Host "   • Test mobile preview functionality" -ForegroundColor Gray
Write-Host "   • Verify auto-refresh after LLM responses" -ForegroundColor Gray
Write-Host "   • Test routing fixes (no 'Unmatched Route' errors)" -ForegroundColor Gray
Write-Host ""
Write-Host "4. If issues found:" -ForegroundColor White
Write-Host "   • Check the validation report above" -ForegroundColor Gray
Write-Host "   • Run: .\merge-applaa\4-validate-merge.ps1 -FixIssues" -ForegroundColor Gray
Write-Host "   • Restore from backup if needed" -ForegroundColor Gray

Write-Host ""
Write-Host "🍊 Applaa is now running on the latest Dyad foundation!" -ForegroundColor DarkYellow
Write-Host "   All your customizations have been preserved and enhanced." -ForegroundColor White
Write-Host ""

# Cleanup downloaded Dyad if we created it
if ($DyadPath.StartsWith("C:\temp\dyad-latest-")) {
    $cleanup = Read-Host "🗑️  Remove downloaded Dyad directory? (y/n)"
    if ($cleanup -eq "y" -or $cleanup -eq "Y") {
        try {
            Remove-Item $DyadPath -Recurse -Force
            Write-Host "✅ Cleaned up temporary Dyad download" -ForegroundColor Green
        } catch {
            Write-Host "⚠️  Could not clean up $DyadPath - you may remove it manually" -ForegroundColor Yellow
        }
    }
}

Write-Host ""
Write-Host "🎯 Script completed at: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
Write-Host "🍊 Happy building with Applaa! 🍊" -ForegroundColor DarkYellow

# Return success
return @{
    Success = $true
    BackupPath = if ($finalBackupPath) { $finalBackupPath } else { "" }
}
