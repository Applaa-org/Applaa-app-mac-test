#!/usr/bin/env node

/**
 * Debug Template Paths Script
 * Tests path resolution for webapp-templates in different environments
 */

const path = require('path');
const fs = require('fs');

console.log('🔍 Debugging Template Paths...\n');

// Simulate different path resolution methods
const methods = [
  {
    name: 'process.cwd()',
    path: path.join(process.cwd(), 'webapp-templates', 'react')
  },
  {
    name: '__dirname relative',
    path: path.join(__dirname, '..', 'webapp-templates', 'react')
  },
  {
    name: 'Direct relative',
    path: path.join('.', 'webapp-templates', 'react')
  }
];

console.log('📍 Current Working Directory:', process.cwd());
console.log('📍 Script Directory (__dirname):', __dirname);
console.log();

for (const method of methods) {
  const exists = fs.existsSync(method.path);
  const status = exists ? '✅' : '❌';
  
  console.log(`${status} ${method.name}`);
  console.log(`   Path: ${method.path}`);
  console.log(`   Exists: ${exists}`);
  
  if (exists) {
    try {
      const files = fs.readdirSync(method.path);
      console.log(`   Files: ${files.length} items`);
    } catch (error) {
      console.log(`   Error reading: ${error.message}`);
    }
  }
  console.log();
}

// Check if scaffold exists as fallback
const scaffoldPath = path.join(process.cwd(), 'scaffold');
const scaffoldExists = fs.existsSync(scaffoldPath);

console.log('📦 Fallback Check:');
console.log(`${scaffoldExists ? '✅' : '❌'} Scaffold Directory`);
console.log(`   Path: ${scaffoldPath}`);
console.log(`   Exists: ${scaffoldExists}`);

if (scaffoldExists) {
  try {
    const files = fs.readdirSync(scaffoldPath);
    console.log(`   Files: ${files.length} items`);
  } catch (error) {
    console.log(`   Error reading: ${error.message}`);
  }
}

console.log('\n🎯 Recommendation:');
if (fs.existsSync(path.join(process.cwd(), 'webapp-templates', 'react'))) {
  console.log('✅ Use webapp-templates directory (preferred)');
} else if (scaffoldExists) {
  console.log('⚠️  Use scaffold directory (fallback)');
} else {
  console.log('❌ No templates found - check directory structure');
}

