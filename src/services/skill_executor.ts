import { chromiumManager } from '../lib/browser/chromium-manager';
import { localBrain } from './local_brain';
import log from 'electron-log';
import {
    SkillPlan,
    WorkflowStep,
    ExecutionState
} from '../types/skill_types';
import * as fs from 'fs';
import * as path from 'path';
import { Page } from 'playwright';

const logger = log.scope('skill-executor');

export class SkillExecutor {
    private static instance: SkillExecutor;
    private activeExecutions: Map<string, ExecutionState> = new Map();

    private constructor() { }

    public static getInstance(): SkillExecutor {
        if (!SkillExecutor.instance) {
            SkillExecutor.instance = new SkillExecutor();
        }
        return SkillExecutor.instance;
    }

    /**
     * Load a skill plan from JSON file
     */
    public async loadSkill(skillId: string): Promise<SkillPlan | null> {
        try {
            // Assuming skills are stored in extensions/buddy/skills/
            // Try multiple paths to be safe
            const possiblePaths = [
                path.join(process.cwd(), 'extensions', 'buddy', 'skills', `${skillId}.json`),
                path.join(process.cwd(), 'resources', 'extensions', 'buddy', 'skills', `${skillId}.json`),
                path.join(process.cwd(), '..', 'extensions', 'buddy', 'skills', `${skillId}.json`)
            ];

            for (const p of possiblePaths) {
                if (fs.existsSync(p)) {
                    const content = fs.readFileSync(p, 'utf-8');
                    try {
                        return JSON.parse(content) as SkillPlan;
                    } catch (e) {
                        logger.error(`Failed to parse skill JSON at ${p}:`, e);
                    }
                }
            }

            logger.error(`Skill file not found for id: ${skillId}`);
            return null;
        } catch (error) {
            logger.error(`Failed to load skill ${skillId}:`, error);
            return null;
        }
    }

    /**
     * Start executing a skill
     */
    public async executeSkill(skillId: string, userInputs: Record<string, any> = {}): Promise<string> {
        const skill = await this.loadSkill(skillId);
        if (!skill) throw new Error(`Skill ${skillId} not found`);

        const executionId = `${skillId}-${Date.now()}`;
        const state: ExecutionState = {
            skillId,
            status: 'running',
            variables: { ...userInputs },
            logs: [],
            startTime: Date.now()
        };

        this.activeExecutions.set(executionId, state);

        // Start async execution without blocking
        this.runWorkflow(executionId, skill).catch(err => {
            logger.error(`Execution ${executionId} failed ungracefully:`, err);
            state.status = 'failed';
            state.error = err.message;
            this.log(executionId, `❌ Critical Error: ${err.message}`);
        });

        return executionId;
    }

    /**
     * Core workflow runner
     */
    private async runWorkflow(executionId: string, skill: SkillPlan) {
        const state = this.activeExecutions.get(executionId);
        if (!state) return;

        logger.info(`🚀 Starting execution of skill: ${skill.metadata.title}`);
        this.log(executionId, `🚀 Starting Skill: ${skill.metadata.title}`);

        // 1. Initialize Browser if needed
        if (!chromiumManager.isRunning()) {
            this.log(executionId, `Launching browser...`);
            await chromiumManager.launch();
        }

        // 2. Always create a fresh tab for a new skill execution
        // This ensures clean state and visibility (in headed mode)
        this.log(executionId, `Creating new workspace...`);
        const pageId = await chromiumManager.createTab('about:blank');
        const page = chromiumManager.getPage(pageId);

        if (!page) {
            throw new Error('Failed to obtain a valid browser page');
        }

        // Try to bring browser to front (best effort)
        try {
            await chromiumManager.switchTab(pageId);
        } catch (e) {
            logger.warn('Failed to switch to new tab:', e);
        }

        try {
            for (const step of skill.workflow.steps) {
                if (state.status !== 'running') {
                    this.log(executionId, `🛑 Execution stopped (Status: ${state.status})`);
                    break;
                }

                state.currentStepId = step.id;
                this.log(executionId, `➡️ Step: ${step.name}`);

                await this.executeStep(step, state, page);

                // Brief pause for realism/safety
                await page.waitForTimeout(1000);
            }

            if (state.status === 'running') {
                state.status = 'completed';
                state.endTime = Date.now();
                this.log(executionId, `✅ Skill finished successfully!`);
                logger.info(`✅ Skill execution completed: ${executionId}`);
            }

        } catch (error) {
            state.status = 'failed';
            state.error = error.message;
            this.log(executionId, `❌ Error at step ${state.currentStepId}: ${error.message}`);
            logger.error(`❌ Skill execution failed at step ${state.currentStepId}:`, error);
        }
    }

