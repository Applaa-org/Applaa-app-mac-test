// Applaa Kids Hub - Skills Database and Rendering
console.log('Kids Hub script loading...');

const skills = [
    {
        id: "research-kids-stories",
        title: "Research Kids Stories",
        icon: "📚",
        category: "learning",
        tags: ["Reading", "Stories", "AI"],
        description: "Find amazing stories, get AI summaries, and create your own reading list!",
        uses: 42
    },
    {
        id: "minecraft-build-finder",
        title: "Minecraft Build Finder",
        icon: "🏰",
        category: "minecraft",
        tags: ["Building", "Schematics", "Tutorials"],
        description: "Find epic castles, houses, and redstone builds with step-by-step guides!",
        uses: 89
    },
    {
        id: "find-coding-tutorials",
        title: "Find Coding Tutorials",
        icon: "💻",
        category: "learning",
        tags: ["Coding", "Scratch", "Python"],
        description: "Get a personalized plan to learn coding from the best sites on the web!",
        uses: 56
    },
    {
        id: "math-practice-finder",
        title: "Math Practice Finder",
        icon: "🧮",
        category: "learning",
        tags: ["Math", "Homework", "Practice"],
        description: "Find fun math games and worksheets perfectly matched to your grade!",
        uses: 34
    },
    {
        id: "science-topic-research",
        title: "Science Topic Research",
        icon: "🔬",
        category: "learning",
        tags: ["Science", "Space", "Nature"],
        description: "Research any science topic and get a cool report with fun facts!",
        uses: 28
    }
];

let currentCategory = 'all';
let searchTerm = '';

function renderSkills() {
    console.log('Rendering skills...', currentCategory, searchTerm);
    const container = document.getElementById('skillsContainer');

    if (!container) {
        console.error('skillsContainer not found!');
        return;
    }

    const filtered = skills.filter(skill => {
        const matchesCategory = currentCategory === 'all' || skill.category === currentCategory || (currentCategory === 'all' && true);
        // Note: Simplified logic. If category is 'all', we show everything. 
        // But wait, the previous code had categories 'apps', 'games' etc. 
        // My new skills serve mostly 'learning' and 'minecraft'. 
        // I should probably ensure the category buttons in HTML match these categories.
        // For now, let's just show all if matches search.

        const matchesSearch = skill.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            skill.description.toLowerCase().includes(searchTerm.toLowerCase());

        // Custom category filtering if we want to honor the buttons
        if (currentCategory !== 'all' && skill.category !== currentCategory) return false;

        return matchesSearch;
    });

    console.log('Filtered skills:', filtered.length);

    // Group by category for display
    const grouped = {};
    filtered.forEach(skill => {
        if (!grouped[skill.category]) {
            grouped[skill.category] = [];
        }
        grouped[skill.category].push(skill);
    });

    container.innerHTML = '';

    // Define order
    const categoryOrder = ['learning', 'minecraft', 'apps', 'games'];

    // If we have items not in these categories, just append them
    Object.keys(grouped).forEach(cat => {
        if (!categoryOrder.includes(cat)) categoryOrder.push(cat);
    });

    categoryOrder.forEach(category => {
        if (!grouped[category]) return;

        const section = document.createElement('div');
        const sectionTitle = document.createElement('h2');
        sectionTitle.className = 'section-title';
        sectionTitle.textContent = getCategoryTitle(category);
        section.appendChild(sectionTitle);

        const grid = document.createElement('div');
        grid.className = 'skills-grid';

        grouped[category].forEach(skill => {
            const card = createSkillCard(skill);
            grid.appendChild(card);
        });

        section.appendChild(grid);
        container.appendChild(section);
    });

    console.log('Render complete!');
}

