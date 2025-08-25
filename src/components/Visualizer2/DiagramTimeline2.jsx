import React, { useState, useEffect, useCallback } from 'react';
import DiagramNode2 from './DiagramNode2';
import { IdentitySimulation } from '../../utils/identitySimulation.js';
import './DiagramTimeline2.css';

// Helper function to get source icon for different source types
function getSourceIcon(sourceType) {
  const iconMap = {
    'javascript': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3QgeD0iMiIgeT0iMiIgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIiBmaWxsPSIjRjdERjFFIiBzdHJva2U9IiNGRkNFMDAiIHN0cm9rZS13aWR0aD0iMiIvPgo8dGV4dCB4PSIxMiIgeT0iMTYiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZm9udC13ZWlnaHQ9ImJvbGQiIGZpbGw9IiMzMzMiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkpTPC90ZXh0Pgo8L3N2Zz4K',
    'ios': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3QgeD0iNCIgeT0iMiIgd2lkdGg9IjE2IiBoZWlnaHQ9IjIwIiByeD0iMiIgZmlsbD0iIzMzNzNkYyIgc3Ryb2tlPSIjMjA1MmNjIiBzdHJva2Utd2lkdGg9IjIiLz4KPGNpcmNsZSBjeD0iMTIiIGN5PSIxOC41IiByPSIxLjUiIGZpbGw9IndoaXRlIi8+CjxyZWN0IHg9IjciIHk9IjUiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCIgZmlsbD0id2hpdGUiLz4KPGNpcmNsZSBjeD0iMTIiIGN5PSIxMCIgcj0iMiIgZmlsbD0iIzMzNzNkYyIvPgo8L3N2Zz4K',
    'android': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTQgN0M0IDUuODk1NDMgNC44OTU0MyA1IDYgNUgxOEMxOS4xMDQ2IDUgMjAgNS44OTU0MyAyMCA3VjE3QzIwIDE4LjEwNDYgMTkuMTA0NiAxOSAxOCAxOUg2QzQuODk1NDMgMTkgNCAxOC4xMDQ2IDQgMTdWN1oiIGZpbGw9IiNhNGM2Mzl8MjBhIiBzdHJva2U9IiM2ODhjNGMiIHN0cm9rZS13aWR0aD0iMiIvPgo8Y2lyY2xlIGN4PSI4IiBjeT0iOSIgcj0iMS41IiBmaWxsPSJ3aGl0ZSIvPgo8Y2lyY2xlIGN4PSIxNiIgY3k9IjkiIHI9IjEuNSIgZmlsbD0id2hpdGUiLz4KPHBhdGggZD0iTTkgMTNIMTUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+Cjwvc3ZnPgo=',
    'server': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3QgeD0iMiIgeT0iMyIgd2lkdGg9IjIwIiBoZWlnaHQ9IjQiIHJ4PSIxIiBmaWxsPSIjNjM3M2RjIiBzdHJva2U9IiM0ZjU5YzciIHN0cm9rZS13aWR0aD0iMiIvPgo8cmVjdCB4PSIyIiB5PSIxMCIgd2lkdGg9IjIwIiBoZWlnaHQ9IjQiIHJ4PSIxIiBmaWxsPSIjNjM3M2RjIiBzdHJva2U9IiM0ZjU5YzciIHN0cm9rZS13aWR0aD0iMiIvPgo8cmVjdCB4PSIyIiB5PSIxNyIgd2lkdGg9IjIwIiBoZWlnaHQ9IjQiIHJ4PSIxIiBmaWxsPSIjNjM3M2RjIiBzdHJva2U9IiM0ZjU5YzciIHN0cm9rZS13aWR0aD0iMiIvPgo8Y2lyY2xlIGN4PSI2IiBjeT0iNSIgcj0iMSIgZmlsbD0id2hpdGUiLz4KPGNpcmNsZSBjeD0iNiIgY3k9IjEyIiByPSIxIiBmaWxsPSJ3aGl0ZSIvPgo8Y2lyY2xlIGN4PSI2IiBjeT0iMTkiIHI9IjEiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo=',
    'web': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiIHN0cm9rZT0iIzMzNzNkYyIgc3Ryb2tlLXdpZHRoPSIyIi8+CjxwYXRoIGQ9Ik0yIDEySDE4IiBzdHJva2U9IiMzMzczZGMiIHN0cm9rZS13aWR0aD0iMiIvPgo8cGF0aCBkPSJNMTIgMkMxNCA2IDE0IDEwIDEyIDEyQzEwIDE0IDEwIDE4IDEyIDIyIiBzdHJva2U9IiMzMzczZGMiIHN0cm9rZS13aWR0aD0iMiIvPgo8L3N2Zz4K',
    'unknown': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiIHN0cm9rZT0iIzk5OTk5OSIgc3Ryb2tlLXdpZHRoPSIyIi8+CjxwYXRoIGQ9Ik05IDlBMyAzIDAgMCAxIDE1IDlDMTUgMTEuNSAxMiAxMS41IDEyIDEzIiBzdHJva2U9IiM5OTk5OTkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CjxjaXJjbGUgY3g9IjEyIiBjeT0iMTciIHI9IjEiIGZpbGw9IiM5OTk5OTkiLz4KPC9zdmc+Cg=='
  };
  
  return iconMap[sourceType] || iconMap['unknown'];
}

