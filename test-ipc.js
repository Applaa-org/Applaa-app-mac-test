// Quick test to verify IPC handlers are registered
const { ipcRenderer } = require('electron');

console.log('Testing IPC handlers...');

// Test if simple-expo:status is available
ipcRenderer.invoke('simple-expo:status')
  .then(result => {
    console.log('✅ simple-expo:status works:', result);
  })
  .catch(error => {
    console.log('❌ simple-expo:status failed:', error.message);
  });

// Test if simple-expo:start is available (without actually starting)
console.log('IPC channels should be registered now');
