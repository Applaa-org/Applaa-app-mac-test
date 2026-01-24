// Applaa Kids Hub Integration
// Opens Kids Hub in an iframe within Buddy sidebar and handles skill selection

(function () {
    'use strict';

    console.log('[Applaa] Kids Hub integration loaded');

    let kidsHubIframe = null;

    function injectKidsHubButton() {
        const root = document.getElementById('root');
        if (!root) return;

        // Check if already injected
        if (document.getElementById('applaa-skills-btn')) return;

        // Find the "+ New" button
        const newButton = Array.from(document.querySelectorAll('button')).find(btn =>
            btn.textContent.trim() === '+ New' || btn.textContent.includes('New')
        );

        if (!newButton) {
            console.log('[Applaa] + New button not found, retrying...');
            return;
        }

        // Create Skills button matching the "+ New" style
        const skillsButton = document.createElement('button');
        skillsButton.id = 'applaa-skills-btn';

        // Copy styles from "+ New" button
        const computedStyle = window.getComputedStyle(newButton);
        skillsButton.style.cssText = `
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: ${computedStyle.padding};
            background: ${computedStyle.background};
            color: ${computedStyle.color};
            border: ${computedStyle.border};
            border-radius: ${computedStyle.borderRadius};
            font-size: ${computedStyle.fontSize};
            font-weight: ${computedStyle.fontWeight};
            font-family: ${computedStyle.fontFamily};
            cursor: pointer;
            margin-left: 8px;
            transition: all 0.2s ease;
        `;

        skillsButton.innerHTML = `
            <span style="font-size: 14px;">🎯</span>
            <span>Skills</span>
        `;

        // Insert after the "+ New" button
        newButton.parentNode.insertBefore(skillsButton, newButton.nextSibling);

        skillsButton.addEventListener('click', openKidsHub);

        console.log('[Applaa] Skills button injected next to + New');
    }

    function openKidsHub() {
        console.log('[Applaa] Opening Kids Hub');

        // Create overlay
        const overlay = document.createElement('div');
        overlay.id = 'kids-hub-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: white;
            z-index: 10000;
            display: flex;
            flex-direction: column;
        `;

        // Create header
        const header = document.createElement('div');
        header.style.cssText = `
            padding: 16px;
            border-bottom: 2px solid #e5e7eb;
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        `;
        header.innerHTML = `
            <h2 style="margin: 0; font-size: 18px; font-weight: 600;">🎯 Applaa Skills Hub</h2>
            <button id="close-kids-hub-btn" style="
                background: rgba(255,255,255,0.2);
                border: none;
                color: white;
                padding: 8px 16px;
                border-radius: 8px;
                cursor: pointer;
                font-weight: 600;
            ">✕ Close</button>
        `;

        // Create iframe
        kidsHubIframe = document.createElement('iframe');
        kidsHubIframe.src = chrome.runtime.getURL('marketplace.html');
        kidsHubIframe.style.cssText = `
            flex: 1;
            border: none;
            width: 100%;
        `;

        overlay.appendChild(header);
        overlay.appendChild(kidsHubIframe);
        document.body.appendChild(overlay);

        // Close button handler
        document.getElementById('close-kids-hub-btn').addEventListener('click', closeKidsHub);

        console.log('[Applaa] Kids Hub opened');
    }

    function closeKidsHub() {
        const overlay = document.getElementById('kids-hub-overlay');
        if (overlay) {
            overlay.remove();
            kidsHubIframe = null;
            console.log('[Applaa] Kids Hub closed');
        }
    }

    // Listen for messages from Kids Hub iframe
    window.addEventListener('message', (event) => {
        // Verify origin
        if (!event.data || event.data.source !== 'applaa-kids-hub') return;

        console.log('[Applaa] Received message from Kids Hub:', event.data.type);

        if (event.data.type === 'SKILL_SELECTED') {
            const { skillPlan, formattedMessage } = event.data.payload;

            console.log('[Applaa] Skill selected:', skillPlan.id);

            // Close the Kids Hub
            closeKidsHub();

            // Display the skill plan in chat
            setTimeout(() => {
                displaySkillPlanInChat(formattedMessage, skillPlan.id);
            }, 300);
        }
    });

    function displaySkillPlanInChat(message, skillId) {
        console.log('[Applaa] Displaying skill plan in chat');

        // Find chat container - try multiple selectors
        const chatContainer = document.querySelector('[class*="messages"]') ||
            document.querySelector('[class*="chat"]') ||
            document.querySelector('[role="log"]') ||
            document.querySelector('main') ||
            document.getElementById('root');

        if (!chatContainer) {
            console.error('[Applaa] Chat container not found');
            alert('Could not find chat area. Please try again.');
            return;
        }

        // Create skill plan card
        const skillCard = document.createElement('div');
        skillCard.id = 'applaa-skill-plan-card';
        skillCard.style.cssText = `
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 16px;
            margin: 16px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        `;

        // Format the message with proper line breaks
        const formattedText = message
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');

        skillCard.innerHTML = `
            <div style="margin-bottom: 16px;">
                <div style="font-size: 20px; margin-bottom: 8px;">🤖 Buddy</div>
                <div style="font-size: 14px; line-height: 1.6; opacity: 0.95;">
                    ${formattedText}
                </div>
            </div>
            <div style="display: flex; gap: 12px; margin-top: 20px;">
                <button id="applaa-skill-accept" style="
                    flex: 1;
                    padding: 12px 24px;
                    background: #10b981;
                    color: white;
                    border: none;
                    border-radius: 12px;
                    font-weight: 600;
                    font-size: 14px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
                " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                    ✅ Let's Go!
                </button>
                <button id="applaa-skill-reject" style="
                    flex: 1;
                    padding: 12px 24px;
                    background: rgba(255, 255, 255, 0.2);
                    color: white;
                    border: 2px solid rgba(255, 255, 255, 0.5);
                    border-radius: 12px;
                    font-weight: 600;
                    font-size: 14px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                " onmouseover="this.style.background='rgba(255, 255, 255, 0.3)'" onmouseout="this.style.background='rgba(255, 255, 255, 0.2)'">
                    ❌ Not Now
                </button>
            </div>
        `;

        // Append to chat container
        chatContainer.appendChild(skillCard);

        // Scroll to the skill card
        skillCard.scrollIntoView({ behavior: 'smooth', block: 'end' });

        // Add button handlers
        document.getElementById('applaa-skill-accept').addEventListener('click', () => {
            console.log('[Applaa] User accepted skill plan:', skillId);
            skillCard.remove();
            showNotification('🚀 Starting skill execution!');
            // TODO: Trigger actual skill execution via IPC
            // window.electron?.ipcRenderer.invoke('skill:execute', skillId);
        });

        document.getElementById('applaa-skill-reject').addEventListener('click', () => {
            console.log('[Applaa] User rejected skill plan');
            skillCard.remove();
            showNotification('👍 No problem! Try another skill anytime.');
        });

        console.log('[Applaa] Skill plan card displayed');
    }

    function showNotification(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #10b981;
            color: white;
            padding: 16px 24px;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10001;
            font-weight: 600;
        `;
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // Inject button when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectKidsHubButton);
    } else {
        injectKidsHubButton();
    }

    // Single retry after a short delay for dynamic content
    setTimeout(injectKidsHubButton, 500);

    console.log('[Applaa] Kids Hub integration ready');
})();
