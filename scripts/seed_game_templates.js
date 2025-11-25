/**
 * Seed script to migrate Godot game templates from godotGamesData.ts to Supabase
 * 
 * This script reads the TypeScript data file and generates SQL INSERT statements
 * Run: node scripts/seed_game_templates.js > supabase_migrations/seed_game_templates.sql
 */

const fs = require('fs');
const path = require('path');

// Read the TypeScript file
const dataFile = path.join(__dirname, '../src/data/godotGamesData.ts');
const content = fs.readFileSync(dataFile, 'utf-8');

// Helper function to get emoji based on game name (same logic as in TypeScript)
function getEmojiForGame(name) {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('whale') || lowerName.includes('ocean') || lowerName.includes('sea')) return '🐋';
  if (lowerName.includes('violin') || lowerName.includes('music') || lowerName.includes('symphony') || lowerName.includes('choir')) return '🎻';
  if (lowerName.includes('ice') || lowerName.includes('snow') || lowerName.includes('frozen')) return '❄️';
  if (lowerName.includes('train')) return '🚂';
  if (lowerName.includes('clock') || lowerName.includes('time')) return '🕰️';
  if (lowerName.includes('house') || lowerName.includes('floor')) return '🏢';
  if (lowerName.includes('paint') || lowerName.includes('color')) return '🎨';
  if (lowerName.includes('toy') || lowerName.includes('puppet')) return '🧸';
  if (lowerName.includes('kingdom') || lowerName.includes('king')) return '👑';
  if (lowerName.includes('paper')) return '📄';
  if (lowerName.includes('wind')) return '🌬️';
  if (lowerName.includes('monster')) return '👹';
  if (lowerName.includes('apothecary') || lowerName.includes('potion') || lowerName.includes('laboratory')) return '🧪';
  if (lowerName.includes('weather') || lowerName.includes('storm')) return '🌦️';
  if (lowerName.includes('stone') || lowerName.includes('rock')) return '🪨';
  if (lowerName.includes('circus')) return '🎪';
  if (lowerName.includes('sand') || lowerName.includes('beach')) return '🏖️';
  if (lowerName.includes('moon') || lowerName.includes('lunar')) return '🌙';
  if (lowerName.includes('city') || lowerName.includes('urban')) return '🌃';
  if (lowerName.includes('orchard') || lowerName.includes('apple') || lowerName.includes('fruit')) return '🍎';
  if (lowerName.includes('thread') || lowerName.includes('weave')) return '🧵';
  if (lowerName.includes('mechanical') || lowerName.includes('machine') || lowerName.includes('clockwork')) return '⚙️';
  if (lowerName.includes('library') || lowerName.includes('book')) return '📚';
  if (lowerName.includes('river') || lowerName.includes('water')) return '🌊';
  if (lowerName.includes('shadow')) return '👤';
  if (lowerName.includes('dragon')) return '🐉';
  if (lowerName.includes('battle') || lowerName.includes('war') || lowerName.includes('combat')) return '⚔️';
  if (lowerName.includes('crystal') || lowerName.includes('gem')) return '💎';
  if (lowerName.includes('cyber') || lowerName.includes('digital') || lowerName.includes('hack')) return '💻';
  if (lowerName.includes('space') || lowerName.includes('galaxy') || lowerName.includes('star') || lowerName.includes('solar')) return '🚀';
  if (lowerName.includes('dungeon') || lowerName.includes('cave')) return '🗡️';
  if (lowerName.includes('eclipse') || lowerName.includes('dark')) return '🌑';
  if (lowerName.includes('element') || lowerName.includes('fire')) return '🔥';
  if (lowerName.includes('garden')) return '🌙';
  if (lowerName.includes('parkour') || lowerName.includes('run')) return '🏃';
  if (lowerName.includes('mystic') || lowerName.includes('magic')) return '🏔️';
  if (lowerName.includes('neon') || lowerName.includes('drift')) return '🏎️';
  if (lowerName.includes('phantom') || lowerName.includes('ghost')) return '👻';
  if (lowerName.includes('pixel')) return '🎮';
  if (lowerName.includes('arena') || lowerName.includes('fight')) return '🥊';
  if (lowerName.includes('survival') || lowerName.includes('wilderness')) return '🌲';
  if (lowerName.includes('candle') || lowerName.includes('light')) return '🕯️';
  if (lowerName.includes('carousel')) return '🎠';
  if (lowerName.includes('bridge')) return '🌉';
  if (lowerName.includes('robot') || lowerName.includes('mech')) return '🤖';
  if (lowerName.includes('season') || lowerName.includes('autumn')) return '🍂';
  if (lowerName.includes('volcano')) return '🌋';
  if (lowerName.includes('thunder') || lowerName.includes('lightning')) return '⚡';
  if (lowerName.includes('island') || lowerName.includes('voyage')) return '🏝️';
  if (lowerName.includes('windmill')) return '🏙️';
  if (lowerName.includes('wolf')) return '🐺';
  if (lowerName.includes('butterfly')) return '🦋';
  if (lowerName.includes('mirror')) return '🪞';
  if (lowerName.includes('detective') || lowerName.includes('mystery')) return '🔍';
  if (lowerName.includes('lighthouse')) return '🗼';
  if (lowerName.includes('hermit') || lowerName.includes('desert')) return '🏜️';
  if (lowerName.includes('child')) return '⛈️';
  return '🎮'; // Default emoji
}

