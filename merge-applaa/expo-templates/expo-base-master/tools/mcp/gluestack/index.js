#!/usr/bin/env node
// Thin launcher for Gluestack MCP inside app template
// This file proxies to the gluestack/mcp package if installed as a dependency.

const path = require('path');

async function main() {
  try {
    const mcp = require('@gluestack/mcp');
    const [cmd, payloadJson] = process.argv.slice(2);
    const payload = payloadJson ? JSON.parse(payloadJson) : {};

    if (cmd === 'generate-screen' && mcp.generateScreen) {
      const out = await mcp.generateScreen(payload);
      process.stdout.write(typeof out === 'string' ? out : JSON.stringify(out));
      process.exit(0);
      return;
    }
    if (cmd === 'generate-component' && mcp.generateComponent) {
      const out = await mcp.generateComponent(payload);
      process.stdout.write(typeof out === 'string' ? out : JSON.stringify(out));
      process.exit(0);
      return;
    }
    console.error('Unknown command or MCP methods not available');
    process.exit(1);
  } catch (e) {
    console.error('Gluestack MCP not installed or failed:', e && e.message ? e.message : e);
    process.exit(1);
  }
}

main();