// Helper function to generate comprehensive analysis
function generateComprehensiveAnalysis(processedEvents, simulation) {
  const analysis = {
    eventSequence: [],
    profileEvolution: {},
    keyInsights: [],
    finalState: {},
    downloadData: {}
  };

  let profileCounter = 0;
  const profileMap = new Map();

  processedEvents.forEach((event, index) => {
    const eventNum = index + 1;
    const action = event.simulationResult?.actionDetails || event.action;
    const eventType = event.eventData?.event || event.eventData?.type || 'Unknown';
    const timestamp = new Date(event.timestamp).toLocaleString();
    
    // Extract identifiers for display with more detail
    const allIdentifiers = {};
    Object.entries(event.identifiers).forEach(([key, identifier]) => {
      allIdentifiers[key] = identifier.value || identifier;
    });
    
    // Get source information
    const sourceType = event.eventData?.source?.type || 'unknown';
    const segmentId = event.eventData?.segment_id;
    
    let profileAction = '';
    let profileId = '';
    
    if (action.type === 'create_new') {
      profileCounter++;
      profileId = `Profile ${profileCounter}`;
      profileMap.set(action.profileStats?.profileId || `profile_${profileCounter}`, profileId);
      profileAction = `🆕 Create New Profile (${profileId})`;
    } else if (action.type === 'add_event_to_existing') {
      const simProfileId = action.profileStats?.profileId || action.profiles?.[0]?.id;
      profileId = profileMap.get(simProfileId) || `Profile ${profileCounter}`;
      profileAction = `➕ Add Event to Existing Profile (${profileId})`;
    } else if (action.type === 'add_event_to_existing') {
      const simProfileId = action.profileStats?.profileId || action.profiles?.[0]?.id;
      profileId = profileMap.get(simProfileId) || `Profile ${profileCounter}`;
      profileAction = `➕ Add Event to Existing Profile (${profileId})`;
    } else if (action.type === 'merge_profiles') {
      // For merges, we need to update the profile mapping
      const baseProfileId = action.profileStats?.profileId;
      let mergeDirectionText = '';
      
      if (baseProfileId && action.simulationLogs) {
        // Find which profiles were merged
        const mergeLog = action.simulationLogs.find(log => log.includes('Starting merge'));
        if (mergeLog) {
          const merged = mergeLog.match(/Starting merge of profiles: (.+)/);
          if (merged) {
            const profileIds = merged[1].split(', ').map(id => id.trim());
            
            // Sort profiles numerically to get consistent ordering
            profileIds.sort((a, b) => {
              const aNum = parseInt(a.replace('profile_', ''));
              const bNum = parseInt(b.replace('profile_', ''));
              return aNum - bNum;
            });
            
            // Map all merged profiles to the same display name
            const primaryProfile = profileMap.get(baseProfileId) || `Profile ${Object.keys(profileMap).length + 1}`;
            profileIds.forEach(id => {
              const fullId = `profile_${id}`;
              if (!profileMap.has(fullId)) {
                profileMap.set(fullId, `Profile ${Object.keys(profileMap).length + 1}`);
              }
            });
            profileMap.set(baseProfileId, primaryProfile);
            
            // Create merge direction text: "Profile 2 → Profile 1"
            const otherProfiles = profileIds.filter(id => id !== baseProfileId);
            if (otherProfiles.length > 0) {
              const fromProfile = otherProfiles[0].replace('profile_', 'Profile ');
              const toProfile = baseProfileId.replace('profile_', 'Profile ');
              mergeDirectionText = `${fromProfile} → ${toProfile}`;
            }
          }
        }
      }
      profileId = profileMap.get(baseProfileId) || 'Merged Profile';
      profileAction = mergeDirectionText ? `🔀 Merge Profiles: ${mergeDirectionText}` : `🔀 Merge Profiles → ${profileId}`;
    }
    
    // Create detailed expected action with segment info
    let enhancedExpectedAction = profileAction;
    if (segmentId) {
      enhancedExpectedAction += ` | Segment: ${segmentId}`;
    }

    const eventAnalysis = {
      eventNumber: eventNum,
      eventType,
      timestamp,
      sourceType,
      sourceIcon: getSourceIcon(sourceType),
      identifiers: Object.entries(allIdentifiers).map(([key, value]) => `${key}: ${value}`).join(', '),
      allIdentifiers, // Full object with all identifiers
      segmentId,
      expectedAction: enhancedExpectedAction,
      reason: action.reason,
      detailedReason: action.detailedReason,
      profileState: profileId,
      mergeDirection: action.mergeTarget || null,
      processingLog: action.processingLog || null,
      droppedIdentifiers: action.droppedIdentifiers || [],
      conflictingIdentifiers: action.conflictingIdentifiers || [],
      rawPayload: event.eventData, // Include full raw payload for JSON display
      rawEvent: event // Include full event for debugging
    };

    analysis.eventSequence.push(eventAnalysis);
  });

  // Generate key insights
  const totalEvents = processedEvents.length;
  const createActions = processedEvents.filter(e => {
    const actionType = e.simulationResult?.actionDetails?.type || e.action?.type;
    return actionType === 'create_new';
  }).length;
  const addActions = processedEvents.filter(e => {
    const actionType = e.simulationResult?.actionDetails?.type || e.action?.type;
    return actionType && actionType.includes('add_');
  }).length;
  const mergeActions = processedEvents.filter(e => {
    const actionType = e.simulationResult?.actionDetails?.type || e.action?.type;
    return actionType === 'merge_profiles';
  }).length;
  const totalProfiles = Array.from(new Set(profileMap.values())).length;

  analysis.keyInsights = [
    `<div style="text-align: center; margin-bottom: 8px;"><img src="data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 72 72" aria-hidden="true" role="img"><rect x="9" y="9" width="8" height="45" fill="none" stroke="white" stroke-width="2"/><rect x="22" y="18" width="8" height="36" fill="none" stroke="white" stroke-width="2"/><rect x="35" y="25" width="8" height="29" fill="none" stroke="white" stroke-width="2"/><rect x="48" y="31" width="8" height="23" fill="none" stroke="white" stroke-width="2"/><circle cx="54.55" cy="15.69" r="9.95" fill="none" stroke="white" stroke-width="2"/><path d="M51 14l2 2 4-4" stroke="white" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`)}" width="32" height="32" alt="Chart" /></div><div>Total Events Processed: ${totalEvents}</div>`,
    `<div style="text-align: center; margin-bottom: 8px;"><img src="data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 72 72" aria-hidden="true" role="img"><circle cx="28" cy="22" r="11" fill="none" stroke="white" stroke-width="2"/><ellipse cx="28" cy="48.5" rx="17" ry="11.5" fill="none" stroke="white" stroke-width="2"/><circle cx="54" cy="26" r="8" fill="none" stroke="white" stroke-width="2"/><path d="M52 23v6M49 26h6" stroke="white" stroke-width="2" stroke-linecap="round"/></svg>`)}" width="32" height="32" alt="New Profile" /></div><div>New Profiles Created: ${createActions}</div>`,
    `<div style="text-align: center; margin-bottom: 8px;"><img src="data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 73 72" aria-hidden="true" role="img"><circle cx="28.5" cy="22" r="11" fill="none" stroke="white" stroke-width="2"/><ellipse cx="28.5" cy="48.5" rx="17" ry="11.5" fill="none" stroke="white" stroke-width="2"/><circle cx="54.5" cy="26" r="8" fill="none" stroke="white" stroke-width="2"/><path d="M51 24l2 2 4-4" stroke="white" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`)}" width="32" height="32" alt="Additional Actions" /></div><div>Additional Actions: ${addActions}</div>`,
    `<div style="text-align: center; margin-bottom: 8px;"><img src="data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 29.39 28.13"><circle cx="8.68" cy="6.23" r="5" fill="none" stroke="white" stroke-width="1.5"/><circle cx="18.31" cy="6.23" r="5" fill="none" stroke="white" stroke-width="1.5"/><rect x="6.45" y="14.06" width="14.06" height="11.19" rx="2.88" fill="none" stroke="white" stroke-width="1.5"/><path d="M10 18h8M10 20h6M10 22h8" stroke="white" stroke-width="1" stroke-linecap="round"/></svg>`)}" width="32" height="32" alt="Merge" /></div><div>Profile Merges: ${mergeActions}</div>`,
    `<div style="text-align: center; margin-bottom: 8px;"><img src="data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 72 72" aria-hidden="true" role="img"><rect x="16" y="15" width="25" height="42" rx="4" fill="none" stroke="white" stroke-width="2"/><circle cx="28.5" cy="28" r="8" fill="none" stroke="white" stroke-width="2"/><rect x="22" y="42" width="13" height="8" rx="2" fill="none" stroke="white" stroke-width="1.5"/><rect x="47" y="20" width="13" height="3" fill="none" stroke="white" stroke-width="1"/><rect x="47" y="28" width="13" height="3" fill="none" stroke="white" stroke-width="1"/><rect x="47" y="36" width="9" height="3" fill="none" stroke="white" stroke-width="1"/><rect x="47" y="44" width="13" height="3" fill="none" stroke="white" stroke-width="1"/><rect x="47" y="52" width="13" height="3" fill="none" stroke="white" stroke-width="1"/></svg>`)}" width="32" height="32" alt="Profile" /></div><div>Final Profile Count: ${totalProfiles}</div>`
  ];

  // Final state with detailed profile information
  const finalProfiles = Array.from(profileMap.entries()).map(([internalId, displayName]) => {
    // Find events that contributed to this profile
    const relatedEvents = processedEvents.filter(event => {
      const action = event.simulationResult?.actionDetails || event.action;
      const profileId = action.profileStats?.profileId;
      return profileId === internalId || profileMap.get(profileId) === displayName;
    });

    return {
      profileNumber: displayName,
      internalId,
      segmentId: null, // Will be populated if available
      identifiers: {},
      eventCount: relatedEvents.length,
      events: relatedEvents.map(e => ({
        eventNumber: processedEvents.indexOf(e) + 1,
        eventType: e.eventData?.event || e.eventData?.type,
        timestamp: e.timestamp,
        identifiers: e.identifiers
      }))
    };
  });

  analysis.finalState = {
    totalProfiles,
    profiles: finalProfiles,
    profileMappings: Object.fromEntries(profileMap),
    lastProcessedAt: new Date().toISOString(),
    processingStatistics: {
      totalEvents: processedEvents.length,
      createActions,
      addActions,
      mergeActions,
      profilesMerged: mergeActions > 0 ? Object.keys(profileMap).length - totalProfiles : 0
    }
  };

  // Prepare download data
  analysis.downloadData = {
    analysis: analysis.eventSequence,
    insights: analysis.keyInsights,
    finalState: analysis.finalState,
    generatedAt: new Date().toISOString(),
    eventCount: totalEvents
  };

  return analysis;
}

