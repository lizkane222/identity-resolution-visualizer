/**
 * Comprehensive Test for Identity Resolution with UI Component Integration
 * 
 * Tests both the identity simulation algorithm and how UI components process the results
 */

import { IdentitySimulation } from './src/utils/identitySimulation.js';

// Test configuration
const config = {
  limits: {
    user_id: 1,
    email: 5,
    anonymous_id: 5,
  },
  priorities: {
    user_id: 1,
    email: 2,
    anonymous_id: 3,
  }
};

// Helper function to simulate the UI components' event processing logic
function simulateUIEventProcessing(events) {
  const usersMap = new Map();
  
  events.forEach((event, eventIndex) => {
    try {
      const parsed = JSON.parse(event.rawData);
      const userId = parsed.userId || parsed.user_id || parsed.userID;
      const anonymousId = parsed.anonymousId || parsed.anonymous_id;
      const email = parsed.traits?.email || parsed.properties?.email || parsed.email;
      
      // Extract all potential identifier fields
      const allIdentifierFields = {
        ...parsed.traits,
        ...parsed.properties,
        userId,
        anonymousId,
        email
      };
      
      // Find existing user key based on UniqueUsersList logic
      let existingUserKey = null;
      
      for (const [key, existingUser] of usersMap.entries()) {
        // Priority 1: Match by userId
        if (userId && existingUser.identifierValues.userId && existingUser.identifierValues.userId.includes(userId)) {
          existingUserKey = key;
          break;
        }
        
        // Priority 2: Match by anonymousId
        if (anonymousId && existingUser.identifierValues.anonymousId && existingUser.identifierValues.anonymousId.includes(anonymousId)) {
          existingUserKey = key;
          break;
        }
      }
      
      // Priority 3: Match by email
      if (!existingUserKey && email) {
        for (const [key, existingUser] of usersMap.entries()) {
          if (existingUser.identifierValues.email && existingUser.identifierValues.email.includes(email) &&
              ((userId && existingUser.identifierValues.userId && existingUser.identifierValues.userId.includes(userId)) ||
               (anonymousId && existingUser.identifierValues.anonymousId && existingUser.identifierValues.anonymousId.includes(anonymousId)))) {
            existingUserKey = key;
            break;
          }
        }
      }
      
      // Create new key if no existing user found
      if (!existingUserKey) {
        if (userId) {
          existingUserKey = `user:${userId}`;
        } else if (anonymousId) {
          existingUserKey = `anon:${anonymousId}`;
        } else if (email) {
          existingUserKey = `email:${email}`;
        } else {
          existingUserKey = `anonymous:${eventIndex}`;
        }
      }
      
      // Create or update user
      if (!usersMap.has(existingUserKey)) {
        usersMap.set(existingUserKey, {
          userId: userId || null,
          anonymousIds: anonymousId ? [anonymousId] : [],
          email: email || null,
          identifierValues: {},
          eventCount: 0,
          eventIndices: [],
          firstSeen: event.timestamp,
          lastSeen: event.timestamp
        });
      }
      
      // Update user data
      const user = usersMap.get(existingUserKey);
      user.eventCount++;
      user.eventIndices.push(eventIndex);
      user.lastSeen = event.timestamp;
      
      // Collect all unique identifier values
      Object.entries(allIdentifierFields).forEach(([fieldName, fieldValue]) => {
        if (fieldValue !== null && fieldValue !== undefined && fieldValue !== '') {
          if (!user.identifierValues[fieldName]) {
            user.identifierValues[fieldName] = [];
          }
          
          const stringValue = String(fieldValue);
          if (!user.identifierValues[fieldName].includes(stringValue)) {
            user.identifierValues[fieldName].push(stringValue);
          }
        }
      });
      
      // Update legacy fields
      if (userId && !user.userId) {
        user.userId = userId;
        
        // Update key if upgrading from anon/email to userId
        if (existingUserKey.startsWith('anon:') || existingUserKey.startsWith('email:')) {
          const newKey = `user:${userId}`;
          if (!usersMap.has(newKey)) {
            usersMap.set(newKey, user);
            usersMap.delete(existingUserKey);
            existingUserKey = newKey;
          }
        }
      }
      if (anonymousId && (!user.anonymousIds || !user.anonymousIds.includes(anonymousId))) {
        if (!user.anonymousIds) {
          user.anonymousIds = [];
        }
        user.anonymousIds.push(anonymousId);
      }
      if (email && !user.email) {
        user.email = email;
      }
      
    } catch (error) {
      console.warn('Failed to parse event data:', error);
    }
  });
  
  return Array.from(usersMap.values());
}

