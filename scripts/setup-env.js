#!/usr/bin/env node
/**
 * Setup Environment File
 * 
 * This script automatically creates a .env file from .env.example
 * if .env doesn't already exist. This ensures that forked repositories
 * have the necessary environment configuration to run the application.
 */

const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
const envExamplePath = path.join(__dirname, '..', '.env.example');

// Check if .env file already exists
if (fs.existsSync(envPath)) {
  console.log('✅ .env file already exists, skipping setup');
  process.exit(0);
}

// Check if .env.example exists
if (!fs.existsSync(envExamplePath)) {
  console.error('❌ .env.example file not found');
  process.exit(1);
}

try {
  // Copy .env.example to .env
  const envExampleContent = fs.readFileSync(envExamplePath, 'utf8');
  fs.writeFileSync(envPath, envExampleContent);
  
  console.log('✅ Created .env file from .env.example');
  console.log('');
  console.log('🔧 Next steps:');
  console.log('   1. Open .env file and replace placeholder values with your actual Segment credentials');
  console.log('   2. Get your Segment Space ID and Access Token from your Segment workspace');
  console.log('   3. Add your source write keys for the sources you want to use');
  console.log('   4. Update workspace and space slugs to match your Segment configuration');
  console.log('');
  console.log('📖 See README.md for detailed setup instructions');
} catch (error) {
  console.error('❌ Failed to create .env file:', error.message);
  process.exit(1);
}
