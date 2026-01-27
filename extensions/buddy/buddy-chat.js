// Buddy Side Panel Script - Chat Integration
console.log('💬 Buddy chat script loaded');

// Listen for skill plan messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'BUDDY_SHOW_SKILL_PLAN') {
        const { skillId, message: planMessage } = message.payload;

        console.log('📋 Displaying skill plan in chat:', skillId);

        // Add Buddy's message to the chat
        addBuddyMessage(planMessage, skillId);

        sendResponse({ success: true });
    }
});

/**
 * Add Buddy's message to the chat interface
 */
function addBuddyMessage(message, skillId) {
    const chatContainer = document.getElementById('chat-messages');
    if (!chatContainer) {
        console.error('Chat container not found');
        return;
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = 'buddy-message skill-plan-message';
    messageDiv.dataset.skillId = skillId;

    // Convert markdown-style formatting to HTML
    const formattedMessage = message
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');

    messageDiv.innerHTML = `
        <div class="message-avatar">🤖</div>
        <div class="message-content">
            <div class="message-text">${formattedMessage}</div>
            <div class="message-actions">
                <button class="approve-btn" onclick="approveSkill('${skillId}')">
                    ✅ Yes, let's go!
                </button>
                <button class="cancel-btn" onclick="cancelSkill('${skillId}')">
                    ❌ Not now
                </button>
            </div>
        </div>
    `;

    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

/**
 * User approved the skill - execute it!
 */
window.approveSkill = function (skillId) {
    console.log('✅ User approved skill:', skillId);

    // Disable buttons
    const messageDiv = document.querySelector(`.skill-plan-message[data-skill-id="${skillId}"]`);
    if (messageDiv) {
        const buttons = messageDiv.querySelectorAll('button');
        buttons.forEach(btn => btn.disabled = true);
    }

    // Add confirmation message
    addUserMessage('Yes, let\'s go! 🚀');

    // Execute the skill via background script
    chrome.runtime.sendMessage({
        type: 'EXECUTE_SKILL',
        payload: { skillId }
    }, (response) => {
        if (response.success) {
            addBuddyMessage(`🎬 Starting "${skillId}"! Watch the magic happen in the new tab! ✨`);
        } else {
            addBuddyMessage(`❌ Oops! Failed to start: ${response.error}`);
        }
    });
};

/**
 * User cancelled the skill
 */
window.cancelSkill = function (skillId) {
    console.log('❌ User cancelled skill:', skillId);

    // Disable buttons
    const messageDiv = document.querySelector(`.skill-plan-message[data-skill-id="${skillId}"]`);
    if (messageDiv) {
        const buttons = messageDiv.querySelectorAll('button');
        buttons.forEach(btn => btn.disabled = true);
    }

    addUserMessage('Not now, thanks!');
    addBuddyMessage('No problem! Let me know if you want to try something else! 😊');
};

/**
 * Add user's message to chat
 */
function addUserMessage(text) {
    const chatContainer = document.getElementById('chat-messages');
    if (!chatContainer) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = 'user-message';
    messageDiv.innerHTML = `
        <div class="message-content">
            <div class="message-text">${text}</div>
        </div>
        <div class="message-avatar">👤</div>
    `;

    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

console.log('✅ Buddy chat script ready');