console.log('🧪 Comprehensive Identity Resolution Test');
console.log('📝 Testing both simulation algorithm and UI component behavior');
console.log('');

// Create test events
const events = [
  {
    id: 'event1',
    timestamp: Date.now() - 3000,
    rawData: JSON.stringify({
      type: 'identify',
      userId: 'userA',
      traits: {
        email: 'emailA@example.com'
      },
      timestamp: new Date(Date.now() - 3000).toISOString()
    })
  },
  {
    id: 'event2', 
    timestamp: Date.now() - 2000,
    rawData: JSON.stringify({
      type: 'track',
      event: 'Page View',
      anonymousId: 'anonB',
      properties: {
        page: 'home'
      },
      timestamp: new Date(Date.now() - 2000).toISOString()
    })
  },
  {
    id: 'event3',
    timestamp: Date.now() - 1000,
    rawData: JSON.stringify({
      type: 'identify',
      anonymousId: 'anonB',
      traits: {
        email: 'emailA@example.com'
      },
      timestamp: new Date(Date.now() - 1000).toISOString()
    })
  }
];

console.log('📍 Test Events:');
events.forEach((event, i) => {
  const parsed = JSON.parse(event.rawData);
  console.log(`   Event ${i + 1}:`);
  console.log(`     Type: ${parsed.type}`);
  console.log(`     User ID: ${parsed.userId || 'none'}`);
  console.log(`     Anonymous ID: ${parsed.anonymousId || 'none'}`);
  console.log(`     Email: ${parsed.traits?.email || 'none'}`);
});
console.log('');

// Test 1: Identity Simulation Algorithm
console.log('🔬 Test 1: Identity Simulation Algorithm');
console.log('');

const simulation = new IdentitySimulation(config);
const simulationResults = [];

events.forEach((event, i) => {
  const parsed = JSON.parse(event.rawData);
  const identifiers = {};
  
  if (parsed.userId) identifiers.user_id = parsed.userId;
  if (parsed.anonymousId) identifiers.anonymous_id = parsed.anonymousId;
  if (parsed.traits?.email) identifiers.email = parsed.traits.email;
  
  const result = simulation.processEvent({ identifiers });
  simulationResults.push(result);
  
  console.log(`📍 Event ${i + 1} Processing:`);
  console.log(`   Identifiers: ${JSON.stringify(identifiers)}`);
  console.log(`   Action: ${result.action}`);
  console.log(`   Profile ID: ${result.profile.id}`);
  console.log(`   Total Profiles: ${simulation.profiles.length}`);
  console.log('');
});

console.log('📊 Final Simulation State:');
simulation.profiles.forEach((profile, index) => {
  console.log(`   Profile ${index + 1}: ${profile.id}`);
  Object.entries(profile.identifiers).forEach(([type, values]) => {
    console.log(`     ${type}: [${Array.from(values).join(', ')}]`);
  });
});
console.log('');

// Test 2: UI Component Processing
console.log('🖥️  Test 2: UI Component Processing (UniqueUsersList logic)');
console.log('');

const uiUsers = simulateUIEventProcessing(events);

console.log('📊 UI Component Results:');
uiUsers.forEach((user, index) => {
  console.log(`   User ${index + 1}:`);
  console.log(`     Key: ${user.userId ? `user:${user.userId}` : user.anonymousIds?.[0] ? `anon:${user.anonymousIds[0]}` : user.email ? `email:${user.email}` : 'unknown'}`);
  console.log(`     User ID: ${user.userId || 'none'}`);
  console.log(`     Anonymous IDs: [${user.anonymousIds?.join(', ') || 'none'}]`);
  console.log(`     Email: ${user.email || 'none'}`);
  console.log(`     Event Count: ${user.eventCount}`);
  console.log(`     Event Indices: [${user.eventIndices.join(', ')}]`);
  console.log(`     All Identifiers:`);
  Object.entries(user.identifierValues).forEach(([type, values]) => {
    console.log(`       ${type}: [${values.join(', ')}]`);
  });
  console.log('');
});

// Test 3: Comparison and Analysis
console.log('🔍 Test 3: Comparison and Analysis');
console.log('');

console.log(`Simulation Results: ${simulation.profiles.length} profile(s)`);
console.log(`UI Component Results: ${uiUsers.length} user(s)`);
console.log('');