// Helper function to get profile statistics
function getProfileStats(profile, logs) {
  if (!profile) return null;
  
  return {
    profileId: profile.id,
    identifierCount: Object.keys(profile.identifiers || {}).length,
    totalIdentifierValues: Object.values(profile.identifiers || {}).reduce((sum, set) => sum + set.size, 0),
    createdAt: profile.metadata?.created_at || new Date().toISOString(),
    actionHistory: logs || []
  };
}

// Helper function to extract conflicting identifiers from simulation logs
const getConflictingIdentifiersFromLogs = (logs) => {
  const conflicting = [];
  logs.forEach(log => {
    const conflictMatch = log.match(/Dropped identifier type '([^']+)'/);
    if (conflictMatch) {
      conflicting.push(conflictMatch[1]);
    }
  });
  return conflicting;
};

// Helper function to create enhanced merge description
const getMergeDescriptionForProfile = (profile, logs, profileApiResults = {}) => {
  if (!profile || !logs) {
    return { action: 'Profiles merged successfully', direction: null };
  }

  // Try to extract merge information from logs
  const startMergeLog = logs.find(log => log.includes('Starting merge'));
  const mergedLogs = logs.filter(log => log.includes('Merged profile'));
  
  if (!startMergeLog && mergedLogs.length === 0) {
    return { action: 'Profiles merged successfully', direction: null };
  }

  // Extract profile IDs that were merged
  let profileIds = [];
  let baseProfileId = profile.id;
  
  // From "Starting merge of profiles: profile_1, profile_2"
  if (startMergeLog) {
    const startMatch = startMergeLog.match(/Starting merge of profiles: (.+)/);
    if (startMatch) {
      profileIds = startMatch[1].split(', ').map(id => id.trim());
    }
  }
  
  // From individual "Merged profile profile_X" logs
  mergedLogs.forEach(log => {
    const mergeMatch = log.match(/Merged profile (profile_\d+)/);
    if (mergeMatch && !profileIds.includes(mergeMatch[1])) {
      profileIds.push(mergeMatch[1]);
    }
  });

  // Add the base profile if it's not already in the list
  if (!profileIds.includes(baseProfileId)) {
    profileIds.push(baseProfileId);
  }

  // Sort profiles numerically to get consistent ordering
  profileIds.sort((a, b) => {
    const aNum = parseInt(a.replace('profile_', ''));
    const bNum = parseInt(b.replace('profile_', ''));
    return aNum - bNum;
  });

  // The merge direction: all other profiles → base profile
  const otherProfiles = profileIds.filter(id => id !== baseProfileId);
  
  if (otherProfiles.length > 0) {
    // Format as "Profile 2 → Profile 1"
    const fromProfile = otherProfiles[0].replace('profile_', 'Profile ');
    const toProfile = baseProfileId.replace('profile_', 'Profile ');
    const direction = `${fromProfile} → ${toProfile}`;
    
    return { 
      action: `Merge Profiles / Result: ${direction}`, 
      direction: direction,
      mergedProfiles: otherProfiles,
      baseProfile: baseProfileId
    };
  }

  return { action: 'Profiles merged successfully', direction: null };
};

