// Test script to diagnose Twilio issues
require('dotenv').config();
const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;
const flowSid = 'FW8b38713dcf3b2cb224d6b3a7a511f4d3';

console.log('\n🔍 Twilio Configuration Check\n');
console.log('Account SID:', accountSid);
console.log('From Number:', fromNumber);
console.log('Flow SID:', flowSid);
console.log('\n');

const client = twilio(accountSid, authToken);

async function runDiagnostics() {
  try {
    // 1. Check account details
    console.log('1️⃣ Checking Twilio Account...');
    const account = await client.api.accounts(accountSid).fetch();
    console.log('   ✅ Account Status:', account.status);
    console.log('   📝 Account Type:', account.type);
    console.log('   📅 Created:', account.dateCreated);
    console.log('');

    // 2. Check if phone number exists and has capabilities
    console.log('2️⃣ Checking Phone Number Configuration...');
    try {
      const phoneNumbers = await client.incomingPhoneNumbers.list({ phoneNumber: fromNumber });
      if (phoneNumbers.length > 0) {
        const phone = phoneNumbers[0];
        console.log('   ✅ Phone Number Found:', phone.phoneNumber);
        console.log('   📞 Voice Enabled:', phone.capabilities.voice);
        console.log('   💬 SMS Enabled:', phone.capabilities.sms);
        console.log('   📱 MMS Enabled:', phone.capabilities.mms);
        console.log('');
      } else {
        console.log('   ❌ Phone number not found in account');
        console.log('   💡 Make sure', fromNumber, 'is purchased in your Twilio account');
        console.log('');
      }
    } catch (err) {
      console.log('   ⚠️  Error checking phone number:', err.message);
      console.log('');
    }

    // 3. Check Studio Flow
    console.log('3️⃣ Checking Studio Flow...');
    try {
      const flow = await client.studio.v2.flows(flowSid).fetch();
      console.log('   ✅ Flow Found:', flow.friendlyName);
      console.log('   📝 Status:', flow.status);
      console.log('   🔗 Flow SID:', flow.sid);
      console.log('   📅 Updated:', flow.dateUpdated);
      
      if (flow.status !== 'published') {
        console.log('   ⚠️  WARNING: Flow is not published!');
        console.log('   💡 Publish your flow at: https://console.twilio.com/us1/service/studio/' + flowSid);
      }
      console.log('');
    } catch (err) {
      console.log('   ❌ Error fetching flow:', err.message);
      console.log('   💡 Check if the Flow SID is correct and belongs to this account');
      console.log('');
    }

    // 4. Check recent executions
    console.log('4️⃣ Checking Recent Flow Executions...');
    try {
      const executions = await client.studio.v2
        .flows(flowSid)
        .executions
        .list({ limit: 5 });
      
      console.log(`   📊 Found ${executions.length} recent executions:\n`);
      
      for (const exec of executions) {
        console.log('   Execution SID:', exec.sid);
        console.log('   Status:', exec.status);
        console.log('   To:', exec.contactChannelAddress);
        console.log('   Created:', exec.dateCreated);
        
        // Get execution steps to see what went wrong
        try {
          const steps = await client.studio.v2
            .flows(flowSid)
            .executions(exec.sid)
            .steps
            .list({ limit: 10 });
          
          console.log('   Steps:', steps.length);
          
          if (steps.length > 0) {
            for (const step of steps) {
              console.log('     -', step.name, '→', step.transitionedTo);
            }
          }
        } catch (err) {
          console.log('     ⚠️  Could not fetch steps');
        }
        
        console.log('');
      }
    } catch (err) {
      console.log('   ⚠️  Error fetching executions:', err.message);
      console.log('');
    }

    // 5. Check for trial account restrictions
    if (account.type === 'Trial') {
      console.log('5️⃣ Trial Account Detected\n');
      console.log('   ⚠️  IMPORTANT: Twilio trial accounts have restrictions:');
      console.log('   • Can only call/text verified phone numbers');
      console.log('   • All calls/texts include a trial message');
      console.log('   • Limited functionality');
      console.log('');
      console.log('   💡 To verify a phone number:');
      console.log('   1. Go to: https://console.twilio.com/us1/develop/phone-numbers/manage/verified');
      console.log('   2. Click "Add a new number"');
      console.log('   3. Enter +16692418922 and verify it');
      console.log('');
      console.log('   💡 Or upgrade your account:');
      console.log('   https://console.twilio.com/billing/upgrade');
      console.log('');
    }

    console.log('✅ Diagnostics Complete!\n');
    
  } catch (error) {
    console.error('\n❌ Error during diagnostics:', error.message);
    if (error.code) {
      console.error('   Twilio Error Code:', error.code);
    }
    if (error.moreInfo) {
      console.error('   More Info:', error.moreInfo);
    }
    console.log('');
  }
}

runDiagnostics();
