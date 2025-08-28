/**
 * CORS-safe script injector for Applaa element selector
 * This script runs in the Expo iframe and listens for postMessage commands
 */

(function() {
  'use strict';
  
  console.log('🎯 Applaa CORS-safe injector loaded');
  
  // Listen for messages from parent window
  window.addEventListener('message', function(event) {
    // Only accept messages from our parent
    if (event.source !== window.parent) return;
    
    if (event.data?.type === 'applaa-inject-element-selector') {
      console.log('🎯 Received element selector injection request');
      
      try {
        // Execute the script in this context
        eval(event.data.script);
        console.log('🎯 Element selector script executed successfully');
      } catch (error) {
        console.error('🎯 Failed to execute element selector script:', error);
        
        // Send error back to parent
        window.parent.postMessage({
          type: 'applaa-element-selector-error',
          error: error.message
        }, '*');
      }
    }
    
    if (event.data?.type === 'applaa-activate-element-selector') {
      console.log('🎯 Received element selector activation request');
      
      if (window.__applaaElementSelector) {
        window.__applaaElementSelector.activate();
      } else {
        console.warn('🎯 Element selector not available for activation');
      }
    }
    
    if (event.data?.type === 'applaa-deactivate-element-selector') {
      console.log('🎯 Received element selector deactivation request');
      
      if (window.__applaaElementSelector) {
        window.__applaaElementSelector.deactivate();
      }
    }
  });
  
  // Notify parent that injector is ready
  window.parent.postMessage({
    type: 'applaa-cors-injector-ready'
  }, '*');
})();





