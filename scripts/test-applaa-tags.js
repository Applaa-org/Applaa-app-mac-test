#!/usr/bin/env node

/**
 * Applaa Tags Test Script
 * Tests that our Applaa tag parsing functions work correctly
 */

const path = require('path');

// Import the tag parsing functions
const { getDyadWriteTags, getDyadRenameTags, getDyadDeleteTags } = require('../src/ipc/utils/dyad_tag_parser.ts');

console.log('🧪 Testing Applaa Tag Parsing...\n');

// Test cases
const testCases = [
  {
    name: 'Applaa Write Tag',
    input: `
Here's your component:

<applaa-write path="src/components/test.tsx" description="Test component">
export const TestComponent = () => {
  return <div>Hello Applaa!</div>;
};
</applaa-write>

Done!
    `,
    expectedFiles: ['src/components/test.tsx']
  },
  {
    name: 'Mixed Dyad and Applaa Tags',
    input: `
Legacy file:

<dyad-write path="src/legacy.tsx" description="Legacy component">
export const Legacy = () => <div>Old</div>;
</dyad-write>

New file:

<applaa-write path="src/new.tsx" description="New component">
export const New = () => <div>New Applaa!</div>;
</applaa-write>
    `,
    expectedFiles: ['src/legacy.tsx', 'src/new.tsx']
  },
  {
    name: 'Multiple Applaa Tags',
    input: `
<applaa-write path="src/utils.ts" description="Utilities">
export const utils = {};
</applaa-write>

<applaa-write path="src/types.ts" description="Types">
export interface User {}
</applaa-write>
    `,
    expectedFiles: ['src/utils.ts', 'src/types.ts']
  }
];

function runTest(testCase) {
  console.log(`🔍 Testing: ${testCase.name}`);
  
  try {
    // Test the tag parsing function
    const tags = getDyadWriteTags(testCase.input);
    const foundFiles = tags.map(tag => tag.path);
    
    console.log(`   📁 Expected files: ${testCase.expectedFiles.join(', ')}`);
    console.log(`   📄 Found files: ${foundFiles.join(', ')}`);
    
    // Check if all expected files were found
    const allFound = testCase.expectedFiles.every(file => foundFiles.includes(file));
    const noExtra = foundFiles.every(file => testCase.expectedFiles.includes(file));
    
    if (allFound && noExtra) {
      console.log(`   ✅ PASS - All files found correctly\n`);
      return true;
    } else {
      console.log(`   ❌ FAIL - File mismatch\n`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ ERROR - ${error.message}\n`);
    return false;
  }
}

// Run all tests
let passCount = 0;
let totalTests = testCases.length;

for (const testCase of testCases) {
  if (runTest(testCase)) {
    passCount++;
  }
}

// Summary
console.log('📊 TEST SUMMARY');
console.log('=' .repeat(50));
console.log(`✅ Passed: ${passCount}/${totalTests}`);
console.log(`❌ Failed: ${totalTests - passCount}/${totalTests}`);

if (passCount === totalTests) {
  console.log('\n🎉 All Applaa tag parsing tests passed!');
  console.log('🚀 Tag system is working correctly.');
} else {
  console.log('\n⚠️  Some tests failed. Please check the tag parsing logic.');
}

process.exit(passCount === totalTests ? 0 : 1);

