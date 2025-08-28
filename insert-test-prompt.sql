-- Insert a test prompt for verifying @prompt mention functionality
INSERT INTO prompts (title, description, content, created_at, updated_at) 
VALUES (
  'Test Prompt',
  'A test prompt for verifying @prompt mention functionality',
  'This is a test prompt for verification. It should appear when typing @Test Prompt in chat inputs.',
  unixepoch(),
  unixepoch()
);

-- Verify the insertion
SELECT * FROM prompts WHERE title = 'Test Prompt';