    /**
     * Execute a single workflow step
     */
    private async executeStep(step: WorkflowStep, state: ExecutionState, page: Page) {
        const executionId = `${state.skillId}-${state.startTime}`; // Reconstruct ID roughly or pass it
        // Actually we don't strictly need executionId in executeStep if we access state directly, 
        // but helper functions might need logging.
        // Let's attach a logger helper to state? No, simply use the one we have.
        const logPrefix = `[${state.skillId}]`;

        try {
            switch (step.action) {
                case 'navigate':
                    await this.handleNavigate(step, state, page);
                    break;
                case 'extract':
                    await this.handleExtract(step, state, page);
                    break;
                case 'type':
                    await this.handleType(step, state, page);
                    break;
                case 'click':
                    await this.handleClick(step, state, page);
                    break;
                case 'wait':
                    const duration = step.params.duration || 2000;
                    this.log(Object.keys(this.activeExecutions)[0], `Waiting ${duration}ms...`); // Hacky ID retrieval
                    await page.waitForTimeout(duration);
                    break;
                case 'screenshot':
                    // TODO
                    break;
                case 'ai-enhance':
                    await this.handleAiEnhance(step, state);
                    break;
                default:
                    logger.warn(`${logPrefix} Unknown action type: ${step.action}`);
            }
        } catch (error) {
            // Simple ReAct / Fallback logic
            if (step.fallback) {
                logger.warn(`${logPrefix} Step failed, attempting fallback: ${step.fallback.action}`);
                // We would recursively call executeStep with the fallback step definition
                // Constructing a temporary step object for the fallback
                const fallbackStep: WorkflowStep = {
                    id: `${step.id}-fallback`,
                    name: `${step.name} (Fallback)`,
                    action: step.fallback.action,
                    params: step.fallback.params,
                };
                await this.executeStep(fallbackStep, state, page);
            } else {
                throw error;
            }
        }
    }

    // --- Action Handlers ---

    private async handleNavigate(step: WorkflowStep, state: ExecutionState, page: Page) {
        const url = this.resolveVariables(step.params.url, state);
        logger.info(`Navigating to ${url}`);
        try {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
            // Extra wait for SPAs to settle
            await page.waitForTimeout(2000);
        } catch (e) {
            logger.warn(`Navigation timeout or error for ${url}, continuing anyway...`);
        }
    }

    private async handleExtract(step: WorkflowStep, state: ExecutionState, page: Page) {
        const selector = step.params.selector;
        const variableName = step.params.variable;
        const multiple = step.params.multiple || false;

        logger.info(`Extracting ${variableName} using '${selector}'`);

        let data: any;

        try {
            if (multiple) {
                // For multiple, we strictly expect a selector
                data = await page.$$eval(selector, (elements) => elements.map(el => el.textContent?.trim()));
            } else {
                // Smart Find for single element extraction
                const element = await this.findSmartElement(page, selector);
                if (element) {
                    if (step.params.attribute) {
                        data = await element.getAttribute(step.params.attribute);
                    } else {
                        data = await element.textContent();
                        data = data?.trim();
                    }
                } else {
                    logger.warn(`Could not find element to extract: ${selector}`);
                    data = null;
                }
            }
        } catch (e) {
            logger.error(`Extraction failed: ${e.message}`);
            data = null;
        }

        state.variables[variableName] = data;
        logger.info(`Extracted: ${JSON.stringify(data)?.substring(0, 50)}...`);
    }

