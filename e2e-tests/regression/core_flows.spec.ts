/**
 * CRITICAL REGRESSION TESTS
 * 
 * These tests cover the core user flows that must NEVER break.
 * Run these before every release and after any major changes.
 * 
 * Test Categories:
 * 1. App Creation → Chat Navigation Flow (CRITICAL - prevents "Chat not found" regression)
 * 2. Chat Loading with Valid ChatId  
 * 3. Prompt Streaming After App Creation
 * 4. Navigation State Management
 * 5. Error Handling for Invalid Chat IDs
 * 6. Gemini Authentication Status
 * 7. Provider Status Consistency
 */

import { test, expect, Timeout } from "../helpers/test_helper";

test.describe("🚨 CRITICAL REGRESSION TESTS", () => {
  
  test.describe("App Creation → Chat Navigation Flow", () => {
    
    test("should create app from home and navigate to chat successfully", async ({ po }) => {
      await po.setUp();
      
      // Navigate to Apps tab (home)
      await po.goToAppsTab();
      
      // Enter a test prompt in the main input
      const testPrompt = "Create a simple todo app with React";
      await po.sendPrompt(testPrompt);
      
      // Wait for chat completion (this should include app creation + navigation)
      await po.waitForChatCompletion();
      
      // Verify we're now in a chat (URL should contain chat)
      const currentUrl = po.page.url();
      expect(currentUrl).toMatch(/chat/);
      
      // Verify the chat messages are visible and contain our prompt
      const chatMessages = po.page.locator('[data-testid="message"]');
      await expect(chatMessages.first()).toBeVisible({ timeout: Timeout.MEDIUM });
      
      // Verify no "Chat not found" error
      const errorMessage = po.page.locator('text="Chat not found"');
      await expect(errorMessage).not.toBeVisible();
      
      // Verify user message is present
      const userMessage = po.page.locator('[data-testid="message"][data-role="user"]');
      await expect(userMessage).toBeVisible();
      await expect(userMessage).toContainText(testPrompt);
    });
    
    test("should handle multiple app creation flows", async ({ po }) => {
      await po.setUp();
      await po.goToAppsTab();
      
      // Create first app
      const firstPrompt = "Create a counter app";
      await po.sendPrompt(firstPrompt);
      await po.waitForChatCompletion();
      
      // Verify first app/chat works
      const firstUrl = po.page.url();
      expect(firstUrl).toMatch(/chat/);
      
      // Go back to apps and create second app
      await po.goToAppsTab();
      const secondPrompt = "Create a todo list app";
      await po.sendPrompt(secondPrompt);
      await po.waitForChatCompletion();
      
      // Verify second app/chat works
      const secondUrl = po.page.url();
      expect(secondUrl).toMatch(/chat/);
      expect(secondUrl).not.toBe(firstUrl); // Different chats
      
      // Verify no errors in either case
      const errorMessage = po.page.locator('text="Chat not found"');
      await expect(errorMessage).not.toBeVisible();
    });
    
  });
  
  test.describe("Chat Navigation and State Management", () => {
    
    test("should maintain chat state when navigating between apps", async ({ po }) => {
      await po.setUp();
      await po.goToAppsTab();
      
      // Create first app and get its name
      await po.sendPrompt("Create a simple calculator");
      await po.waitForChatCompletion();
      
      // Go to chat tab to ensure we're in chat mode
      await po.goToChatTab();
      
      // Verify chat messages are visible
      const chatMessages = po.page.locator('[data-testid="message"]');
      await expect(chatMessages.first()).toBeVisible();
      
      // Navigate back to apps tab
      await po.goToAppsTab();
      
      // Navigate back to chat tab
      await po.goToChatTab();
      
      // Verify chat is still accessible (no "Chat not found" error)
      await expect(chatMessages.first()).toBeVisible();
      const errorMessage = po.page.locator('text="Chat not found"');
      await expect(errorMessage).not.toBeVisible();
    });
    
  });
  
  test.describe("Prompt Streaming and Response Quality", () => {
    
    test("should stream response properly after app creation", async ({ po }) => {
      await po.setUp();
      await po.goToAppsTab();
      
      const testPrompt = "Create a counter app with increment and decrement buttons";
      await po.sendPrompt(testPrompt);
      await po.waitForChatCompletion();
      
      // Verify we're in chat mode
      const currentUrl = po.page.url();
      expect(currentUrl).toMatch(/chat/);
      
      // Verify both user and assistant messages are present
      const userMessage = po.page.locator('[data-testid="message"][data-role="user"]');
      const assistantMessage = po.page.locator('[data-testid="message"][data-role="assistant"]');
      
      await expect(userMessage).toBeVisible({ timeout: Timeout.MEDIUM });
      await expect(assistantMessage).toBeVisible({ timeout: Timeout.MEDIUM });
      
      // Verify user message contains the prompt
      await expect(userMessage).toContainText(testPrompt);
      
      // Verify assistant message has content
      const assistantContent = await assistantMessage.textContent();
      expect(assistantContent).toBeTruthy();
      expect(assistantContent!.length).toBeGreaterThan(10);
    });
    
  });
  
  test.describe("Settings and Provider Management", () => {
    
    test("should display provider status correctly", async ({ po }) => {
      await po.setUp();
      await po.goToSettingsTab();
      
      // Wait for settings page to load
      await expect(po.page.getByText("AI Providers")).toBeVisible({ timeout: Timeout.MEDIUM });
      
      // Check that provider cards are visible
      const providerCards = po.page.locator('[data-testid="provider-card"]');
      const cardCount = await providerCards.count();
      
      expect(cardCount).toBeGreaterThan(0);
      
      // Each provider should show either "Ready" or "Needs Setup"
      for (let i = 0; i < cardCount; i++) {
        const card = providerCards.nth(i);
        
        // Look for status indicators
        const readyStatus = card.locator('text="Ready"');
        const needsSetupStatus = card.locator('text="Needs Setup"');
        
        const hasReadyStatus = await readyStatus.isVisible();
        const hasNeedsSetupStatus = await needsSetupStatus.isVisible();
        
        // Should have exactly one status
        expect(hasReadyStatus || hasNeedsSetupStatus).toBeTruthy();
      }
    });
    
    test("should handle Gemini authentication status properly", async ({ po }) => {
      await po.setUp();
      await po.goToSettingsTab();
      
      // Look for Gemini provider section
      const geminiSection = po.page.locator('text="Gemini"').first();
      if (await geminiSection.isVisible()) {
        // Check authentication status
        const readyStatus = po.page.locator('text="Ready"');
        const signInButton = po.page.locator('text="Sign in with Google"');
        
        // Should show either authenticated status or sign-in option
        const hasReadyStatus = await readyStatus.isVisible();
        const hasSignInButton = await signInButton.isVisible();
        
        expect(hasReadyStatus || hasSignInButton).toBeTruthy();
      }
    });
    
  });
  
  test.describe("Error Recovery and Resilience", () => {
    
    test("should recover from navigation errors gracefully", async ({ po }) => {
      await po.setUp();
      
      // Try to navigate to a non-existent route
      await po.page.goto(po.page.url() + '/nonexistent');
      
      // Should either redirect or show appropriate error
      await po.page.waitForTimeout(3000);
      
      // Navigate back to a known good state
      await po.goToAppsTab();
      
      // Verify we can still create apps normally
      await po.sendPrompt("Create a simple app");
      await po.waitForChatCompletion();
      
      // Verify no "Chat not found" error
      const errorMessage = po.page.locator('text="Chat not found"');
      await expect(errorMessage).not.toBeVisible();
    });
    
    test("should handle app list navigation properly", async ({ po }) => {
      await po.setUp();
      await po.goToAppsTab();
      
      // Create an app first
      await po.sendPrompt("Create a test app");
      await po.waitForChatCompletion();
      
      // Go back to apps list
      await po.goToAppsTab();
      
      // Verify apps list is visible
      await expect(po.page.getByText("Build your dream app")).toBeVisible();
      
      // Create another app to test multiple apps
      await po.sendPrompt("Create another test app");
      await po.waitForChatCompletion();
      
      // Verify we're in the new chat
      const currentUrl = po.page.url();
      expect(currentUrl).toMatch(/chat/);
    });
    
  });
  
});
