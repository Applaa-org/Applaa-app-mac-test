// Script to create a test prompt using the application's IPC handlers
const { ipcRenderer } = require('electron');

async function createTestPromptViaIPC() {
  try {
    console.log('Creating test prompt via IPC...');
    
    // First, check if test prompt already exists
    const existingPrompts = await ipcRenderer.invoke('prompts:list');
    console.log('Existing prompts:', existingPrompts);
    
    const testPromptExists = existingPrompts.find(p => p.title === 'Test Prompt');
    
    if (testPromptExists) {
      console.log('Test prompt already exists:', testPromptExists);
      return testPromptExists;
    }
    
    // Create new test prompt
    const testPromptData = {
      title: 'Test Prompt',
      description: 'A test prompt for verifying @prompt mention functionality',
      content: 'This is a test prompt for verification. It should appear when typing @Test Prompt in chat inputs.'
    };
    
    const newPrompt = await ipcRenderer.invoke('prompts:create', testPromptData);
    console.log('Test prompt created successfully:', newPrompt);
    
    // Verify by listing all prompts again
    const updatedPrompts = await ipcRenderer.invoke('prompts:list');
    console.log('All prompts after creation:', updatedPrompts);
    
    return newPrompt;
  } catch (error) {
    console.error('Error creating test prompt via IPC:', error);
    throw error;
  }
}

// Export for use in renderer process
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { createTestPromptViaIPC };
}

// For browser console usage
if (typeof window !== 'undefined') {
  window.createTestPromptViaIPC = createTestPromptViaIPC;
}