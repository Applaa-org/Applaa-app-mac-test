// Applaa Buddy Quick Access Button
// This script injects a floating button that helps kids find the extension

(function () {
  'use strict';

  // Create floating Buddy button
  const buddyButton = document.createElement('div');
  buddyButton.id = 'applaa-buddy-button';
  buddyButton.innerHTML = `
    <div id="applaa-buddy-btn" style="
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 999999;
      background: linear-gradient(135deg, #FF6B35 0%, #4CAF50 100%);
      color: white;
      padding: 15px 25px;
      border-radius: 50px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.3);
      cursor: pointer;
      font-family: 'Arial', sans-serif;
      font-weight: bold;
      font-size: 16px;
      display: flex;
      align-items: center;
      gap: 10px;
      transition: transform 0.2s, box-shadow 0.2s;
    " onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 6px 20px rgba(0,0,0,0.4)';" onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 4px 15px rgba(0,0,0,0.3)';">
      <span style="font-size: 24px;">🤖</span>
      <span>Ask Applaa Buddy</span>
    </div>
  `;

  // Add click handler - show tooltip pointing to extension icon
  buddyButton.addEventListener('click', () => {
    // Create a tooltip pointing to the extension icon
    const tooltip = document.createElement('div');
    tooltip.style.cssText = `
      position: fixed;
      top: 10px;
      right: 100px;
      background: #FF6B35;
      color: white;
      padding: 15px 20px;
      border-radius: 10px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.3);
      z-index: 9999999;
      font-family: Arial, sans-serif;
      font-size: 14px;
      font-weight: bold;
      animation: bounce 0.5s ease-in-out infinite;
    `;
    tooltip.innerHTML = `
      👆 Click the Applaa Buddy icon here! →
      <style>
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      </style>
    `;

    document.body.appendChild(tooltip);

    // Remove tooltip after 5 seconds
    setTimeout(() => {
      tooltip.remove();
    }, 5000);
  });

  // Add to page when DOM is ready
  if (document.body) {
    document.body.appendChild(buddyButton);
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      document.body.appendChild(buddyButton);
    });
  }
})();