// Function to escape SQL strings
function escapeSqlString(str) {
  if (!str) return 'NULL';
  // Replace single quotes with two single quotes (SQL escaping)
  // Replace newlines with \n
  return "'" + str.replace(/'/g, "''").replace(/\n/g, '\\n') + "'";
}

// Parse the TypeScript file to extract game data
// This is a simple parser - it looks for the pattern: name: "...", previewUrl: "...", details: `...`
const games = [];
const nameRegex = /name:\s*"([^"]+)"/g;
const previewUrlRegex = /previewUrl:\s*["']([^"']+)["']/g;
const detailsRegex = /details:\s*`([^`]+)`/gs;

let nameMatch;
let previewUrlMatch;
let detailsMatch;
const names = [];
const previewUrls = [];
const details = [];

// Extract all names
while ((nameMatch = nameRegex.exec(content)) !== null) {
  names.push(nameMatch[1]);
}

// Extract all preview URLs
while ((previewUrlMatch = previewUrlRegex.exec(content)) !== null) {
  previewUrls.push(previewUrlMatch[1].trim());
}

// Extract all details
while ((detailsMatch = detailsRegex.exec(content)) !== null) {
  details.push(detailsMatch[1]);
}

// Combine into games array
for (let i = 0; i < names.length; i++) {
  games.push({
    name: names[i],
    previewUrl: previewUrls[i] || null,
    details: details[i] || '',
    emoji: getEmojiForGame(names[i])
  });
}

// Generate SQL
console.log('-- Seed game templates from godotGamesData.ts');
console.log('-- This file was generated by scripts/seed_game_templates.js');
console.log('-- Run this after create_game_templates_table.sql migration\n');

console.log('-- Insert Godot game templates');
console.log('INSERT INTO public.game_templates (name, details, preview_url, emoji, app_type, is_default) VALUES');

const values = games.map((game, index) => {
  const name = escapeSqlString(game.name);
  const details = escapeSqlString(game.details);
  const previewUrl = game.previewUrl ? escapeSqlString(game.previewUrl.trim()) : 'NULL';
  const emoji = escapeSqlString(game.emoji);
  
  return `(${name}, ${details}, ${previewUrl}, ${emoji}, 'godot', true)`;
});

console.log(values.join(',\n') + '\nON CONFLICT (name, app_type) DO NOTHING;');

console.log('\n-- Note: ON CONFLICT DO NOTHING prevents errors if templates already exist');
console.log('-- The UNIQUE constraint on (name, app_type) ensures no duplicates');

