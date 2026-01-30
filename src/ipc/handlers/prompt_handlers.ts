// Prompts feature temporarily disabled for MVP
// import { ipcMain } from "electron";
// import { db } from "../../db/index";
// import { prompts } from "../../db/schema";
// import { eq } from "drizzle-orm";
// import { PromptItem } from "../../lib/schemas";
// import { seedPromptsDatabase, clearPromptsDatabase, reseedPromptsDatabase } from "../../scripts/seed-prompts";

interface CreatePromptParams {
  title: string;
  description?: string;
  content: string;
  category?: string;
}

interface UpdatePromptParams {
  id: number;
  title: string;
  description?: string;
  content: string;
  category?: string;
}

interface DeletePromptParams {
  id: number;
}

// List all prompts
// Prompts IPC handlers disabled for MVP
/*
ipcMain.handle("prompts:list", async (): Promise<PromptItem[]> => {
  try {
    const result = await db.select().from(prompts).orderBy(prompts.createdAt);
    return result.map(prompt => ({
      id: prompt.id,
      title: prompt.title,
      description: prompt.description,
      content: prompt.content,
      category: prompt.category,
      createdAt: prompt.createdAt,
      updatedAt: prompt.updatedAt,
    }));
  } catch (error) {
    console.error("Error listing prompts:", error);
    throw new Error("Failed to list prompts");
  }
});

// Create a new prompt
ipcMain.handle("prompts:create", async (_, params: CreatePromptParams): Promise<PromptItem> => {
  try {
    const now = new Date();
    const [newPrompt] = await db.insert(prompts).values({
      title: params.title,
      description: params.description || null,
      content: params.content,
      category: params.category || "General",
      createdAt: now,
      updatedAt: now,
    }).returning();
    
    return {
      id: newPrompt.id,
      title: newPrompt.title,
      description: newPrompt.description,
      content: newPrompt.content,
      category: newPrompt.category,
      createdAt: newPrompt.createdAt,
      updatedAt: newPrompt.updatedAt,
    };
  } catch (error) {
    console.error("Error creating prompt:", error);
    throw new Error("Failed to create prompt");
  }
});

// Update an existing prompt
ipcMain.handle("prompts:update", async (_, params: UpdatePromptParams): Promise<void> => {
  try {
    const now = new Date();
    await db.update(prompts)
      .set({
        title: params.title,
        description: params.description || null,
        content: params.content,
        category: params.category || "General",
        updatedAt: now,
      })
      .where(eq(prompts.id, params.id));
  } catch (error) {
    console.error("Error updating prompt:", error);
    throw new Error("Failed to update prompt");
  }
});

// Delete a prompt
ipcMain.handle("prompts:delete", async (_, params: DeletePromptParams): Promise<void> => {
  try {
    await db.delete(prompts).where(eq(prompts.id, params.id));
  } catch (error) {
    console.error("Error deleting prompt:", error);
    throw new Error("Failed to delete prompt");
  }
});

// Seed prompts with predefined data
ipcMain.handle("prompts:seed", async (): Promise<{ success: boolean; message: string }> => {
  try {
    console.log('IPC Handler: Starting prompt seeding process...');
    await seedPromptsDatabase();
    console.log('IPC Handler: Prompt seeding completed successfully');
    return { success: true, message: "Prompts seeded successfully" };
  } catch (error) {
    console.error('IPC Handler: Error seeding prompts - Full details:');
    console.error('Error type:', typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace available');
    console.error('Raw error object:', error);
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { 
      success: false, 
      message: `Failed to seed prompts: ${errorMessage}` 
    };
  }
});

// Clear all prompts
ipcMain.handle("prompts:clear", async (): Promise<{ success: boolean; message: string }> => {
  try {
    await clearPromptsDatabase();
    return { success: true, message: "All prompts cleared successfully" };
  } catch (error) {
    console.error("Error clearing prompts:", error);
    return { success: false, message: "Failed to clear prompts" };
  }
});

// Re-seed prompts (clear and seed)
ipcMain.handle("prompts:reseed", async (): Promise<{ success: boolean; message: string }> => {
  try {
    await reseedPromptsDatabase();
    return { success: true, message: "Prompts re-seeded successfully" };
  } catch (error) {
    console.error("Error re-seeding prompts:", error);
    return { success: false, message: "Failed to re-seed prompts" };
  }
});
*/

export function registerPromptHandlers() {
  // Prompts feature temporarily disabled for MVP
}