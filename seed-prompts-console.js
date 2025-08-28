// Console script to seed prompts via IPC
// Run this in the browser console when the app is open

async function seedPromptsViaConsole() {
  try {
    console.log('Starting prompt seeding via IPC...');
    
    // Access the IPC client from the window object
    if (window.ipcClient) {
      const result = await window.ipcClient.seedPrompts();
      console.log('Seeding result:', result);
      
      if (result.success) {
        console.log('✅ Prompts seeded successfully!');
        console.log('Message:', result.message);
      } else {
        console.error('❌ Failed to seed prompts:', result.message);
      }
    } else {
      console.error('❌ IPC client not available. Make sure the app is running.');
    }
  } catch (error) {
    console.error('❌ Error during seeding:', error);
  }
}

// Run the seeding function
seedPromptsViaConsole();

// Also provide a manual function for the user
console.log('To manually seed prompts, run: seedPromptsViaConsole()');