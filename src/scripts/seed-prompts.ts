// Prompts feature temporarily disabled for MVP
// import { db } from '../db/index';
// import { prompts } from '../db/schema';
// import { seedPrompts } from '../data/prompt-seeds';

/**
 * Seeds the database with predefined prompts
 * This script can be run to populate the prompt library with high-quality, generic prompts
 */
export async function seedPromptsDatabase(): Promise<void> {
  // Prompts feature temporarily disabled for MVP
  console.log('Prompts seeding disabled for MVP');
  return;
  
  /* try {
    console.log('Starting prompt seeding...');
    console.log('Database connection status:', db ? 'Connected' : 'Not connected');
    
    // Test database connectivity first
    try {
      console.log('Testing database connectivity...');
      const testQuery = await db.select().from(prompts).limit(1);
      console.log('Database connectivity test passed');
    } catch (dbError) {
      console.error('Database connectivity test failed:', dbError);
      throw new Error(`Database connection failed: ${dbError instanceof Error ? dbError.message : String(dbError)}`);
    }
    
    // Check if prompts already exist to avoid duplicates
    console.log('Checking for existing prompts...');
    const existingPrompts = await db.select().from(prompts);
    
    if (existingPrompts.length > 0) {
      console.log(`Found ${existingPrompts.length} existing prompts. Checking for new prompts to add...`);
      
      // Get titles of existing prompts to avoid duplicates
      const existingTitles = new Set(existingPrompts.map(p => p.title));
      
      // Filter out prompts that already exist
      const newPrompts = seedPrompts.filter(prompt => !existingTitles.has(prompt.title));
      
      if (newPrompts.length === 0) {
        console.log('All seed prompts already exist in the database.');
        return;
      }
      
      console.log(`Adding ${newPrompts.length} new prompts...`);
      
      // Insert only new prompts
      console.log('Inserting new prompts:', newPrompts.map(p => p.title));
      try {
        await db.insert(prompts).values(
          newPrompts.map(prompt => ({
            title: prompt.title,
            description: prompt.description,
            content: prompt.content,
            category: prompt.category,
            createdAt: new Date(),
            updatedAt: new Date()
          }))
        );
        console.log('New prompts inserted successfully');
      } catch (insertError) {
        console.error('Error inserting new prompts:', insertError);
        throw new Error(`Failed to insert new prompts: ${insertError instanceof Error ? insertError.message : String(insertError)}`);
      }
      
      console.log(`Successfully added ${newPrompts.length} new prompts to the database.`);
    } else {
      console.log('No existing prompts found. Adding all seed prompts...');
      
      // Insert all seed prompts
      console.log('Inserting all seed prompts:', seedPrompts.length, 'prompts');
      try {
        await db.insert(prompts).values(
          seedPrompts.map(prompt => ({
            title: prompt.title,
            description: prompt.description,
            content: prompt.content,
            category: prompt.category,
            createdAt: new Date(),
            updatedAt: new Date()
          }))
        );
        console.log('All seed prompts inserted successfully');
      } catch (insertError) {
        console.error('Error inserting all seed prompts:', insertError);
        throw new Error(`Failed to insert seed prompts: ${insertError instanceof Error ? insertError.message : String(insertError)}`);
      }
      
      console.log(`Successfully seeded ${seedPrompts.length} prompts to the database.`);
    }
    
    // Display summary by category
    const finalPrompts = await db.select().from(prompts);
    const categoryCount = finalPrompts.reduce((acc, prompt) => {
      const category = prompt.category || 'Uncategorized';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('\nPrompt library summary:');
    Object.entries(categoryCount).forEach(([category, count]) => {
      console.log(`  ${category}: ${count} prompts`);
    });
    console.log(`  Total: ${finalPrompts.length} prompts`);
    
  } catch (error) {
    console.error('Error seeding prompts - Full error details:');
    console.error('Error type:', typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace available');
    console.error('Raw error object:', error);
    throw error;
  }
  */
}

/**
 * Clears all prompts from the database
 * Use with caution - this will delete all existing prompts
 */
export async function clearPromptsDatabase(): Promise<void> {
  // Prompts feature temporarily disabled for MVP
  console.log('Prompts clearing disabled for MVP');
  return;
}

/**
 * Re-seeds the database by clearing existing prompts and adding seed prompts
 */
export async function reseedPromptsDatabase(): Promise<void> {
  // Prompts feature temporarily disabled for MVP
  console.log('Prompts reseeding disabled for MVP');
  return;
}

// If this script is run directly, execute the seeding
if (require.main === module) {
  seedPromptsDatabase()
    .then(() => {
      console.log('Prompt seeding completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Prompt seeding failed:', error);
      process.exit(1);
    });
}