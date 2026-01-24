/**
 * Safety Filter for Kid-Friendly Prompts
 * Protects children from inappropriate content and personal data requests
 */

export interface SafetyCheckResult {
    safe: boolean;
    reason?: string;
    category?: 'personal-data' | 'adult-content' | 'dangerous' | 'inappropriate';
}

/**
 * Check if a prompt is safe for kids
 */
export function filterPrompt(prompt: string): SafetyCheckResult {
    const lowerPrompt = prompt.toLowerCase();

    // Check for personal data requests
    const personalDataCheck = checkPersonalData(lowerPrompt);
    if (!personalDataCheck.safe) {
        return personalDataCheck;
    }

    // Check for adult content
    const adultContentCheck = checkAdultContent(lowerPrompt);
    if (!adultContentCheck.safe) {
        return adultContentCheck;
    }

    // Check for dangerous instructions
    const dangerousCheck = checkDangerousContent(lowerPrompt);
    if (!dangerousCheck.safe) {
        return dangerousCheck;
    }

    // Check for inappropriate language
    const inappropriateCheck = checkInappropriateLanguage(lowerPrompt);
    if (!inappropriateCheck.safe) {
        return inappropriateCheck;
    }

    return { safe: true };
}

/**
 * Check for personal data requests
 */
function checkPersonalData(prompt: string): SafetyCheckResult {
    const personalDataKeywords = [
        'my name',
        'my address',
        'my phone',
        'my email',
        'my password',
        'my credit card',
        'my social security',
        'my birthday',
        'where i live',
        'my school',
        'my parents',
        'my location'
    ];

    for (const keyword of personalDataKeywords) {
        if (prompt.includes(keyword)) {
            return {
                safe: false,
                reason: 'This prompt asks for personal information. For your safety, please don\'t share personal details.',
                category: 'personal-data'
            };
        }
    }

    return { safe: true };
}

/**
 * Check for adult content
 */
function checkAdultContent(prompt: string): SafetyCheckResult {
    // Basic check - in production, use a more sophisticated filter
    const adultKeywords = [
        'violence',
        'weapon',
        'gun',
        'knife',
        'blood',
        'kill',
        'death',
        'scary',
        'horror'
    ];

    // Allow some game-related terms
    const gameExceptions = ['shooter', 'space shooter', 'water gun'];

    for (const keyword of adultKeywords) {
        if (prompt.includes(keyword)) {
            // Check if it's in a game context
            const isGameContext = gameExceptions.some(exception => prompt.includes(exception));

            if (!isGameContext) {
                return {
                    safe: false,
                    reason: 'This content might not be appropriate for kids. Try something fun and friendly instead!',
                    category: 'adult-content'
                };
            }
        }
    }

    return { safe: true };
}

/**
 * Check for dangerous instructions
 */
function checkDangerousContent(prompt: string): SafetyCheckResult {
    const dangerousKeywords = [
        'hack',
        'crack',
        'steal',
        'cheat',
        'virus',
        'malware',
        'exploit',
        'break into',
        'password crack'
    ];

    for (const keyword of dangerousKeywords) {
        if (prompt.includes(keyword)) {
            return {
                safe: false,
                reason: 'This prompt contains instructions that could be harmful. Let\'s build something positive instead!',
                category: 'dangerous'
            };
        }
    }

    return { safe: true };
}

/**
 * Check for inappropriate language
 */
function checkInappropriateLanguage(prompt: string): SafetyCheckResult {
    // Basic profanity filter - in production, use a comprehensive list
    const inappropriateWords = [
        'stupid',
        'dumb',
        'idiot',
        'hate'
    ];

    for (const word of inappropriateWords) {
        // Check for whole word matches to avoid false positives
        const regex = new RegExp(`\\b${word}\\b`, 'i');
        if (regex.test(prompt)) {
            return {
                safe: false,
                reason: 'Let\'s use kind and friendly language! Try rephrasing your idea.',
                category: 'inappropriate'
            };
        }
    }

    return { safe: true };
}

/**
 * Sanitize a prompt by removing potentially unsafe content
 * Use this as a fallback if you want to auto-fix instead of blocking
 */
export function sanitizePrompt(prompt: string): string {
    let sanitized = prompt;

    // Remove common personal data patterns
    sanitized = sanitized.replace(/\b\d{3}-\d{3}-\d{4}\b/g, '[PHONE]'); // Phone numbers
    sanitized = sanitized.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]'); // Emails
    sanitized = sanitized.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]'); // SSN

    return sanitized;
}

/**
 * Get a kid-friendly error message for blocked prompts
 */
export function getKidFriendlyMessage(result: SafetyCheckResult): string {
    if (result.safe) {
        return '';
    }

    const messages = {
        'personal-data': '🛡️ Safety First! We can\'t ask for personal information. Let\'s focus on building something cool instead!',
        'adult-content': '🎨 Let\'s Keep It Fun! Try making a game, robot project, or logic puzzle instead!',
        'dangerous': '⚠️ Oops! That doesn\'t sound safe. How about we build something helpful and positive?',
        'inappropriate': '😊 Let\'s Be Kind! Use friendly words to describe what you want to make.'
    };

    return result.category ? messages[result.category] : result.reason || 'This prompt needs to be adjusted.';
}