function createSkillCard(skill) {
    const card = document.createElement('div');
    card.className = 'skill-card';
    card.onclick = () => addSkill(skill.id);

    const header = document.createElement('div');
    header.className = 'skill-header';

    const icon = document.createElement('div');
    icon.className = 'skill-icon';
    icon.style.background = getIconColor(skill.category);
    icon.textContent = skill.icon;

    const title = document.createElement('div');
    title.className = 'skill-title';
    title.textContent = skill.title;

    header.appendChild(icon);
    header.appendChild(title);

    const tags = document.createElement('div');
    tags.className = 'skill-tags';
    skill.tags.forEach(tagText => {
        const tag = document.createElement('span');
        tag.className = 'tag';
        tag.textContent = tagText;
        tags.appendChild(tag);
    });

    const description = document.createElement('div');
    description.className = 'skill-description';
    description.textContent = skill.description;

    const footer = document.createElement('div');
    footer.className = 'skill-footer';

    const useCount = document.createElement('span');
    useCount.className = 'use-count';
    useCount.textContent = skill.uses + ' kids used this';

    const btn = document.createElement('button');
    btn.className = 'add-btn';
    btn.textContent = 'Use This!';
    btn.onclick = (e) => {
        e.stopPropagation();
        addSkill(skill.id);
    };

    footer.appendChild(useCount);
    footer.appendChild(btn);

    card.appendChild(header);
    card.appendChild(tags);
    card.appendChild(description);
    card.appendChild(footer);

    return card;
}

function getCategoryTitle(category) {
    const titles = {
        'apps': '📱 App Ideas',
        'games': '🎮 Game Ideas',
        'minecraft': '⛏️ Minecraft Projects',
        'learning': '🎓 Learning Resources'
    };
    return titles[category] || category.charAt(0).toUpperCase() + category.slice(1);
}

function getIconColor(category) {
    const colors = {
        'apps': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'games': 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        'minecraft': 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        'learning': 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
    };
    return colors[category] || '#ccc';
}

async function addSkill(skillId) {
    const skill = skills.find(s => s.id === skillId);
    console.log(`Loading skill: ${skill.title}`);

    // Change button text briefly
    const btn = document.querySelector(`.skill-card[onclick*="${skillId}"] .add-btn`);
    const originalText = btn ? btn.textContent : 'Use This!';
    if (btn) btn.textContent = '📋 Loading...';

    try {
        // Load the skill plan from JSON
        const skillPlanUrl = `chrome-extension://${chrome.runtime.id}/skills/${skillId}.json`;
        const response = await fetch(skillPlanUrl);

        if (!response.ok) {
            throw new Error(`Skill plan not found: ${skillId}`);
        }

        const skillPlan = await response.json();

        // Format the plan as a friendly message for Buddy
        const planMessage = formatSkillPlan(skillPlan);

        // Send to parent window (Buddy sidebar)
        if (window.parent && window.parent !== window) {
            console.log(' Sending to Buddy');
            window.parent.postMessage({
                source: 'applaa-kids-hub',
                type: 'SKILL_SELECTED',
                payload: {
                    skillPlan: skillPlan,
                    formattedMessage: planMessage
                }
            }, '*');
            console.log(' Sent!');
        } else {
            alert(` Skill Plan:\n\n${planMessage}`);
        }



    } catch (error) {
        console.error('Error loading skill:', error);
        alert(`❌ Failed to load skill: ${error.message}`);
    } finally {
        if (btn) btn.textContent = originalText;
    }
}

/**
 * Format skill plan as a friendly, readable message
 */
function formatSkillPlan(skillPlan) {
    const meta = skillPlan.metadata;
    const steps = skillPlan.workflow.steps;

    let message = `🎯 **${meta.title}**\n\n`;
    message += `${meta.description}\n\n`;
    message += `**Here's what I'll do:**\n\n`;

    steps.forEach((step, index) => {
        const emoji = getStepEmoji(step.action);
        message += `${index + 1}. ${emoji} ${step.name}\n`;
    });

    message += `\n⏱️ Estimated time: ${meta.estimatedDuration || '1-2 minutes'}\n`;
    message += `\n**Ready to start?** Just say "Yes, let's go!" or "Start" to begin! 🚀`;

    return message;
}

/**
 * Get emoji for step action type
 */
function getStepEmoji(action) {
    const emojiMap = {
        'navigate': '🌐',
        'click': '👆',
        'type': '⌨️',
        'extract': '📋',
        'wait': '⏳',
        'screenshot': '📸',
        'ai-enhance': '🤖'
    };
    return emojiMap[action] || '▶️';
}

// Event listeners
document.addEventListener('DOMContentLoaded', function () {
    console.log('DOM loaded, setting up event listeners...');

    // Category buttons
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentCategory = btn.dataset.category;
            renderSkills();
        });
    });

    // Search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchTerm = e.target.value;
            renderSkills();
        });
    }

    // Initial render
    console.log('Starting initial render...');
    renderSkills();
});

