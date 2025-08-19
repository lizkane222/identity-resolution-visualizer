/**
 * Test the fixed UniqueUsersList logic
 */

// Import the exact logic from the fixed UniqueUsersList component
function simulateFixedUIEventProcessing(events) {
  const usersMap = new Map();
  
  events.forEach((event, eventIndex) => {
    try {
      const parsed = JSON.parse(event.rawData);
      const userId = parsed.userId || parsed.user_id || parsed.userID;
      const anonymousId = parsed.anonymousId || parsed.anonymous_id;
      const email = parsed.traits?.email || parsed.properties?.email || parsed.email;
      const phone = parsed.traits?.phone || parsed.properties?.phone || parsed.phone;
      
      // Extract all potential identifier fields from traits and properties
      const allIdentifierFields = {
        ...parsed.traits,
        ...parsed.properties,
        userId,
        anonymousId,
        email,
        phone
      };
      
      // IMPROVED LOGIC: Find all users that match ANY identifier from this event
      const matchingUserKeys = new Set();
      
      for (const [key, existingUser] of usersMap.entries()) {
        let hasMatch = false;
        
        // Check for userId match
        if (userId && existingUser.identifierValues.userId && existingUser.identifierValues.userId.includes(userId)) {
          hasMatch = true;
        }
        
        // Check for anonymousId match
        if (anonymousId && existingUser.identifierValues.anonymousId && existingUser.identifierValues.anonymousId.includes(anonymousId)) {
          hasMatch = true;
        }
        
        // Check for email match
        if (email && existingUser.identifierValues.email && existingUser.identifierValues.email.includes(email)) {
          hasMatch = true;
        }
        
        // Check for phone match
        if (phone && existingUser.identifierValues.phone && existingUser.identifierValues.phone.includes(phone)) {
          hasMatch = true;
        }
        
        if (hasMatch) {
          matchingUserKeys.add(key);
        }
      }
      
      let targetUserKey = null;
      
      if (matchingUserKeys.size === 0) {
        // No matches found - create new user
        if (userId) {
          targetUserKey = `user:${userId}`;
        } else if (anonymousId) {
          targetUserKey = `anon:${anonymousId}`;
        } else if (email) {
          targetUserKey = `email:${email}`;
        } else {
          targetUserKey = `anonymous:${eventIndex}`;
        }
      } else if (matchingUserKeys.size === 1) {
        // Single match - use existing user
        targetUserKey = Array.from(matchingUserKeys)[0];
      } else {
        // Multiple matches - MERGE USERS (this is the key fix!)
        const userKeysArray = Array.from(matchingUserKeys);
        targetUserKey = userKeysArray[0]; // Use first user as the target
        
        // Merge all other matching users into the target user
        const targetUser = usersMap.get(targetUserKey);
        
        for (let i = 1; i < userKeysArray.length; i++) {
          const userKeyToMerge = userKeysArray[i];
          const userToMerge = usersMap.get(userKeyToMerge);
          
          // Merge identifier values
          Object.entries(userToMerge.identifierValues).forEach(([fieldName, fieldValues]) => {
            if (!targetUser.identifierValues[fieldName]) {
              targetUser.identifierValues[fieldName] = [];
            }
            fieldValues.forEach(value => {
              if (!targetUser.identifierValues[fieldName].includes(value)) {
                targetUser.identifierValues[fieldName].push(value);
              }
            });
          });
          
          // Merge legacy fields
          if (userToMerge.userId && !targetUser.userId) {
            targetUser.userId = userToMerge.userId;
          }
          if (userToMerge.email && !targetUser.email) {
            targetUser.email = userToMerge.email;
          }
          if (userToMerge.anonymousIds) {
            userToMerge.anonymousIds.forEach(anonId => {
              if (!targetUser.anonymousIds.includes(anonId)) {
                targetUser.anonymousIds.push(anonId);
              }
            });
          }
          
          // Merge event data
          targetUser.eventCount += userToMerge.eventCount;
          targetUser.eventIndices.push(...userToMerge.eventIndices);
          
          // Merge traits and properties
          targetUser.traits = { ...targetUser.traits, ...userToMerge.traits };
          targetUser.properties = { ...targetUser.properties, ...userToMerge.properties };
          
          // Update timestamps
          if (new Date(userToMerge.firstSeen) < new Date(targetUser.firstSeen)) {
            targetUser.firstSeen = userToMerge.firstSeen;
          }
          if (new Date(userToMerge.lastSeen) > new Date(targetUser.lastSeen)) {
            targetUser.lastSeen = userToMerge.lastSeen;
          }
          
          // Remove the merged user
          usersMap.delete(userKeyToMerge);
        }
      }
      
      // Create user if it doesn't exist
      if (!usersMap.has(targetUserKey)) {
        usersMap.set(targetUserKey, {
          userId: userId || null,
          anonymousIds: anonymousId ? [anonymousId] : [],
          email: email || null,
          identifierValues: {},
          traits: parsed.traits || {},
          properties: parsed.properties || {},
          eventCount: 0,
          eventIndices: [],
          firstSeen: event.timestamp,
          lastSeen: event.timestamp
        });
      }
      
      // Update user data
      const user = usersMap.get(targetUserKey);
      user.eventCount++;
      user.eventIndices.push(eventIndex);
      user.lastSeen = event.timestamp;
      
      // Collect all unique identifier values for this user
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
      
      // Update legacy fields for backward compatibility
      if (userId && !user.userId) {
        user.userId = userId;
        
        // Update the key if we're upgrading from anon/email to userId
        if (targetUserKey.startsWith('anon:') || targetUserKey.startsWith('email:')) {
          const newKey = `user:${userId}`;
          if (!usersMap.has(newKey)) {
            usersMap.set(newKey, user);
            usersMap.delete(targetUserKey);
            targetUserKey = newKey;
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
      
      // Merge traits and properties
      if (parsed.traits) {
        user.traits = { ...user.traits, ...parsed.traits };
      }
      if (parsed.properties) {
        user.properties = { ...user.properties, ...parsed.properties };
      }
      
    } catch (error) {
      console.warn('Failed to parse event data:', error);
    }
  });
  
  return Array.from(usersMap.values());
}

// Test the fixed logic
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

console.log('🧪 Testing Fixed UniqueUsersList Logic');
console.log('');

const fixedUIUsers = simulateFixedUIEventProcessing(events);

console.log('📊 Fixed UI Component Results:');
fixedUIUsers.forEach((user, index) => {
  console.log(`   User ${index + 1}:`);
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

console.log('🔍 Analysis:');
if (fixedUIUsers.length === 1) {
  console.log('✅ PASS: Fixed UI component correctly merged users into 1 profile');
  
  const mergedUser = fixedUIUsers[0];
  const hasUserId = mergedUser.identifierValues.userId && mergedUser.identifierValues.userId.includes('userA');
  const hasAnonId = mergedUser.identifierValues.anonymousId && mergedUser.identifierValues.anonymousId.includes('anonB');
  const hasEmail = mergedUser.identifierValues.email && mergedUser.identifierValues.email.includes('emailA@example.com');
  
  if (hasUserId && hasAnonId && hasEmail) {
    console.log('✅ PASS: Merged user contains all expected identifiers');
  } else {
    console.log('❌ FAIL: Merged user missing some identifiers');
    console.log(`   Has userId: ${hasUserId}`);
    console.log(`   Has anonymousId: ${hasAnonId}`);
    console.log(`   Has email: ${hasEmail}`);
  }
  
  if (mergedUser.eventCount === 3) {
    console.log('✅ PASS: Merged user has correct event count (3)');
  } else {
    console.log(`❌ FAIL: Merged user has incorrect event count (${mergedUser.eventCount} instead of 3)`);
  }
} else {
  console.log(`❌ FAIL: Fixed UI component still shows ${fixedUIUsers.length} users instead of 1`);
}