// Helper function to convert IdentitySimulation result to DiagramNode action format
const convertSimulationResultToAction = (simulationResult, profileApiResults = {}, currentEvent = null, previousEvents = [], currentIndex = 0) => {
  const { action, profile, dropped, logs } = simulationResult;
  
  // Map IdentitySimulation actions to DiagramNode action types
  let actionType;
  let reason = '';
  let description = '';
  let detailedReason = '';
  
  switch (action) {
    case 'create':
      // Trust the simulation's decision - if it says create, then create
      // The identity simulation handles complex scenarios including merges properly
      actionType = 'create_new';
      reason = 'Simulation determined new profile is needed';
      description = logs.length > 0 ? logs[logs.length - 1] : 'Created new profile for event';
      detailedReason = 'The identity simulation determined that a new profile should be created based on identifier limits, conflicts, or lack of matching profiles.';
      break;
      
    case 'add':
      // Consolidate both identifier and event addition into single action type
      actionType = 'add_event_to_existing';
      reason = 'Adding event to existing profile';
      description = logs.length > 0 ? logs[logs.length - 1] : 'Event added to existing profile';
      detailedReason = 'The simulation determined that this event should be added to an existing profile.';
      break;
      
    case 'merge':
      actionType = 'merge_profiles';
      reason = 'Multiple profiles need to be merged';
      detailedReason = 'Event identifiers span multiple existing profiles, requiring them to be merged into one.';
      
      // Enhanced merge description with profile direction
      const mergeDescription = getMergeDescriptionForProfile(profile, logs, profileApiResults);
      description = mergeDescription.action;
      
      return {
        type: actionType,
        reason,
        detailedReason,
        description,
        mergeDirection: mergeDescription.direction,
        mergeTarget: mergeDescription.direction,
        mergedProfiles: mergeDescription.mergedProfiles,
        baseProfile: mergeDescription.baseProfile,
        droppedIdentifiers: dropped || [],
        conflictingIdentifiers: getConflictingIdentifiersFromLogs(logs),
        profiles: [profile], // IdentitySimulation returns the merged profile
        simulationLogs: logs,
        profileStats: getProfileStats(profile, logs)
      };
      
    default:
      actionType = 'create_new';
      reason = 'Unknown action type';
      description = 'Fallback to creating new profile';
      detailedReason = 'Unable to determine appropriate action, defaulting to profile creation.';
  }

  return {
    type: actionType,
    reason,
    detailedReason,
    description,
    droppedIdentifiers: dropped || [],
    conflictingIdentifiers: getConflictingIdentifiersFromLogs(logs),
    profiles: profile ? [profile] : [],
    simulationLogs: logs,
    profileStats: getProfileStats(profile, logs)
  };
};

