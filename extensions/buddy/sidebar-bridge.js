// Sidebar Bridge - Injects skill plans into Buddy's React chat
console.log('🌉 Sidebar bridge loaded');

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('📨 Sidebar received:', message.type);

    if (message.type === 'BUDDY_SHOW_SKILL_PLAN') {
        const { skillId, message: planMessage } = message.payload;

        console.log('💬 Injecting skill plan into chat:', skillId);

        // Find the chat input (Buddy's React app uses a textarea or input)
        const chatInput = document.querySelector('textarea[placeholder*="Ask"]') ||
            document.querySelector('input[placeholder*="Ask"]') ||
            document.querySelector('textarea') ||
            document.querySelector('input[type="text"]');

        if (chatInput) {
            // Set the value
            chatInput.value = planMessage;

            // Trigger React's onChange event
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                window.HTMLTextAreaElement.prototype || window.HTMLInputElement.prototype,
                'value'
            ).set;
            nativeInputValueSetter.call(chatInput, planMessage);

            // Dispatch input event for React
            chatInput.dispatchEvent(new Event('input', { bubbles: true }));
            chatInput.dispatchEvent(new Event('change', { bubbles: true }));

            // Focus the input
            chatInput.focus();

            console.log('✅ Skill plan injected into chat input');

            // Auto-submit after a brief delay (optional)
            setTimeout(() => {
                // Find and click the send button
                const sendButton = document.querySelector('button[type="submit"]') ||
                    document.querySelector('button:has(svg)') ||
                    Array.from(document.querySelectorAll('button')).find(btn =>
                        btn.textContent.includes('Send') ||
                        btn.querySelector('svg')
                    );

                if (sendButton) {
                    sendButton.click();
                    console.log('✅ Auto-submitted skill plan');
                } else {
                    console.warn('⚠️ Send button not found, user must submit manually');
                }
            }, 500);

            sendResponse({ success: true });
        } else {
            console.error('❌ Chat input not found');
            sendResponse({ success: false, error: 'Chat input not found' });
        }
    }

    return true; // Async response
});

console.log('✅ Sidebar bridge ready');
