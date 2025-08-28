#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

console.log('🚀 Setting up Applaa Web Platform...\n')

// Check if .env.local exists
const envPath = path.join(__dirname, '..', '.env.local')
if (!fs.existsSync(envPath)) {
  console.log('📝 Creating .env.local from template...')
  const envExamplePath = path.join(__dirname, '..', '.env.example')
  fs.copyFileSync(envExamplePath, envPath)
  console.log('✅ .env.local created. Please fill in your environment variables.\n')
} else {
  console.log('✅ .env.local already exists.\n')
}

// Check Node.js version
const nodeVersion = process.version
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0])
if (majorVersion < 18) {
  console.error('❌ Node.js 18+ is required. Current version:', nodeVersion)
  process.exit(1)
}
console.log('✅ Node.js version check passed:', nodeVersion)

// Install dependencies
console.log('📦 Installing dependencies...')
try {
  execSync('npm install', { stdio: 'inherit' })
  console.log('✅ Dependencies installed successfully.\n')
} catch (error) {
  console.error('❌ Failed to install dependencies:', error.message)
  process.exit(1)
}

// Check if Docker is available
try {
  execSync('docker --version', { stdio: 'pipe' })
  console.log('✅ Docker is available for development environments.')
} catch (error) {
  console.log('⚠️  Docker not found. Development environments will not work without Docker.')
}

console.log('\n🎉 Setup complete!')
console.log('\nNext steps:')
console.log('1. Fill in your environment variables in .env.local')
console.log('2. Set up your Supabase project and run the database schema')
console.log('3. Configure Google OAuth credentials')
console.log('4. Run "npm run dev" to start the development server')
console.log('\nFor detailed instructions, see README.md')