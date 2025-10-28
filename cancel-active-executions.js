// Cancel all active executions for testing
require('dotenv').config();
const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const flowSid = 'FW8b38713dcf3b2cb224d6b3a7a511f4d3';

const client = twilio(accountSid, authToken);

async function cancelActiveExecutions() {
  try {
    console.log('\n🔍 Finding active executions...\n');
    
    const executions = await client.studio.v2
      .flows(flowSid)
      .executions
      .list({ limit: 10 });
    
    const activeExecutions = executions.filter(e => e.status === 'active');
    
    console.log(`Found ${activeExecutions.length} active executions\n`);
    
    if (activeExecutions.length === 0) {
      console.log('✅ No active executions to cancel\n');
      return;
    }
    
    for (const execution of activeExecutions) {
      console.log(`Canceling execution: ${execution.sid}`);
      console.log(`  To: ${execution.contactChannelAddress}`);
      console.log(`  Created: ${execution.dateCreated}\n`);
      
      try {
        await client.studio.v2
          .flows(flowSid)
          .executions(execution.sid)
          .update({ status: 'ended' });
        
        console.log(`  ✅ Canceled successfully\n`);
      } catch (err) {
        console.log(`  ⚠️  Error canceling: ${err.message}\n`);
      }
    }
    
    console.log('✅ All active executions have been processed\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

cancelActiveExecutions();