const DiagramTimeline2 = ({ events, identifierOptions, unifySpaceSlug, profileApiResults = {}, onSimulationUpdate, onAnalysisUpdate }) => {
  const [processedEvents, setProcessedEvents] = useState([]);
  const [simulation, setSimulation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hoveredProfileId, setHoveredProfileId] = useState(null);
  const [hoveredEventProfileId, setHoveredEventProfileId] = useState(null);
  const [hoveredEventIdentifiers, setHoveredEventIdentifiers] = useState(null);
  const [expandedNodes, setExpandedNodes] = useState(new Set());

  // Helper function to check if an identifier matches between event and profile
  const isIdentifierMatching = (identifierType, identifierValues, eventIdentifiers) => {
    if (!eventIdentifiers || !eventIdentifiers[identifierType]) {
      return false;
    }
    
    const eventValues = eventIdentifiers[identifierType];
    const profileValues = Array.isArray(identifierValues) ? identifierValues : [identifierValues];
    const eventValuesArray = Array.isArray(eventValues) ? eventValues : [eventValues];
    
    // Check if any profile values match any event values
    return profileValues.some(profileValue => 
      eventValuesArray.some(eventValue => 
        String(profileValue).toLowerCase() === String(eventValue).toLowerCase()
      )
    );
  };

  // Create stable reference for identifierOptions to prevent infinite re-renders
  const stableIdentifierOptionsString = JSON.stringify(identifierOptions);

  // Helper function to convert Profile API results to display format
  const convertProfileApiResultsToProfiles = (profileApiResults) => {
    if (!profileApiResults || Object.keys(profileApiResults).length === 0) {
      return [];
    }

    const profilesMap = new Map();

    // Process each API result
    Object.entries(profileApiResults).forEach(([identifier, result]) => {
      if (!result) return;

      let segmentId = null;
      let userId = null;
      let profileKey = identifier; // Default to lookup identifier

      // Handle both old format and new merged format
      const endpointsToProcess = [];
      
      if (result._combinedData) {
        // New merged format - process all endpoints
        Object.entries(result._combinedData).forEach(([endpoint, data]) => {
          endpointsToProcess.push({ endpoint, data, identifier });
        });
      } else if (result.data) {
        // Old format - single endpoint
        const endpoint = result._endpoint || 'unknown';
        endpointsToProcess.push({ endpoint, data: result.data, identifier });
      }

      // First pass: look for segment_id in metadata
      endpointsToProcess.forEach(({ endpoint: endpointType, data }) => {
        if (endpointType === 'metadata' && data && data.segment_id) {
          segmentId = data.segment_id;
          profileKey = segmentId; // Use segment_id as primary key
        }
      });

      // Get or create profile
      if (!profilesMap.has(profileKey)) {
        profilesMap.set(profileKey, {
          id: profileKey,
          segmentId: segmentId,
          userId: userId,
          lookupIdentifier: identifier,
          identifiers: {},
          events: [],
          metadata: null,
        });
      }

      const profile = profilesMap.get(profileKey);

      // Process each endpoint's data
      endpointsToProcess.forEach(({ endpoint: endpointType, data }) => {
        if (!data) return;

        if (endpointType === 'metadata') {
          profile.metadata = data;
          if (data.segment_id && !profile.segmentId) {
            profile.segmentId = data.segment_id;
          }
        } else if (endpointType === 'external_ids') {
          // Process external IDs
          const externalIdsArray = Array.isArray(data) ? data : (data.data || []);
          externalIdsArray.forEach(extId => {
            if (extId.type && extId.id) {
              if (!profile.identifiers[extId.type]) {
                profile.identifiers[extId.type] = [];
              }
              if (!profile.identifiers[extId.type].includes(extId.id)) {
                profile.identifiers[extId.type].push(extId.id);
              }
            }
          });
        } else if (endpointType === 'traits') {
          // Process traits data - look for user_id
          if (data && typeof data === 'object') {
            // Handle nested traits structure
            const traitsData = data.traits || data;
            
            // Look for user_id in traits
            if (traitsData.user_id && !profile.userId) {
              profile.userId = traitsData.user_id;
            }
          }
        }
      });
    });

    return Array.from(profilesMap.values());
  };

  useEffect(() => {
    // Process events through the identity simulation
    const processEventsForSimulation = async () => {
      setLoading(true);
      
      // Sort events by timestamp
      const sortedEvents = [...events].sort((a, b) => {
        const timestampA = a.timestamp || new Date(a.createdAt).getTime();
        const timestampB = b.timestamp || new Date(b.createdAt).getTime();
        return timestampA - timestampB;
      });

      // Create simulation with config based on identifierOptions
      const simulationConfig = {
        limits: {},
        priorities: {}
      };

      identifierOptions.forEach((option, index) => {
        simulationConfig.limits[option.value] = option.limit || 5;
        simulationConfig.priorities[option.value] = index + 1;
      });

      const sim = new IdentitySimulation(simulationConfig);
      
      const processed = [];

      for (let i = 0; i < sortedEvents.length; i++) {
        const event = sortedEvents[i];
        
        // Extract identifiers from event
        const eventIdentifiers = extractIdentifiersFromEvent(event, identifierOptions);
        
        // Process through simulation
        const result = sim.processEvent({ identifiers: eventIdentifiers });
        
        // DEBUG: Log Event 10 specifically to understand what's happening
        if (i === 9) { // Event 10 (0-indexed)
          console.log('=== EVENT 10 DEBUG ===');
          console.log('Raw Event Data:', event);
          console.log('Extracted Identifiers:', eventIdentifiers);
          console.log('Simulation Result:', result);
          console.log('Current Profiles in Simulation:', sim.profiles.map(p => ({
            id: p.id,
            identifiers: Object.fromEntries(
              Object.entries(p.identifiers).map(([type, valueSet]) => [type, Array.from(valueSet)])
            )
          })));
          console.log('=====================');
          
          // Additional debugging to understand the issue
          console.error('🚨 EVENT 10 SHOULD BE A MERGE! 🚨');
          console.error('Expected: email from Profile 1 + anonymousId from Profile 2 = MERGE');
          console.error('Actual result action:', result.action);
          console.error('If this is not "merge", there is a bug in the identity simulation');
        }
        
        // Convert simulation result to detailed action format
        const actionDetails = convertSimulationResultToAction(
          result, 
          profileApiResults, 
          event, 
          processed, // previous events processed so far
          i // current index
        );
        
        // Create processed event with simulation results
        const processedEvent = {
          ...event,
          eventData: JSON.parse(event.rawData),
          identifiers: eventIdentifiers,
          simulationResult: {
            ...result,
            actionDetails: actionDetails,
            action: actionDetails.type, // Use the detailed action type
            mergeDirection: actionDetails.mergeDirection // Add direct access to mergeDirection
          },
          sequenceNumber: i + 1,
          timestamp: event.timestamp || new Date(event.createdAt).getTime()
        };

        processed.push(processedEvent);
      }

      setProcessedEvents(processed);
      setSimulation(sim);
      setLoading(false);
      
      // Notify parent component about simulation update
      if (onSimulationUpdate) {
        onSimulationUpdate(sim);
      }

      // Generate comprehensive analysis for the sidebar
      if (onAnalysisUpdate) {
        const analysis = generateComprehensiveAnalysis(processed, sim);
        onAnalysisUpdate(analysis);
      }
    };

    if (events.length > 0) {
      processEventsForSimulation();
    } else {
      // No events to process
      setProcessedEvents([]);
      setSimulation(null);
      setLoading(false);
      
      // Notify parent component about simulation clear
      if (onSimulationUpdate) {
        onSimulationUpdate(null);
      }
    }
  }, [events, stableIdentifierOptionsString]);

  // Listen for analysis trigger events
  useEffect(() => {
    const handleAnalysisTrigger = async () => {
      if (processedEvents.length > 0 && simulation && onAnalysisUpdate) {
        const analysis = generateComprehensiveAnalysis(processedEvents, simulation);
        onAnalysisUpdate(analysis);
      }
    };

    document.addEventListener('triggerAnalysis', handleAnalysisTrigger);
    
    return () => {
      document.removeEventListener('triggerAnalysis', handleAnalysisTrigger);
    };
  }, [processedEvents, simulation, onAnalysisUpdate]);

  if (loading) {
    return (
      <div className="diagram-timeline2__loading">
        <div className="diagram-timeline2__loading-spinner"></div>
        <p>Processing events through identity resolution simulation...</p>
      </div>
    );
  }

  return (
    <div className="diagram-timeline2" id="visualizer-timeline">
      <div 
        className={`diagram-timeline2__timeline-container ${expandedNodes.size > 0 ? 'diagram-timeline2__timeline-container--expanded' : ''}`}
        style={{
          minWidth: processedEvents.length > 0 
            ? `${Math.max(320, processedEvents.length * 200 + 40)}px` 
            : '100%'
        }}
      >
        {/* Horizontal Timeline */}
        <div 
          className="diagram-timeline2__timeline-line"
          style={{
            width: processedEvents.length > 0 
              ? `${Math.max(320, processedEvents.length * 200 + 40)}px` 
              : '100%'
          }}
        ></div>

        {/* Events and Profiles */}
        <div className="diagram-timeline2__events">
          {/* Profile Cards Above Event Nodes */}
          {(() => {
            const profiles = convertProfileApiResultsToProfiles(profileApiResults);
            
            // Create profile cards based on actual event targets for perfect ID matching
            const eventTargetProfiles = processedEvents.reduce((profilesMap, event) => {
              if (event.simulationResult?.profile?.id) {
                const profileId = event.simulationResult.profile.id;
                
                // Try to find the corresponding real profile with segmentId
                const realProfile = profiles.find(p => {
                  // Match by segmentId, profile ID, or any identifier from the event
                  return p.id === profileId || 
                         p.segmentId === profileId ||
                         (event.identifiers && Object.values(event.identifiers).some(eventIdValue => 
                           p.identifiers && Object.values(p.identifiers).flat().includes(eventIdValue)
                         ));
                });
                
                // Determine what to display - prefer real profile data when available
                let displayName, segmentId, identifiers = {};
                if (realProfile) {
                  // We have real profile data - use it!
                  segmentId = realProfile.segmentId;
                  displayName = realProfile.segmentId || realProfile.id;
                  identifiers = realProfile.identifiers || {};
                } else {
                  // No real profile data, create a cleaner display name
                  segmentId = null;
                  displayName = profileId.replace(/^profile_/, 'Profile '); // Convert profile_1 to Profile 1
                  identifiers = event.identifiers || {};
                }
                
                // Use segmentId as primary key when available, fallback to simulation profileId
                // This prevents duplicate profiles when multiple simulation profiles map to same real profile
                const mapKey = segmentId || profileId;
                
                if (!profilesMap.has(mapKey)) {
                  profilesMap.set(mapKey, {
                    id: mapKey, // Use segmentId when available, fallback to simulation profileId
                    segmentId: segmentId, // Store real segmentId separately  
                    simulationProfileIds: [profileId], // Track all simulation profile IDs that map to this real profile
                    identities: identifiers ? Object.keys(identifiers).length : 0,
                    events: 1,
                    first_seen: event.timestamp || Date.now(),
                    last_seen: event.timestamp || Date.now(),
                    identifiers: identifiers, // Use real profile identifiers
                    displayName: displayName, // Show segmentId or cleaned up profile name
                    initials: displayName.slice(-2).toUpperCase(), // Use last 2 chars for initials
                    realProfile: realProfile // Store reference for debugging
                  });
                } else {
                  // Update existing profile with additional event
                  const existingProfile = profilesMap.get(mapKey);
                  existingProfile.events += 1;
                  existingProfile.last_seen = event.timestamp || Date.now();
                  
                  // Track additional simulation profile IDs that map to this real profile
                  if (!existingProfile.simulationProfileIds.includes(profileId)) {
                    existingProfile.simulationProfileIds.push(profileId);
                  }
                  
                  // Merge identifiers if we have new ones
                  if (event.identifiers) {
                    Object.entries(event.identifiers).forEach(([type, value]) => {
                      if (!existingProfile.identifiers[type]) {
                        existingProfile.identifiers[type] = [];
                      }
                      if (Array.isArray(existingProfile.identifiers[type])) {
                        if (!existingProfile.identifiers[type].includes(value)) {
                          existingProfile.identifiers[type].push(value);
                        }
                      } else if (existingProfile.identifiers[type] !== value) {
                        existingProfile.identifiers[type] = [existingProfile.identifiers[type], value];
                      }
                    });
                  }
                }
              }
              return profilesMap;
            }, new Map());
            
            // Use event-generated profiles for perfect ID matching, fall back to real profiles if no events
            const displayProfiles = eventTargetProfiles.size > 0 ? Array.from(eventTargetProfiles.values()) : profiles;
            
            return displayProfiles.length > 0 && (
              <div className="diagram-timeline2__profiles-list">
                {displayProfiles.map((profile, idx) => {
                  // Check if this profile should be highlighted due to event node hover
                  // Now check against all simulation profile IDs that map to this real profile
                  const isEventHighlighted = hoveredEventProfileId && (
                    hoveredEventProfileId === profile.id ||
                    (profile.simulationProfileIds && profile.simulationProfileIds.includes(hoveredEventProfileId))
                  );
                  
                  return (
                  <div 
                    key={profile.id || idx} 
                    className={`visualizer2__profile-card ${isEventHighlighted ? 'visualizer2__profile-card--highlighted' : ''}`}
                    onMouseEnter={() => {
                      // Set hover state for both the main profile ID and all simulation profile IDs
                      setHoveredProfileId(profile.id);
                      // Also consider the simulation profile IDs for event highlighting
                      if (profile.simulationProfileIds && profile.simulationProfileIds.length > 0) {
                        // Use the first simulation profile ID for event hover consistency
                        setHoveredProfileId(profile.simulationProfileIds[0]);
                      }
                    }}
                    onMouseLeave={() => {
                      setHoveredProfileId(null);
                    }}
                  >
                    <div className="visualizer2__profile-header">
                      <div className="visualizer2__profile-avatar">👤</div>
                      <div className="visualizer2__profile-info">
                        {/* Profile Target - matching event node exactly */}
                        <div className="visualizer2__profile-target">
                          {/* <span className="visualizer2__target-arrow">→</span> */}
                          <span className="visualizer2__target-profile">
                            {(() => {
                              // Use the EXACT same logic as event nodes
                              const firstSimProfileId = profile.simulationProfileIds?.[0];
                              if (firstSimProfileId && firstSimProfileId.startsWith('profile_')) {
                                return firstSimProfileId.replace(/^profile_/, 'Profile ');
                              }
                              if (profile.id && profile.id.startsWith('profile_')) {
                                return profile.id.replace(/^profile_/, 'Profile ');
                              }
                              // If we have a segment ID that doesn't follow profile_ pattern, find the profile number
                              if (profile.segmentId) {
                                // Try to find the corresponding simulation profile ID
                                for (const simId of (profile.simulationProfileIds || [])) {
                                  if (simId.startsWith('profile_')) {
                                    return simId.replace(/^profile_/, 'Profile ');
                                  }
                                }
                              }
                              return 'Profile 1'; // Fallback
                            })()}
                          </span>
                        </div>
                        
                        {/* Show Segment ID with white text styling */}
                        {profile.segmentId && !profile.segmentId.startsWith('profile_') && (
                          <div className="visualizer2__segment-id visualizer2__segment-id--white">Segment ID: {profile.segmentId}</div>
                        )}
                      </div>
                    </div>
                    
                    <div className="visualizer2__profile-stats">
                      <div className="visualizer2__profile-stat">
                        <div className="visualizer2__profile-stat-value">
                          {profile.identifiers ? Object.keys(profile.identifiers).length : 0}
                        </div>
                        <div className="visualizer2__profile-stat-label">Identifiers</div>
                      </div>
                      <div className="visualizer2__profile-stat">
                        <div className="visualizer2__profile-stat-value">
                          {processedEvents.filter(event => {
                            const eventProfileId = event.simulationResult?.profile?.id;
                            // Match by profile ID, segmentId, or any of the simulation profile IDs that map to this real profile
                            return eventProfileId === profile.id || 
                                   eventProfileId === profile.segmentId ||
                                   (profile.simulationProfileIds && profile.simulationProfileIds.includes(eventProfileId)) ||
                                   (profile.realProfile && (
                                     eventProfileId === profile.realProfile.id || 
                                     eventProfileId === profile.realProfile.segmentId
                                   ));
                          }).length}
                        </div>
                        <div className="visualizer2__profile-stat-label">Events</div>
                      </div>
                    </div>
                    
                    <div className="visualizer2__profile-identifiers">
                      <div className="visualizer2__identifiers-label">Identifiers</div>
                      {profile.identifiers && Object.keys(profile.identifiers).length > 0 ? (
                        // Display all identifiers from external_ids endpoint
                        Object.entries(profile.identifiers)
                          .sort(([typeA], [typeB]) => {
                            // Sort by priority from Identity Resolution Config
                            const priorityA = identifierOptions.findIndex(opt => opt.value === typeA || opt.value === typeA.replace('_', ''));
                            const priorityB = identifierOptions.findIndex(opt => opt.value === typeB || opt.value === typeB.replace('_', ''));
                            
                            // If both found in config, sort by priority (lower index = higher priority)
                            if (priorityA !== -1 && priorityB !== -1) return priorityA - priorityB;
                            // If only one found in config, prioritize it
                            if (priorityA !== -1) return -1;
                            if (priorityB !== -1) return 1;
                            // If neither found, sort alphabetically
                            return typeA.localeCompare(typeB);
                          })
                          .map(([type, values]) => {
                            // Check if this identifier matches between event and profile
                            const isMatching = isEventHighlighted && hoveredEventIdentifiers && 
                              isIdentifierMatching(type, values, hoveredEventIdentifiers);
                            
                            return (
                              <div key={type} className={`visualizer2__identifier-row ${isMatching ? 'visualizer2__identifier-row--matching' : ''}`}>
                                <span className="visualizer2__identifier-type">{type}:</span>
                                <div className="visualizer2__identifier-values-container">
                                  {Array.isArray(values) ? (
                                    values.map((value, index) => {
                                      // Check if this specific value matches the hovered event
                                      const isSpecificValueMatching = isEventHighlighted && hoveredEventIdentifiers && 
                                        isIdentifierMatching(type, [value], hoveredEventIdentifiers);
                                      
                                      return (
                                        <span 
                                          key={index} 
                                          className={`visualizer2__identifier-value ${isSpecificValueMatching ? 'visualizer2__identifier-value--matching' : ''}`}
                                        >
                                          {value}
                                        </span>
                                      );
                                    })
                                  ) : (
                                    <span className={`visualizer2__identifier-value ${isMatching ? 'visualizer2__identifier-value--matching' : ''}`}>
                                      {values}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })
                      ) : (
                        <div className="visualizer2__identifier-row visualizer2__identifier-row--empty">
                          <span className="visualizer2__identifier-empty">No identifiers found</span>
                        </div>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
            );
          })()}
          {/* Event Nodes */}
          <div className="diagram-timeline2__event-nodes">
            {processedEvents.map((event, index) => {
              return (
                <DiagramNode2
                  key={event.id}
                  event={event}
                  sequenceNumber={index + 1}
                  isLast={index === processedEvents.length - 1}
                  identifierOptions={identifierOptions}
                  position={index}
                  totalEvents={processedEvents.length}
                  simulation={simulation}
                  previousEvents={processedEvents.slice(0, index)}
                  hoveredProfileId={hoveredProfileId}
                  onEventHover={(profileId) => {
                    setHoveredEventProfileId(profileId);
                    setHoveredEventIdentifiers(event.identifiers);
                  }}
                  onEventHoverLeave={() => {
                    setHoveredEventProfileId(null);
                    setHoveredEventIdentifiers(null);
                  }}
                  onPayloadExpand={() => {
                    setExpandedNodes(prev => new Set([...prev, event.id]));
                  }}
                  onPayloadCollapse={() => {
                    setExpandedNodes(prev => {
                      const newSet = new Set(prev);
                      newSet.delete(event.id);
                      return newSet;
                    });
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function to extract identifiers from event data
const extractIdentifiersFromEvent = (event, identifierOptions) => {
  try {
    const eventData = JSON.parse(event.rawData);
    const identifiers = {};

    // Extract from top level (userId, anonymousId)
    if (eventData.userId) identifiers.user_id = eventData.userId;
    if (eventData.anonymousId) identifiers.anonymous_id = eventData.anonymousId;

    // Extract from traits
    if (eventData.traits) {
      if (eventData.traits.email) identifiers.email = eventData.traits.email;
      if (eventData.traits.phone) identifiers.phone = eventData.traits.phone;
    }

    // Extract from properties (for track events)
    if (eventData.properties) {
      if (eventData.properties.email) identifiers.email = eventData.properties.email;
      if (eventData.properties.phone) identifiers.phone = eventData.properties.phone;
    }

    // Extract from context
    if (eventData.context) {
      if (eventData.context.traits) {
        if (eventData.context.traits.email) identifiers.email = eventData.context.traits.email;
        if (eventData.context.traits.phone) identifiers.phone = eventData.context.traits.phone;
      }
      
      // Device identifiers
      if (eventData.context.device) {
        if (eventData.context.device.id) identifiers['device_id'] = eventData.context.device.id;
        if (eventData.context.device.advertisingId) identifiers['advertising_id'] = eventData.context.device.advertisingId;
      }

      // External IDs
      if (eventData.context.externalIds && Array.isArray(eventData.context.externalIds)) {
        eventData.context.externalIds.forEach(ext => {
          if (ext.type && ext.id) {
            identifiers[ext.type] = ext.id;
          }
        });
      }
    }

    return identifiers;
  } catch (error) {
    console.error('Error extracting identifiers from event:', error);
    return {};
  }
};

export default DiagramTimeline2;
