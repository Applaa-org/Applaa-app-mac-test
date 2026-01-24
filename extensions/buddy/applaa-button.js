// Applaa Buddy - Big Button to Open Sidebar
// This creates a large, eye-catching button that directs kids to the toolbar icon

(function () {
    'use strict';

    // Create a big, friendly button
    const buddyButton = document.createElement('div');
    buddyButton.id = 'applaa-buddy-big-button';
    buddyButton.innerHTML = `
    <button id="applaa-buddy-btn" style="
      position: fixed;
      bottom: 30px;
      right: 30px;
      z-index: 999999;
      background: linear-gradient(135deg, #FF6B35 0%, #4CAF50 100%);
      color: white;
      padding: 20px 35px;
      border: none;
      border-radius: 60px;
      box-shadow: 0 8px 25px rgba(0,0,0,0.3);
      cursor: pointer;
      font-family: 'Arial', sans-serif;
      font-weight: bold;
      font-size: 20px;
      display: flex;
      align-items: center;
      gap: 15px;
      transition: all 0.3s ease;
      animation: pulse 2s infinite;
    " onmouseover="this.style.transform='scale(1.1)'; this.style.boxShadow='0 12px 35px rgba(0,0,0,0.4)';" onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 8px 25px rgba(0,0,0,0.3)';">
      <span style="font-size: 32px;">🤖</span>
      <span>Ask Applaa Buddy</span>
    </button>
    <div id="applaa-tooltip" style="
      position: fixed;
      top: 60px;
      right: 80px;
      background: #FF6B35;
      color: white;
      padding: 15px 25px;
      border-radius: 15px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.3);
      z-index: 999998;
      font-family: Arial, sans-serif;
      font-size: 16px;
      font-weight: bold;
      display: none;
      animation: bounce 0.5s ease-in-out infinite;
      max-width: 300px;
      text-align: center;
    ">
      👆 Click the Applaa Buddy icon in the top-right toolbar to open!
    </div>
    <style>
      @keyframes pulse {
        0%, 100% { 
          box-shadow: 0 8px 25px rgba(0,0,0,0.3);
        }
        50% { 
          box-shadow: 0 8px 35px rgba(255,107,53,0.6);
        }
      }
      @keyframes bounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-10px); }
      }
    </style>
  `;

    // Add click handler
    const button = buddyButton.querySelector('#applaa-buddy-btn');
    const tooltip = buddyButton.querySelector('#applaa-tooltip');

    if (button && tooltip) {
        button.addEventListener('click', () => {
            // Show tooltip pointing to toolbar icon
            tooltip.style.display = 'block';

            // Hide tooltip after 5 seconds
            setTimeout(() => {
                tooltip.style.display = 'none';
            }, 5000);

            // Also try to send message (might work in future Chrome versions)
            try {
                chrome.runtime.sendMessage({ type: 'openSidePanel' }, (response) => {
                    if (response && response.success) {
                        console.log('Applaa Buddy: Sidebar opened!');
                        buddyButton.style.display = 'none';
                    }
                });
            } catch (error) {
                console.log('Applaa Buddy: Please click the toolbar icon');
            }
        });
    }

    // Add to page when DOM is ready
    if (document.body) {
        document.body.appendChild(buddyButton);
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            document.body.appendChild(buddyButton);
        });
    }
})();
