// Run this in the browser console when Applaa is open
// This will clean all apps using the proper IPC handler

(async function cleanAllApps() {
  try {
    console.log('🧹 Starting app cleanup...');
    
    // Get IPC client instance
    const ipcClient = window.IpcClient?.getInstance();
    if (!ipcClient) {
      console.error('❌ IPC Client not available');
      return;
    }
    
    // Call the cleanup handler
    const result = await ipcClient.cleanAllApps();
    
    if (result.success) {
      console.log('✅ ' + result.message);
      console.log('🔄 Refreshing page...');
      window.location.reload();
    } else {
      console.error('❌ Cleanup failed:', result.message);
    }
    
  } catch (error) {
    console.error('❌ Cleanup error:', error);
  }
})();

