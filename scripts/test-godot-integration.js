/**
 * Test script for Godot integration
 * Run with: node scripts/test-godot-integration.js
 */

const { testGodotIntegration } = require('../src/godot/__tests__/test_godot_integration.ts');

console.log('🧪 Starting Godot Integration Test...\n');

testGodotIntegration()
  .then(() => {
    console.log('\n✅ All tests completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Tests failed:', error);
    process.exit(1);
  });

