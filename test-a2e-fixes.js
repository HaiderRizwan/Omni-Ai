#!/usr/bin/env node

/**
 * Test script to validate A2E API integration fixes
 * Run with: node test-a2e-fixes.js
 */

const axios = require('axios');
require('dotenv').config();

const A2E_API_KEY = process.env.A2E_API_KEY;
const A2E_VIDEO_BASE_URL = process.env.A2E_VIDEO_BASE_URL || 'https://video.a2e.ai/api/v1';

console.log('=== A2E API Integration Test ===\n');

if (!A2E_API_KEY) {
  console.error('❌ A2E_API_KEY not found in environment variables');
  process.exit(1);
}

console.log('✅ A2E_API_KEY found');
console.log('🌐 Base URL:', A2E_VIDEO_BASE_URL);

// Test 1: Check API connectivity
async function testConnectivity() {
  console.log('\n--- Test 1: API Connectivity ---');
  try {
    const response = await axios.get(`${A2E_VIDEO_BASE_URL}/anchor/character_list?type=custom`, {
      headers: { 'Authorization': `Bearer ${A2E_API_KEY}` },
      timeout: 10000
    });
    
    if (response.data.code === 0) {
      console.log('✅ API connectivity successful');
      console.log(`📊 Found ${response.data.data?.list?.length || 0} custom avatars`);
      return true;
    } else {
      console.log('❌ API returned error:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Connectivity failed:', error.message);
    if (error.response) {
      console.log('   Status:', error.response.status);
      console.log('   Data:', error.response.data);
    }
    return false;
  }
}

// Test 2: Test TTS functionality
async function testTTS() {
  console.log('\n--- Test 2: TTS Functionality ---');
  try {
    const response = await axios.post(`${A2E_VIDEO_BASE_URL}/video/send_tts`, {
      msg: "Hello, this is a test message for TTS functionality.",
      country: 'en',
      region: 'US',
      speechRate: 1.0
    }, {
      headers: {
        'Authorization': `Bearer ${A2E_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    if (response.data.code === 0) {
      console.log('✅ TTS generation successful');
      console.log('🔊 Audio URL:', response.data.data.audioSrc || response.data.data.audio_src);
      return true;
    } else {
      console.log('❌ TTS failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ TTS test failed:', error.message);
    if (error.response) {
      console.log('   Status:', error.response.status);
      console.log('   Data:', error.response.data);
    }
    return false;
  }
}

// Test 3: Test Nano Banana (text-to-image)
async function testNanoBanana() {
  console.log('\n--- Test 3: Nano Banana Text-to-Image ---');
  try {
    const response = await axios.post(`${A2E_VIDEO_BASE_URL}/userNanoBanana/start`, {
      name: "Test Image Generation",
      prompt: "A professional headshot of a business person, realistic style, high quality"
    }, {
      headers: {
        'Authorization': `Bearer ${A2E_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    if (response.data.code === 0) {
      console.log('✅ Nano Banana task started successfully');
      console.log('📋 Task ID:', response.data.data._id);
      
      // Test status checking
      const taskId = response.data.data._id;
      const statusResponse = await axios.post(`${A2E_VIDEO_BASE_URL}/video/awsResult`, {
        _id: taskId
      }, {
        headers: {
          'Authorization': `Bearer ${A2E_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Status check successful');
      console.log('📊 Current status:', statusResponse.data.data?.status || statusResponse.data.data?.current_status);
      return true;
    } else {
      console.log('❌ Nano Banana failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Nano Banana test failed:', error.message);
    if (error.response) {
      console.log('   Status:', error.response.status);
      console.log('   Data:', error.response.data);
    }
    return false;
  }
}

// Test 4: List available public voices
async function testVoiceList() {
  console.log('\n--- Test 4: Voice List ---');
  try {
    const response = await axios.get(`${A2E_VIDEO_BASE_URL}/anchor/voice_list?country=en&region=US&voice_map_type=en-US`, {
      headers: { 'Authorization': `Bearer ${A2E_API_KEY}` },
      timeout: 10000
    });
    
    if (response.data.code === 0) {
      console.log('✅ Voice list retrieved successfully');
      console.log(`🎙️ Available voices: ${response.data.data?.length || 0}`);
      if (response.data.data && response.data.data.length > 0) {
        console.log('   Sample voices:', response.data.data.slice(0, 3).map(v => v.name || v.voice_name).join(', '));
      }
      return true;
    } else {
      console.log('❌ Voice list failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Voice list test failed:', error.message);
    return false;
  }
}

// Run all tests
async function runTests() {
  const results = [];
  
  results.push(await testConnectivity());
  results.push(await testTTS());
  results.push(await testNanoBanana());
  results.push(await testVoiceList());
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log('\n=== Test Results ===');
  console.log(`✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${total - passed}/${total}`);
  
  if (passed === total) {
    console.log('\n🎉 All tests passed! A2E integration is working correctly.');
    console.log('\nNext steps:');
    console.log('1. Test avatar creation through your API endpoints');
    console.log('2. Test video generation with existing avatars');
    console.log('3. Monitor logs for any runtime issues');
  } else {
    console.log('\n⚠️  Some tests failed. Please check:');
    console.log('1. Your A2E API key is valid and has sufficient credits');
    console.log('2. Your network connection to A2E services');
    console.log('3. A2E service status and any recent API changes');
  }
  
  process.exit(passed === total ? 0 : 1);
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('\n💥 Uncaught exception:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error('\n💥 Unhandled rejection:', error.message);
  process.exit(1);
});

// Run the tests
runTests().catch(error => {
  console.error('\n💥 Test suite failed:', error.message);
  process.exit(1);
});