    private async handleType(step: WorkflowStep, state: ExecutionState, page: Page) {
        const selector = step.params.selector;
        const text = this.resolveVariables(step.params.text, state);
        logger.info(`Typing "${text}" into '${selector}'`);

        const element = await this.findSmartElement(page, selector);
        if (!element) throw new Error(`Could not find input field: ${selector}`);

        await element.fill(text);
    }

    private async handleClick(step: WorkflowStep, state: ExecutionState, page: Page) {
        const selector = step.params.selector;
        logger.info(`Clicking '${selector}'`);

        const element = await this.findSmartElement(page, selector);
        if (!element) throw new Error(`Could not find clickable element: ${selector}`);

        // Robust click: ensure visible, scroll into view
        await element.scrollIntoViewIfNeeded();
        await element.click({ timeout: 5000 });
    }

    /**
     * 🧠 Smart Element Finder
     * Tries multiple strategies to find an element:
     * 1. Exact CSS Selector
     * 2. By Text (fuzzy)
     * 3. By Role (button, link)
     * 4. By Placeholder
     */
    private async findSmartElement(page: Page, query: string) {
        // Strategy 1: Is it a valid CSS selector and does it exist?
        try {
            const el = await page.$(query);
            if (el && await el.isVisible()) return el;
        } catch (e) { } // Ignore invalid selector errors

        // Strategy 2: Get by Text (Case insensitive, partial)
        try {
            const byText = page.getByText(query, { exact: false });
            if (await byText.count() > 0 && await byText.first().isVisible()) {
                return byText.first();
            }
        } catch (e) { }

        // Strategy 3: Get by Role (Button/Link) with name
        try {
            const byRoleBtn = page.getByRole('button', { name: query, exact: false });
            if (await byRoleBtn.count() > 0 && await byRoleBtn.first().isVisible()) return byRoleBtn.first();

            const byRoleLink = page.getByRole('link', { name: query, exact: false });
            if (await byRoleLink.count() > 0 && await byRoleLink.first().isVisible()) return byRoleLink.first();
        } catch (e) { }

        // Strategy 4: Placeholder (for inputs)
        try {
            const byPlaceholder = page.getByPlaceholder(query, { exact: false });
            if (await byPlaceholder.count() > 0 && await byPlaceholder.first().isVisible()) return byPlaceholder.first();
        } catch (e) { }

        // Strategy 5: Aria Label
        try {
            const byLabel = page.getByLabel(query);
            if (await byLabel.count() > 0 && await byLabel.first().isVisible()) return byLabel.first();
        } catch (e) { }

        // Strategy 6: Alt Text (Images)
        try {
            const byAlt = page.getByAltText(query);
            if (await byAlt.count() > 0 && await byAlt.first().isVisible()) return byAlt.first();
        } catch (e) { }

        return null;
    }

    private async handleAiEnhance(step: WorkflowStep, state: ExecutionState) {
        // Basic implementation: Embedding
        // Real implementation would call Gemini/Claude via another service
        const input = this.resolveVariables(step.params.input, state);
        if (input && typeof input === 'string') {
            logger.info(`Generating embedding for: ${input.substring(0, 20)}...`);
            const embedding = await localBrain.embed(input);
            if (step.params.outputVariable) {
                state.variables[step.params.outputVariable] = embedding;
            }
        }
    }

    // Helper to replace {{variableName}} with actual values
    private resolveVariables(text: string, state: ExecutionState): string {
        if (!text || typeof text !== 'string') return text;
        return text.replace(/\{\{(\w+)\}\}/g, (_, key) => {
            return state.variables[key] || `{{${key}}}`;
        });
    }

    private log(executionId: string, message: string) {
        const state = this.activeExecutions.get(executionId);
        if (state) {
            state.logs.push(`[${new Date().toLocaleTimeString()}] ${message}`);
        }
    }
}

export const skillExecutor = SkillExecutor.getInstance();
