#!/usr/bin/env node

/**
 * Template Validation Script
 * Validates that our local webapp-templates are properly configured
 */

const fs = require('fs');
const path = require('path');

const WEBAPP_TEMPLATES_DIR = path.join(__dirname, '..', 'webapp-templates');
const EXPECTED_TEMPLATES = ['react', 'nextjs', 'portal-mini-store'];

console.log('🔍 Validating Applaa Templates...\n');

function validateTemplate(templateName) {
  const templateDir = path.join(WEBAPP_TEMPLATES_DIR, templateName);
  const results = {
    name: templateName,
    exists: false,
    hasPackageJson: false,
    hasApplaaBranding: false,
    fileCount: 0,
    errors: []
  };

  // Check if template directory exists
  if (!fs.existsSync(templateDir)) {
    results.errors.push(`Template directory not found: ${templateDir}`);
    return results;
  }
  results.exists = true;

  // Check for package.json
  const packageJsonPath = path.join(templateDir, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    results.hasPackageJson = true;
    
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      if (packageJson.name && packageJson.name.includes('applaa')) {
        results.hasApplaaBranding = true;
      }
    } catch (error) {
      results.errors.push(`Invalid package.json: ${error.message}`);
    }
  } else {
    results.errors.push('Missing package.json');
  }

  // Check for Applaa branding files
  const findApplaaBranding = (dir) => {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const file of files) {
      const fullPath = path.join(dir, file.name);
      
      if (file.isDirectory()) {
        if (findApplaaBranding(fullPath)) return true;
      } else if (file.name.includes('applaa') || file.name.includes('made-with-applaa')) {
        results.hasApplaaBranding = true;
        return true;
      }
    }
    return false;
  };

  findApplaaBranding(templateDir);

  // Count total files
  const countFiles = (dir) => {
    let count = 0;
    const files = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const file of files) {
      if (file.isDirectory()) {
        count += countFiles(path.join(dir, file.name));
      } else {
        count++;
      }
    }
    return count;
  };

  results.fileCount = countFiles(templateDir);

  return results;
}

function printResults(results) {
  const status = results.exists ? '✅' : '❌';
  const branding = results.hasApplaaBranding ? '✅' : '⚠️';
  const packageJson = results.hasPackageJson ? '✅' : '❌';
  
  console.log(`${status} ${results.name.toUpperCase()} Template`);
  console.log(`   📁 Directory: ${results.exists ? 'Found' : 'Missing'}`);
  console.log(`   📦 package.json: ${results.hasPackageJson ? 'Found' : 'Missing'}`);
  console.log(`   🎨 Applaa Branding: ${results.hasApplaaBranding ? 'Found' : 'Missing'}`);
  console.log(`   📄 Files: ${results.fileCount}`);
  
  if (results.errors.length > 0) {
    console.log(`   ❌ Errors:`);
    results.errors.forEach(error => console.log(`      - ${error}`));
  }
  console.log();
}

// Main validation
let allValid = true;

for (const templateName of EXPECTED_TEMPLATES) {
  const results = validateTemplate(templateName);
  printResults(results);
  
  if (!results.exists || !results.hasPackageJson || results.errors.length > 0) {
    allValid = false;
  }
}

// Summary
console.log('📊 SUMMARY');
console.log('=' .repeat(50));

if (allValid) {
  console.log('✅ All templates are valid and ready to use!');
  console.log('🚀 Local template system is working correctly.');
} else {
  console.log('❌ Some templates have issues that need to be fixed.');
  console.log('🔧 Please review the errors above.');
}

console.log(`\n📁 Templates location: ${WEBAPP_TEMPLATES_DIR}`);
console.log(`🎯 Expected templates: ${EXPECTED_TEMPLATES.join(', ')}`);

process.exit(allValid ? 0 : 1);

