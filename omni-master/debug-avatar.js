#!/usr/bin/env node

/**
 * Debug script to test avatar generation locally
 * Run with: node debug-avatar.js
 */

const axios = require('axios');
require('dotenv').config();

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const TEST_TOKEN = process.env.TEST_TOKEN; // You'll need to provide this

console.log('🔍 Avatar Generation Debug Script');
console.log('Base URL:', BASE_URL);
console.log('Token present:', !!TEST_TOKEN);

if (!TEST_TOKEN) {
  console.log('❌ Please set TEST_TOKEN environment variable with a valid JWT token');
  process.exit(1);
}

async function testSystem() {
  try {
    console.log('\n--- Testing System Health ---');
    const testResponse = await axios.post(`${BASE_URL}/api/avatars/test`, {}, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ System test passed');
    console.log('Response:', JSON.stringify(testResponse.data, null, 2));
    
  } catch (error) {
    console.log('❌ System test failed');
    console.log('Status:', error.response?.status);
    console.log('Data:', error.response?.data);
    return false;
  }
  
  return true;
}

async function testAvatarGeneration() {
  try {
    console.log('\n--- Testing Avatar Generation ---');
    const response = await axios.post(`${BASE_URL}/api/avatars/generate`, {
      mode: 'text',
      prompt: 'A professional headshot of a business person'
    }, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Avatar generation request successful');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    const jobId = response.data.data?.jobId;
    if (jobId) {
      console.log('\n--- Checking Job Status ---');
      // Wait a bit then check status
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const statusResponse = await axios.get(`${BASE_URL}/api/avatars/job/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${TEST_TOKEN}`
        }
      });
      
      console.log('Job status:', JSON.stringify(statusResponse.data, null, 2));
    }
    
  } catch (error) {
    console.log('❌ Avatar generation test failed');
    console.log('Status:', error.response?.status);
    console.log('Data:', JSON.stringify(error.response?.data, null, 2));
  }
}

async function runTests() {
  const systemOk = await testSystem();
  if (systemOk) {
    await testAvatarGeneration();
  }
}

runTests().catch(console.error);
