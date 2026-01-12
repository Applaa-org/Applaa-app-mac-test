// TEMP: New addSkill function with postMessage
async function addSkill(skillId) {
    const skill = skills.find(s => s.id === skillId);
    console.log(`Loading skill: ${skill.title}`);

    const btn = document.querySelector(`.skill-card[onclick*="${skillId}"] .add-btn`);
    const originalText = btn ? btn.textContent : 'Use This!';
    if (btn) btn.textContent = '🚀 Loading...';

    try {
        const skillPlanUrl = `chrome-extension://${chrome.runtime.id}/skills/${skillId}.json`;
        const response = await fetch(skillPlanUrl);

        if (!response.ok) {
            throw new Error(`Skill plan not found: ${skillId}`);
        }

        const skillPlan = await response.json();
        const planMessage = formatSkillPlan(skillPlan);

        // Send to parent window (Buddy sidebar)
        if (window.parent && window.parent !== window) {
            console.log('📤 Sending to Buddy');
            window.parent.postMessage({
                source: 'applaa-kids-hub',
                type: 'SKILL_SELECTED',
                payload: {
                    skillPlan: skillPlan,
                    formattedMessage: planMessage
                }
            }, '*');
            console.log('✅ Sent!');
        } else {
            alert(`📋 ${planMessage}`);
        }

    } catch (error) {
        console.error('Error:', error);
        alert(`❌ Failed: ${error.message}`);
    } finally {
        if (btn) btn.textContent = originalText;
    }
}
