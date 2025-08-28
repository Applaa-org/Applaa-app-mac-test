// Test script to create a test prompt for verification
const Database = require('better-sqlite3');
const path = require('path');

// Database path (same as in the application)
const dbPath = path.join(__dirname, 'userData', 'sqlite.db');

async function createTestPrompt() {
  try {
    console.log('Connecting to database at:', dbPath);
    const db = new Database(dbPath);
    
    // Check if test prompt already exists
    const existingPrompt = db.prepare('SELECT * FROM prompts WHERE title = ?').get('Test Prompt');
    
    if (existingPrompt) {
      console.log('Test prompt already exists:', existingPrompt);
      db.close();
      return existingPrompt;
    }
    
    // Insert test prompt
    const insertStmt = db.prepare(`
      INSERT INTO prompts (title, description, content, created_at, updated_at) 
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const now = Math.floor(Date.now() / 1000); // Unix timestamp
    const result = insertStmt.run(
      'Test Prompt',
      'A test prompt for verifying @prompt mention functionality',
      'This is a test prompt for verification. It should appear when typing @Test Prompt in chat inputs.',
      now,
      now
    );
    
    console.log('Test prompt created with ID:', result.lastInsertRowid);
    
    // Verify the insertion
    const newPrompt = db.prepare('SELECT * FROM prompts WHERE id = ?').get(result.lastInsertRowid);
    console.log('Created prompt:', newPrompt);
    
    // List all prompts
    const allPrompts = db.prepare('SELECT id, title, description FROM prompts').all();
    console.log('All prompts in database:', allPrompts);
    
    db.close();
    return newPrompt;
  } catch (error) {
    console.error('Error creating test prompt:', error);
    throw error;
  }
}

// Run the function
createTestPrompt()
  .then(() => {
    console.log('Test prompt creation completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to create test prompt:', error);
    process.exit(1);
  });