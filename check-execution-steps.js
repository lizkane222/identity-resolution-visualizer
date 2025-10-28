// Check detailed execution steps to see where the error occurs
require('dotenv').config();
const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const flowSid = 'FW8b38713dcf3b2cb224d6b3a7a511f4d3';

const client = twilio(accountSid, authToken);

async function checkExecutionSteps() {
  try {
    console.log('\n🔍 Fetching recent Studio Flow executions...\n');
    
    const executions = await client.studio.v2
      .flows(flowSid)
      .executions
      .list({ limit: 3 });
    
    if (executions.length === 0) {
      console.log('❌ No executions found');
      return;
    }
    
    for (const execution of executions) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📞 Execution SID:', execution.sid);
      console.log('📱 To:', execution.contactChannelAddress);
      console.log('📊 Status:', execution.status);
      console.log('📅 Created:', execution.dateCreated);
      console.log('📅 Updated:', execution.dateUpdated);
      console.log('\n🔧 Context:', JSON.stringify(execution.context, null, 2));
      
      console.log('\n📝 Execution Steps:');
      console.log('─────────────────────────────────────────────────\n');
      
      try {
        const steps = await client.studio.v2
          .flows(flowSid)
          .executions(execution.sid)
          .steps
          .list({ limit: 20 });
        
        if (steps.length === 0) {
          console.log('   ⚠️  No steps found for this execution\n');
          continue;
        }
        
        for (let i = 0; i < steps.length; i++) {
          const step = steps[i];
          console.log(`   Step ${i + 1}: ${step.name}`);
          console.log(`   ├─ Transitioned From: ${step.transitionedFrom || 'Trigger'}`);
          console.log(`   ├─ Transitioned To: ${step.transitionedTo}`);
          console.log(`   ├─ Date Created: ${step.dateCreated}`);
          
          // Show context for this step
          if (step.context && Object.keys(step.context).length > 0) {
            console.log(`   ├─ Context Keys: ${Object.keys(step.context).join(', ')}`);
          }
          
          // Check for errors in the step context
          if (step.context && step.context.error) {
            console.log(`   ├─ ⚠️  ERROR: ${JSON.stringify(step.context.error, null, 6)}`);
          }
          
          console.log(`   └─ SID: ${step.sid}\n`);
        }
        
        // Check execution context for errors
        const executionContext = await client.studio.v2
          .flows(flowSid)
          .executions(execution.sid)
          .executionContext()
          .fetch();
        
        console.log('🔍 Full Execution Context:');
        console.log(JSON.stringify(executionContext.context, null, 2));
        
      } catch (stepErr) {
        console.log('   ⚠️  Error fetching steps:', stepErr.message);
      }
      
      console.log('\n');
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code) {
      console.error('Twilio Error Code:', error.code);
    }
  }
}

checkExecutionSteps();
