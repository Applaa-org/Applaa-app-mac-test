// Debug script to test exactly what the failing test is doing
async function testModuleImports() {
  console.log('Testing module imports exactly like the failing test...');
  
  try {
    // Import both modules like the test does
    const systemPromptModule = await import('./src/prompts/system_prompt.js');
    const expoSystemPromptModule = await import('./src/prompts/expo_system_prompt.js');
    
    console.log('\n=== SYSTEM PROMPT MODULE ===');
    console.log('Keys:', Object.keys(systemPromptModule));
    const systemContent = JSON.stringify(systemPromptModule);
    console.log('Contains applaa-write:', systemContent.includes('applaa-write'));
    console.log('Content length:', systemContent.length);
    console.log('First 200 chars:', systemContent.substring(0, 200));
    
    console.log('\n=== EXPO SYSTEM PROMPT MODULE ===');
    console.log('Keys:', Object.keys(expoSystemPromptModule));
    const expoContent = JSON.stringify(expoSystemPromptModule);
    console.log('Contains applaa-write:', expoContent.includes('applaa-write'));
    console.log('Content length:', expoContent.length);
    console.log('First 200 chars:', expoContent.substring(0, 200));
    
    // Test the exact same logic as the failing test
    const modules = [systemPromptModule, expoSystemPromptModule];
    
    modules.forEach((module, index) => {
      const content = JSON.stringify(module);
      const hasApplaaWrite = content.includes('applaa-write');
      console.log(`\nModule ${index + 1} test result:`);
      console.log('  Has applaa-write:', hasApplaaWrite);
      if (!hasApplaaWrite) {
        console.log('  ❌ TEST WOULD FAIL HERE');
        // Show some content to debug
        console.log('  Sample content:', content.substring(0, 500));
      } else {
        console.log('  ✅ TEST WOULD PASS');
      }
    });
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testModuleImports();