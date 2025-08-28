// Test script to create and verify prompt functionality
// This script will be executed in the context of the running Electron app

const { ipcRenderer } = require('electron');

async function testPromptFunctionality() {
  try {
    console.log('Testing prompt functionality...');
    
    // List existing prompts
    const existingPrompts = await ipcRenderer.invoke('prompts:list');
    console.log('Existing prompts:', existingPrompts.length);
    
    // Check if test prompt exists
    const testPrompt = existingPrompts.find(p => p.title === 'Test Prompt');
    
    if (!testPrompt) {
      console.log('Creating test prompt...');
      
      // Create test prompt
      const newPrompt = await ipcRenderer.invoke('prompts:create', {
        title: 'Test Prompt',
        description: 'A test prompt for verifying @prompt mention functionality',
        content: 'This is a test prompt for verification. It should appear when typing @Test Prompt in chat inputs.'
      });
      
      console.log('Test prompt created:', newPrompt);
    } else {
      console.log('Test prompt already exists:', testPrompt);
    }
    
    // List all prompts again to verify
    const allPrompts = await ipcRenderer.invoke('prompts:list');
    console.log('All prompts after creation:', allPrompts.map(p => ({ id: p.id, title: p.title })));
    
    return true;
  } catch (error) {
    console.error('Error testing prompt functionality:', error);
    return false;
  }
}

// Export for use in renderer process
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testPromptFunctionality };
}

// Auto-run if in renderer context
if (typeof window !== 'undefined' && window.ipcRenderer) {
  testPromptFunctionality();
}