if (simulation.profiles.length === 1 && uiUsers.length === 1) {
  console.log('✅ PASS: Both simulation and UI show correct merge behavior (1 profile)');
} else if (simulation.profiles.length === 1 && uiUsers.length > 1) {
  console.log('❌ FAIL: Simulation correctly merged profiles but UI component created multiple users');
  console.log('   This indicates a discrepancy in the UI logic vs. identity resolution algorithm');
} else if (simulation.profiles.length > 1) {
  console.log('❌ FAIL: Simulation algorithm did not merge profiles correctly');
} else {
  console.log('⚠️  UNKNOWN: Unexpected result pattern');
}

// Test 4: Step-by-step UI processing analysis
console.log('');
console.log('🔧 Test 4: Step-by-step UI Processing Analysis');
console.log('');

const stepByStepUsers = new Map();

events.forEach((event, eventIndex) => {
  console.log(`📍 Processing Event ${eventIndex + 1} in UI logic:`);
  
  const parsed = JSON.parse(event.rawData);
  const userId = parsed.userId || parsed.user_id;
  const anonymousId = parsed.anonymousId || parsed.anonymous_id;
  const email = parsed.traits?.email || parsed.properties?.email;
  
  console.log(`   Extracted identifiers: userId=${userId}, anonymousId=${anonymousId}, email=${email}`);
  
  // Step 1: Look for existing user by userId
  let existingUserKey = null;
  for (const [key, existingUser] of stepByStepUsers.entries()) {
    if (userId && existingUser.identifierValues.userId && existingUser.identifierValues.userId.includes(userId)) {
      existingUserKey = key;
      console.log(`   ✅ Found existing user by userId: ${key}`);
      break;
    }
  }
  
  // Step 2: Look for existing user by anonymousId
  if (!existingUserKey) {
    for (const [key, existingUser] of stepByStepUsers.entries()) {
      if (anonymousId && existingUser.identifierValues.anonymousId && existingUser.identifierValues.anonymousId.includes(anonymousId)) {
        existingUserKey = key;
        console.log(`   ✅ Found existing user by anonymousId: ${key}`);
        break;
      }
    }
  }
  
  // Step 3: Look for existing user by email with matching identifiers
  if (!existingUserKey && email) {
    for (const [key, existingUser] of stepByStepUsers.entries()) {
      if (existingUser.identifierValues.email && existingUser.identifierValues.email.includes(email)) {
        const hasMatchingUserId = userId && existingUser.identifierValues.userId && existingUser.identifierValues.userId.includes(userId);
        const hasMatchingAnonId = anonymousId && existingUser.identifierValues.anonymousId && existingUser.identifierValues.anonymousId.includes(anonymousId);
        
        if (hasMatchingUserId || hasMatchingAnonId) {
          existingUserKey = key;
          console.log(`   ✅ Found existing user by email with matching ID: ${key}`);
          break;
        }
      }
    }
  }
  
  // Step 4: Create new user if none found
  if (!existingUserKey) {
    if (userId) {
      existingUserKey = `user:${userId}`;
    } else if (anonymousId) {
      existingUserKey = `anon:${anonymousId}`;
    } else if (email) {
      existingUserKey = `email:${email}`;
    } else {
      existingUserKey = `anonymous:${eventIndex}`;
    }
    console.log(`   🆕 Creating new user: ${existingUserKey}`);
  }
  
  // Create or update user
  if (!stepByStepUsers.has(existingUserKey)) {
    stepByStepUsers.set(existingUserKey, {
      userId: userId || null,
      anonymousIds: anonymousId ? [anonymousId] : [],
      email: email || null,
      identifierValues: {},
      eventCount: 0
    });
  }
  
  const user = stepByStepUsers.get(existingUserKey);
  user.eventCount++;
  
  // Add identifiers
  if (userId && (!user.identifierValues.userId || !user.identifierValues.userId.includes(userId))) {
    if (!user.identifierValues.userId) user.identifierValues.userId = [];
    user.identifierValues.userId.push(userId);
  }
  if (anonymousId && (!user.identifierValues.anonymousId || !user.identifierValues.anonymousId.includes(anonymousId))) {
    if (!user.identifierValues.anonymousId) user.identifierValues.anonymousId = [];
    user.identifierValues.anonymousId.push(anonymousId);
  }
  if (email && (!user.identifierValues.email || !user.identifierValues.email.includes(email))) {
    if (!user.identifierValues.email) user.identifierValues.email = [];
    user.identifierValues.email.push(email);
  }
  
  console.log(`   Current users count: ${stepByStepUsers.size}`);
  console.log('');
});

console.log('📊 Final step-by-step UI state:');
Array.from(stepByStepUsers.values()).forEach((user, index) => {
  console.log(`   User ${index + 1}: userId=${user.userId}, anonymousIds=[${user.anonymousIds.join(', ')}], email=${user.email}`);
});
