import log from 'electron-log';

const logger = log.scope('browser-planner');

export type BrowserAction = 'navigate' | 'fill' | 'click' | 'extract' | 'wait' | 'scroll' | 'select';

export interface BrowserTask {
    id: string;
    description: string;
    action: BrowserAction;
    params: Record<string, any>;
    validation: {
        type: 'url' | 'element' | 'text' | 'none';
        expected?: string;
    };
    status: 'pending' | 'running' | 'success' | 'failed';
    result?: any;
    error?: string;
}

export interface BrowserPlan {
    goal: string;
    tasks: BrowserTask[];
    currentStep: number;
    status: 'pending' | 'running' | 'completed' | 'failed';
}

/**
 * Browser Task Planner
 * Breaks down user goals into sequential browser automation tasks
 */
export class BrowserPlanner {
    /**
     * Create a browser automation plan from user goal
     */
    async createPlan(goal: string): Promise<BrowserPlan> {
        logger.info(`📋 Creating browser plan for: ${goal}`);

        // Use LLM to break down the goal into tasks
        const tasks = await this.breakDownGoal(goal);

        const plan: BrowserPlan = {
            goal,
            tasks,
            currentStep: 0,
            status: 'pending'
        };

        logger.info(`✅ Plan created with ${tasks.length} tasks`);
        return plan;
    }

    /**
     * Break down goal into specific browser tasks
     */
    private async breakDownGoal(goal: string): Promise<BrowserTask[]> {
        // For now, use heuristic-based planning
        // TODO: Replace with LLM-based planning for more complex scenarios

        const goalLower = goal.toLowerCase();
        const tasks: BrowserTask[] = [];

        // Flight search pattern
        if (goalLower.includes('flight') || goalLower.includes('fly')) {
            return this.createFlightSearchPlan(goal);
        }

        // Google search pattern
        if (goalLower.includes('search') && goalLower.includes('google')) {
            return this.createGoogleSearchPlan(goal);
        }

        // Amazon search pattern
        if (goalLower.includes('amazon')) {
            return this.createAmazonSearchPlan(goal);
        }

        // Generic navigation
        if (goalLower.startsWith('go to') || goalLower.startsWith('open')) {
            const url = this.extractUrl(goal);
            return [{
                id: '1',
                description: `Navigate to ${url}`,
                action: 'navigate',
                params: { url },
                validation: { type: 'url', expected: url },
                status: 'pending'
            }];
        }

        // Default: try to extract intent
        logger.warn('⚠️ Could not match goal to known pattern, using generic plan');
        return this.createGenericPlan(goal);
    }

    /**
     * Create plan for flight search
     */
    private createFlightSearchPlan(goal: string): BrowserTask[] {
        // Extract origin and destination
        const match = goal.match(/from\s+(\w+)\s+to\s+(\w+)/i);
        const origin = match?.[1] || 'London';
        const destination = match?.[2] || 'Hyderabad';

        return [
            {
                id: '1',
                description: 'Navigate to Google Flights',
                action: 'navigate',
                params: { url: 'https://www.google.com/travel/flights' },
                validation: { type: 'url', expected: 'google.com/travel/flights' },
                status: 'pending'
            },
            {
                id: '2',
                description: 'Wait for page to load',
                action: 'wait',
                params: { selector: 'input[placeholder*="Where from"]', timeout: 5000 },
                validation: { type: 'element', expected: 'input[placeholder*="Where from"]' },
                status: 'pending'
            },
            {
                id: '3',
                description: `Enter origin: ${origin}`,
                action: 'fill',
                params: { selector: 'input[placeholder*="Where from"]', text: origin },
                validation: { type: 'none' },
                status: 'pending'
            },
            {
                id: '4',
                description: `Enter destination: ${destination}`,
                action: 'fill',
                params: { selector: 'input[placeholder*="Where to"]', text: destination },
                validation: { type: 'none' },
                status: 'pending'
            },
            {
                id: '5',
                description: 'Click search button',
                action: 'click',
                params: { selector: 'button[aria-label*="Search"]' },
                validation: { type: 'url', expected: 'search' },
                status: 'pending'
            },
            {
                id: '6',
                description: 'Wait for results',
                action: 'wait',
                params: { selector: '[role="list"]', timeout: 10000 },
                validation: { type: 'element', expected: '[role="list"]' },
                status: 'pending'
            },
            {
                id: '7',
                description: 'Extract flight information',
                action: 'extract',
                params: { selector: '[role="list"]' },
                validation: { type: 'none' },
                status: 'pending'
            }
        ];
    }

