#!/usr/bin/env node

/**
 * Test script for Twilio SMS export functionality
 * 
 * Usage: node test-export.js +1XXXXXXXXXX
 */

require('dotenv').config();
const twilio = require('twilio');

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

// Get recipient from command line args
const recipientNumber = process.argv[2];

if (!recipientNumber) {
  console.error('❌ Usage: node test-export.js +1XXXXXXXXXX');
  process.exit(1);
}

if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
  console.error('❌ Missing Twilio credentials in .env file');
  console.error('Required: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER');
  process.exit(1);
}

console.log('\n🧪 Testing Twilio SMS Export Functionality\n');
console.log('From:', TWILIO_PHONE_NUMBER);
console.log('To:', recipientNumber);

const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

// Sample export data
const testExport = {
  exportType: 'TEST EXPORT',
  timestamp: new Date().toISOString(),
  data: {
    events: [
      { id: 'evt_1', event: 'Page Viewed', url: '/home' },
      { id: 'evt_2', event: 'Button Clicked', button: 'signup' }
    ],
    user: {
      anonymousId: 'test-123',
      traits: { email: 'test@example.com' }
    }
  }
};

const messageBody = `Identity Resolution Export Test
Type: ${testExport.exportType}
Time: ${new Date().toLocaleString()}

${JSON.stringify(testExport.data, null, 2).substring(0, 500)}

✅ Export feature is working!`;

async function testExport() {
  try {
    console.log('\n📤 Sending test export...\n');
    
    const message = await client.messages.create({
      body: messageBody,
      from: TWILIO_PHONE_NUMBER,
      to: recipientNumber
    });

    console.log('✅ Export sent successfully!\n');
    console.log('Message SID:', message.sid);
    console.log('Status:', message.status);
    console.log('Price:', message.price || 'Calculating...');
    console.log('Direction:', message.direction);
    console.log('\n💡 Check your phone for the message!');
    console.log('💡 Monitor in Twilio Console: https://console.twilio.com/us1/monitor/logs/sms');
    
  } catch (error) {
    console.error('\n❌ Export failed:', error.message);
    
    if (error.code === 21211) {
      console.error('\n⚠️  Invalid phone number format. Use E.164 format: +1XXXXXXXXXX');
    } else if (error.code === 21608) {
      console.error('\n⚠️  Trial account: Recipient number must be verified in Twilio Console');
      console.error('Verify at: https://console.twilio.com/us1/develop/phone-numbers/manage/verified');
    } else if (error.code === 21606) {
      console.error('\n⚠️  From number is not a valid phone number');
      console.error('Check TWILIO_PHONE_NUMBER in .env');
    } else {
      console.error('\nError code:', error.code);
      console.error('Error details:', error.moreInfo);
    }
    
    process.exit(1);
  }
}

testExport();
