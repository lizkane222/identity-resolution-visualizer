/**
 * Test for Identity Resolution Simulation
 * 
 * Test case: Create two distinct profiles, then merge them with a common external ID
 * Expected: Only two profiles should exist after the merge operation
 * Issue: Additional third profile is being created unexpectedly
 */

import { IdentitySimulation } from './src/utils/identitySimulation.js';

// Test configuration matching your default settings
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

console.log('🧪 Testing Identity Resolution Simulation');
console.log('📝 Scenario: Create two distinct profiles, then merge them with a common external ID');
console.log('');

const simulation = new IdentitySimulation(config);

// Event 1: Create Profile A with user_id A and email A
console.log('📍 Event 1: Creating Profile A');
const event1 = {
  identifiers: {
    user_id: 'userA',
    email: 'emailA@example.com'
  }
};

const result1 = simulation.processEvent(event1);
console.log(`   Action: ${result1.action}`);
console.log(`   Profile ID: ${result1.profile.id}`);
console.log(`   Profile identifiers:`, result1.profile.identifiers);
console.log(`   Logs:`, result1.logs);
console.log(`   Total profiles in simulation: ${simulation.profiles.length}`);
console.log('');

// Event 2: Create Profile B with only anonymous_id B (non-conflicting)
console.log('📍 Event 2: Creating Profile B');
const event2 = {
  identifiers: {
    anonymous_id: 'anonB'
  }
};

const result2 = simulation.processEvent(event2);
console.log(`   Action: ${result2.action}`);
console.log(`   Profile ID: ${result2.profile.id}`);
console.log(`   Profile identifiers:`, result2.profile.identifiers);
console.log(`   Logs:`, result2.logs);
console.log(`   Total profiles in simulation: ${simulation.profiles.length}`);
console.log('');

// Show current profiles state before merge
console.log('📊 Current profiles before merge:');
simulation.profiles.forEach((profile, index) => {
  console.log(`   Profile ${index + 1}: ${profile.id}`);
  Object.entries(profile.identifiers).forEach(([type, values]) => {
    console.log(`     ${type}: [${Array.from(values).join(', ')}]`);
  });
});
console.log('');

// Event 3: Merge attempt - send identify event with email A and anonymous_id B
console.log('📍 Event 3: Merge attempt - identify with email A and anonymous_id B');
const event3 = {
  identifiers: {
    email: 'emailA@example.com',
    anonymous_id: 'anonB'
  }
};

const result3 = simulation.processEvent(event3);
console.log(`   Action: ${result3.action}`);
console.log(`   Profile ID: ${result3.profile.id}`);
console.log(`   Profile identifiers:`, result3.profile.identifiers);
console.log(`   Logs:`, result3.logs);
console.log(`   Total profiles in simulation: ${simulation.profiles.length}`);
console.log('');

// Show final profiles state
console.log('📊 Final profiles after merge:');
simulation.profiles.forEach((profile, index) => {
  console.log(`   Profile ${index + 1}: ${profile.id}`);
  Object.entries(profile.identifiers).forEach(([type, values]) => {
    console.log(`     ${type}: [${Array.from(values).join(', ')}]`);
  });
  console.log(`   History: [${profile.history.join(', ')}]`);
});
console.log('');

// Analysis
console.log('🔍 Analysis:');
if (simulation.profiles.length === 2) {
  console.log('✅ PASS: Correct number of profiles (2)');
  
  // Check if the merge happened correctly
  const mergedProfile = simulation.profiles.find(p => 
    p.identifiers.email && p.identifiers.email.has('emailA@example.com') &&
    p.identifiers.anonymous_id && p.identifiers.anonymous_id.has('anonB')
  );
  
  if (mergedProfile) {
    console.log('✅ PASS: Profiles correctly merged');
    console.log(`   Merged profile ${mergedProfile.id} contains both identifiers`);
  } else {
    console.log('❌ FAIL: Profiles not properly merged');
  }
} else {
  console.log(`❌ FAIL: Incorrect number of profiles (${simulation.profiles.length} instead of 2)`);
  console.log('   Expected: 2 profiles (one merged profile containing all identifiers)');
  console.log('   Actual: Additional profile(s) created unexpectedly');
}

// Additional debugging - check the logic step by step
console.log('');
console.log('🔧 Debugging the merge logic:');

// Re-create the scenario step by step with detailed logging
const debugSimulation = new IdentitySimulation(config);

// Event 1
const debugResult1 = debugSimulation.processEvent(event1);
console.log(`After Event 1: ${debugSimulation.profiles.length} profile(s)`);

// Event 2  
const debugResult2 = debugSimulation.processEvent(event2);
console.log(`After Event 2: ${debugSimulation.profiles.length} profile(s)`);

// Event 3 - detailed analysis
console.log('');
console.log('🔍 Event 3 detailed analysis:');
const identifiers3 = debugSimulation.normalizeIdentifiers(event3.identifiers);
console.log('Normalized identifiers:', identifiers3);

const matched = debugSimulation.getMatchingProfiles(identifiers3);
console.log('Matching profiles:', Array.from(matched));

const perTypeProfiles = debugSimulation.getProfilesForIdentifiers(identifiers3);
console.log('Per-type profile matches:', perTypeProfiles);

// Check what the union would be
const unionProfiles = new Set();
for (const type in perTypeProfiles) {
  for (const idx of perTypeProfiles[type]) {
    unionProfiles.add(idx);
  }
}
console.log('Union of all matching profiles:', Array.from(unionProfiles));

if (unionProfiles.size > 1) {
  const conflictResult = debugSimulation.checkMergeConflict(Array.from(unionProfiles), identifiers3);
  console.log('Merge conflict check:', conflictResult);
}
