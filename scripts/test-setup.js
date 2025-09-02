#!/usr/bin/env node

/**
 * Simple test script to verify the setup
 * Run with: node scripts/test-setup.js
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Kairat Notify Bot Setup...\n');

// Check if .env file exists
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  console.log('✅ .env file found');
  
  // Check if required variables are set
  require('dotenv').config();
  
  if (process.env.BOT_TOKEN) {
    console.log('✅ BOT_TOKEN is set');
  } else {
    console.log('❌ BOT_TOKEN is missing');
  }
  
  if (process.env.CHAT_ID) {
    console.log('✅ CHAT_ID is set');
  } else {
    console.log('❌ CHAT_ID is missing');
  }
} else {
  console.log('❌ .env file not found');
  console.log('   Please create .env file with BOT_TOKEN and CHAT_ID');
}

// Check if node_modules exists
const nodeModulesPath = path.join(__dirname, '..', 'node_modules');
if (fs.existsSync(nodeModulesPath)) {
  console.log('✅ Dependencies installed');
} else {
  console.log('❌ Dependencies not installed');
  console.log('   Run: npm install');
}

// Check if dist directory exists (after build)
const distPath = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  console.log('✅ Project built');
} else {
  console.log('⚠️  Project not built yet');
  console.log('   Run: npm run build');
}

console.log('\n📋 Next steps:');
console.log('1. Make sure .env file has BOT_TOKEN and CHAT_ID');
console.log('2. Run: npm install');
console.log('3. Run: npm run build');
console.log('4. Run: npm start');
console.log('\n💡 Send /status to your bot to test manually');
