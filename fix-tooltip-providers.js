#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// List of files that need TooltipProvider fixes
const filesToFix = [
  'src/components/expo/RealEmbeddedPreview.tsx',
  'src/components/preview_panel/PreviewIframe.tsx',
  'src/components/ui/sidebar.tsx',
  'src/components/preview_panel/PublishPanel.tsx',
  'src/components/preview_panel/PreviewHeader.tsx',
  'src/components/expo/SimpleTerminalPreview.tsx',
  'src/components/expo/ResponsiveMobilePreview.tsx',
  'src/components/expo/NoIframeMobilePreview.tsx',
  'src/components/expo/DirectResponsivePreview.tsx',
  'src/components/expo/BrilliantExpoPreview.tsx',
  'src/components/expo/AutoStartPreview.tsx',
  'src/components/cost-optimization/CostSavingsIndicator.tsx',
  'src/components/chat/TokenBar.tsx',
  'src/components/chat/HomeChatInput.tsx',
  'src/components/chat/FileAttachmentDropdown.tsx',
  'src/components/backup/BackupStatusIndicator.tsx',
  'src/components/ImportAppDialog.tsx',
  'src/components/EASDeploymentPanel.tsx',
  'src/components/ContextFilesPicker.tsx'
];

function fixTooltipProvider(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Remove TooltipProvider from imports
    if (content.includes('TooltipProvider')) {
      content = content.replace(
        /import\s*{\s*([^}]*TooltipProvider[^}]*)\s*}\s*from\s*["'][^"']*tooltip["']/g,
        (match, imports) => {
          const cleanedImports = imports
            .split(',')
            .map(imp => imp.trim())
            .filter(imp => imp !== 'TooltipProvider')
            .join(', ');
          modified = true;
          return `import { ${cleanedImports} } from "../ui/tooltip"`;
        }
      );
    }

    // Remove TooltipProvider wrapper components
    content = content.replace(
      /<TooltipProvider[^>]*>\s*<Tooltip/g,
      '<Tooltip'
    );
    content = content.replace(
      /<\/Tooltip>\s*<\/TooltipProvider>/g,
      '</Tooltip>'
    );

    if (modified) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Fixed: ${filePath}`);
    } else {
      console.log(`⏭️  No changes needed: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
  }
}

console.log('🔧 Fixing TooltipProvider instances...\n');

filesToFix.forEach(fixTooltipProvider);

console.log('\n✅ All TooltipProvider instances fixed!');