    /**
     * Create plan for Google search
     */
    private createGoogleSearchPlan(goal: string): BrowserTask[] {
        // Extract search query
        const match = goal.match(/search.*?for\s+["']?([^"']+)["']?/i);
        const query = match?.[1] || goal.replace(/search|google/gi, '').trim();

        return [
            {
                id: '1',
                description: 'Navigate to Google',
                action: 'navigate',
                params: { url: 'https://www.google.com' },
                validation: { type: 'url', expected: 'google.com' },
                status: 'pending'
            },
            {
                id: '2',
                description: 'Wait for search box',
                action: 'wait',
                params: { selector: 'textarea[name="q"]', timeout: 5000 },
                validation: { type: 'element', expected: 'textarea[name="q"]' },
                status: 'pending'
            },
            {
                id: '3',
                description: `Enter search query: ${query}`,
                action: 'fill',
                params: { selector: 'textarea[name="q"]', text: query },
                validation: { type: 'none' },
                status: 'pending'
            },
            {
                id: '4',
                description: 'Submit search',
                action: 'click',
                params: { selector: 'input[name="btnK"]' },
                validation: { type: 'url', expected: 'search' },
                status: 'pending'
            },
            {
                id: '5',
                description: 'Wait for results',
                action: 'wait',
                params: { selector: '#search', timeout: 10000 },
                validation: { type: 'element', expected: '#search' },
                status: 'pending'
            }
        ];
    }

    /**
     * Create plan for Amazon search
     */
    private createAmazonSearchPlan(goal: string): BrowserTask[] {
        const match = goal.match(/search.*?for\s+["']?([^"']+)["']?/i);
        const query = match?.[1] || goal.replace(/amazon|search/gi, '').trim();

        return [
            {
                id: '1',
                description: 'Navigate to Amazon',
                action: 'navigate',
                params: { url: 'https://www.amazon.com' },
                validation: { type: 'url', expected: 'amazon.com' },
                status: 'pending'
            },
            {
                id: '2',
                description: 'Wait for search box',
                action: 'wait',
                params: { selector: '#twotabsearchtextbox', timeout: 5000 },
                validation: { type: 'element', expected: '#twotabsearchtextbox' },
                status: 'pending'
            },
            {
                id: '3',
                description: `Search for: ${query}`,
                action: 'fill',
                params: { selector: '#twotabsearchtextbox', text: query },
                validation: { type: 'none' },
                status: 'pending'
            },
            {
                id: '4',
                description: 'Click search button',
                action: 'click',
                params: { selector: '#nav-search-submit-button' },
                validation: { type: 'url', expected: '/s?' },
                status: 'pending'
            },
            {
                id: '5',
                description: 'Wait for results',
                action: 'wait',
                params: { selector: '[data-component-type="s-search-result"]', timeout: 10000 },
                validation: { type: 'element', expected: '[data-component-type="s-search-result"]' },
                status: 'pending'
            }
        ];
    }

    /**
     * Create generic plan
     */
    private createGenericPlan(goal: string): BrowserTask[] {
        return [
            {
                id: '1',
                description: `Analyze goal: ${goal}`,
                action: 'navigate',
                params: { url: 'https://www.google.com' },
                validation: { type: 'url', expected: 'google.com' },
                status: 'pending'
            }
        ];
    }

    /**
     * Extract URL from goal text
     */
    private extractUrl(goal: string): string {
        const urlMatch = goal.match(/https?:\/\/[^\s]+/);
        if (urlMatch) return urlMatch[0];

        const domainMatch = goal.match(/(?:go to|open)\s+([a-z0-9.-]+\.[a-z]{2,})/i);
        if (domainMatch) return `https://${domainMatch[1]}`;

        return 'https://www.google.com';
    }
}

// Singleton instance
export const browserPlanner = new BrowserPlanner();
