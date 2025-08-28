# PowerShell script to update merge-applaa folder with current working Applaa customizations
# This ensures our merge-applaa folder has all the latest changes from the working project

Write-Host "Updating merge-applaa folder with current working Applaa customizations..." -ForegroundColor Green

# Define source and destination paths
$workingPath = "C:\src\Applaa-mvp-gcli"
$mergeApplaaPath = "$workingPath\merge-applaa"

# Ensure we're in the correct directory
Set-Location $workingPath

# Function to copy directory structure while preserving existing files
function Copy-WorkingFiles {
    param(
        [string]$RelativePath,
        [string]$Description
    )
    
    Write-Host "Updating $Description..." -ForegroundColor Yellow
    
    $sourcePath = Join-Path $workingPath $RelativePath
    $destPath = Join-Path $mergeApplaaPath $RelativePath
    
    if (Test-Path $sourcePath) {
        # Ensure destination directory exists
        $destDir = Split-Path $destPath -Parent
        if (-not (Test-Path $destDir)) {
            New-Item -ItemType Directory -Path $destDir -Force | Out-Null
        }
        
        # Copy the entire directory structure
        if (Test-Path $sourcePath -PathType Container) {
            Copy-Item -Path "$sourcePath\*" -Destination $destPath -Recurse -Force
        } else {
            Copy-Item -Path $sourcePath -Destination $destPath -Force
        }
        
        Write-Host "  ✓ Updated $RelativePath" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ Source not found: $sourcePath" -ForegroundColor Red
    }
}

# Update key directories and files
Copy-WorkingFiles "src\components\chat" "Chat components"
Copy-WorkingFiles "src\components\expo" "Expo components" 
Copy-WorkingFiles "src\components\ui" "UI components"
Copy-WorkingFiles "src\hooks" "React hooks"
Copy-WorkingFiles "src\ipc" "IPC handlers and client"
Copy-WorkingFiles "src\lib" "Library files"
Copy-WorkingFiles "src\pages" "Page components"
Copy-WorkingFiles "src\styles" "Styles"
Copy-WorkingFiles "src\main" "Main process files"
Copy-WorkingFiles "src\app" "App components"
Copy-WorkingFiles "src\shared" "Shared utilities"
Copy-WorkingFiles "src\preload.ts" "Preload script"

# Copy individual component files from src\components
$componentFiles = @(
    "app-sidebar.tsx", "AppList.tsx", "AppUpgrades.tsx", "AutoApproveSwitch.tsx",
    "AutoFixProblemsSwitch.tsx", "AutoUpdateSwitch.tsx", "CapacitorControls.tsx",
    "ChatList.tsx", "ChatPanel.tsx", "CommunityCodeConsentDialog.tsx",
    "ConfirmationDialog.tsx", "CreateCustomModelDialog.tsx", "CreateCustomProviderDialog.tsx",
    "CustomAppsDirectorySelector.tsx", "CustomErrorToast.tsx", "DyadProSuccessDialog.tsx",
    "EditCustomModelDialog.tsx", "GitHubConnector.tsx", "GitHubIntegration.tsx",
    "ImportAppButton.tsx", "ImportAppDialog.tsx", "ImportAppIcon.tsx",
    "InputRequestToast.tsx", "MaxChatTurnsSelector.tsx", "NeonConnector.tsx",
    "NeonDisconnectButton.tsx", "NeonIntegration.tsx", "PortalMigrate.tsx",
    "ProviderSettings.tsx", "ReleaseChannelSelector.tsx", "SettingsList.tsx",
    "SetupBanner.tsx", "SupabaseConnector.tsx", "SupabaseIntegration.tsx",
    "TelemetrySwitch.tsx", "TemplateCard.tsx", "ThinkingBudgetSelector.tsx",
    "VercelConnector.tsx", "VercelIntegration.tsx"
)

Write-Host "Updating individual component files..." -ForegroundColor Yellow
foreach ($file in $componentFiles) {
    $sourcePath = "src\components\$file"
    $destPath = "merge-applaa\src\components\$file"
    
    if (Test-Path $sourcePath) {
        Copy-Item -Path $sourcePath -Destination $destPath -Force
        Write-Host "  ✓ Updated $file" -ForegroundColor Green
    }
}

# Update prompts directory
Copy-WorkingFiles "src\prompts" "Prompt files"

Write-Host "`nUpdate complete! merge-applaa folder now contains all current working customizations." -ForegroundColor Green
Write-Host "You can now re-run the merge process with the updated merge-applaa folder." -ForegroundColor Cyan






