const fs = require('fs');
const path = require('path');

// Read the extracted Excel data
const extractedDataPath = path.join(__dirname, 'extracted-excel-data.json');
const extractedData = JSON.parse(fs.readFileSync(extractedDataPath, 'utf8'));

// Function to convert Excel data to prompt format
function convertToPromptFormat() {
  const { dataWithHeaders } = extractedData;
  
  // Filter out any empty rows and convert to prompt format
  const appIdeasPrompts = dataWithHeaders
    .filter(row => row.Title && row.Description && row.Prompt)
    .map((row, index) => {
      // Clean up the prompt content - remove \r\n and normalize whitespace
      const cleanPrompt = row.Prompt
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/\n+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      // Create a clean description from the category
      const description = `${row.Description} - ${row.Title}`;
      
      return {
        title: row.Title,
        description: description,
        content: cleanPrompt,
        category: 'App Ideas'
      };
    });
  
  console.log(`Converted ${appIdeasPrompts.length} app ideas to prompt format`);
  
  // Save the converted prompts to a file for inspection
  const outputPath = path.join(__dirname, 'converted-app-ideas-prompts.json');
  fs.writeFileSync(outputPath, JSON.stringify(appIdeasPrompts, null, 2));
  console.log(`Converted prompts saved to: ${outputPath}`);
  
  return appIdeasPrompts;
}

// Function to update prompt-seeds.ts
function updatePromptSeeds(appIdeasPrompts) {
  const promptSeedsPath = path.join(__dirname, 'src', 'data', 'prompt-seeds.ts');
  
  // Read the current prompt-seeds.ts file
  let promptSeedsContent = fs.readFileSync(promptSeedsPath, 'utf8');
  
  // Find the seedPrompts array
  const seedPromptsStart = promptSeedsContent.indexOf('export const seedPrompts: SeedPrompt[] = [');
  const seedPromptsEnd = promptSeedsContent.lastIndexOf('];');
  
  if (seedPromptsStart === -1 || seedPromptsEnd === -1) {
    throw new Error('Could not find seedPrompts array in prompt-seeds.ts');
  }
  
  // Extract the current prompts
  const beforeArray = promptSeedsContent.substring(0, seedPromptsStart);
  const arrayStart = 'export const seedPrompts: SeedPrompt[] = [';
  const afterArray = promptSeedsContent.substring(seedPromptsEnd + 2);
  
  // Get existing prompts (everything between the array brackets)
  const existingPromptsStr = promptSeedsContent.substring(
    seedPromptsStart + arrayStart.length,
    seedPromptsEnd
  ).trim();
  
  // Convert app ideas to TypeScript format
  const appIdeasPromptsStr = appIdeasPrompts.map(prompt => {
    const escapedTitle = prompt.title.replace(/'/g, "\\'").replace(/"/g, '\\"');
    const escapedDescription = prompt.description.replace(/'/g, "\\'").replace(/"/g, '\\"');
    const escapedContent = prompt.content.replace(/'/g, "\\'").replace(/"/g, '\\"');
    
    return `  {
    title: '${escapedTitle}',
    description: '${escapedDescription}',
    content: '${escapedContent}',
    category: 'App Ideas'
  }`;
  }).join(',\n');
  
  // Combine existing prompts with new app ideas
  let newPromptsArray;
  if (existingPromptsStr) {
    newPromptsArray = `${arrayStart}\n${existingPromptsStr},\n${appIdeasPromptsStr}\n];`;
  } else {
    newPromptsArray = `${arrayStart}\n${appIdeasPromptsStr}\n];`;
  }
  
  // Reconstruct the file
  const newContent = beforeArray + newPromptsArray + afterArray;
  
  // Write the updated content back to the file
  fs.writeFileSync(promptSeedsPath, newContent, 'utf8');
  
  console.log(`Updated prompt-seeds.ts with ${appIdeasPrompts.length} new app ideas`);
}

// Main execution
if (require.main === module) {
  try {
    console.log('Converting Excel data to prompt format...');
    const appIdeasPrompts = convertToPromptFormat();
    
    console.log('\nUpdating prompt-seeds.ts...');
    updatePromptSeeds(appIdeasPrompts);
    
    console.log('\n✅ Successfully added all app ideas to prompt-seeds.ts!');
    console.log(`Total app ideas added: ${appIdeasPrompts.length}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

module.exports = { convertToPromptFormat, updatePromptSeeds };