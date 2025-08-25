import React, { useState, useEffect } from 'react';
import DiagramNode from './DiagramNode';
import { IdentitySimulation } from '../../utils/identitySimulation';
import './DiagramTimeline.css';

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
    const action = event.action;
    const eventType = event.eventData?.event || event.eventData?.type || 'Unknown';
    const timestamp = new Date(event.timestamp).toLocaleString();
    
    // Extract identifiers for display
    const identifiersList = Object.entries(event.identifiers).map(([key, identifier]) => 
      `${key}: ${identifier.value}`
    ).join(', ');

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
    } else if (action.type === 'add_identifier_to_existing') {
      const simProfileId = action.profileStats?.profileId || action.profiles?.[0]?.id;
      profileId = profileMap.get(simProfileId) || `Profile ${profileCounter}`;
      profileAction = `🔗 Add Identifier to Existing Profile (${profileId})`;
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

    const eventAnalysis = {
      eventNumber: eventNum,
      eventType,
      timestamp,
      identifiers: identifiersList,
      expectedAction: profileAction,
      reason: action.reason,
      detailedReason: action.detailedReason,
      profileState: profileId,
      mergeDirection: action.mergeTarget || null,
      processingLog: action.processingLog || null,
      droppedIdentifiers: action.droppedIdentifiers || [],
      conflictingIdentifiers: action.conflictingIdentifiers || []
    };

    analysis.eventSequence.push(eventAnalysis);
  });

  // Generate key insights
  const totalEvents = processedEvents.length;
  const createActions = processedEvents.filter(e => e.action.type === 'create_new').length;
  const addActions = processedEvents.filter(e => e.action.type.includes('add_')).length;
  const mergeActions = processedEvents.filter(e => e.action.type === 'merge_profiles').length;
  const totalProfiles = Array.from(new Set(profileMap.values())).length;

  analysis.keyInsights = [
    `<img src="/assets/bar-graph_search.svg" width="16" height="16" style="vertical-align: middle; margin-right: 6px;" alt="Chart" /> Total Events Processed: ${totalEvents}`,
    `<img src="/assets/User-plus.svg" width="16" height="16" style="vertical-align: middle; margin-right: 6px;" alt="New Profile" /> New Profiles Created: ${createActions}`,
    `<img src="/assets/User-Checkmark.svg" width="16" height="16" style="vertical-align: middle; margin-right: 6px;" alt="Addition" /> Addition Actions: ${addActions}`,
    `<img src="/assets/Unified-Profiles.svg" width="16" height="16" style="vertical-align: middle; margin-right: 6px;" alt="Merge" /> Profile Merges: ${mergeActions}`,
    `<img src="/assets/User-Profile.svg" width="16" height="16" style="vertical-align: middle; margin-right: 6px;" alt="Profile" /> Final Profile Count: ${totalProfiles}`
  ];

  // Final state
  analysis.finalState = {
    totalProfiles,
    profileMappings: Object.fromEntries(profileMap),
    lastProcessedAt: new Date().toISOString()
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

// Helper function to get nested value from object using dot notation
function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : null;
  }, obj);
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

const DiagramTimeline = ({ events, identifierOptions, unifySpaceSlug, profileApiResults = {}, onAnalysisUpdate }) => {
  const [processedEvents, setProcessedEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Process events through the IdentitySimulation class
    const processEventsForVisualization = async () => {
      setLoading(true);
      
      // Sort events by timestamp
      const sortedEvents = [...events].sort((a, b) => {
        const timestampA = a.timestamp || new Date(a.createdAt).getTime();
        const timestampB = b.timestamp || new Date(b.createdAt).getTime();
        return timestampA - timestampB;
      });

      // Create simulation configuration from identifierOptions
      const simulationConfig = {
        limits: {},
        priorities: {}
      };

      identifierOptions.forEach((option, index) => {
        simulationConfig.limits[option.value] = option.limit || 5;
        simulationConfig.priorities[option.value] = option.priority || (index + 1);
      });

      const simulation = new IdentitySimulation(simulationConfig);
      const processed = [];
      
      for (let i = 0; i < sortedEvents.length; i++) {
        const event = sortedEvents[i];
        
        // Parse event data to extract identifiers
        let eventData;
        try {
          eventData = typeof event.rawData === 'string' ? JSON.parse(event.rawData) : event.rawData;
        } catch (e) {
          console.error('Failed to parse event data:', e);
          continue;
        }

        // Extract identifiers from the event using the helper function
        const eventIdentifiers = extractIdentifiersFromEvent(eventData, identifierOptions);
        
        // Convert to IdentitySimulation expected format (normalize to sets)
        const normalizedIdentifiers = {};
        Object.entries(eventIdentifiers).forEach(([key, identifierData]) => {
          normalizedIdentifiers[key] = identifierData.value;
        });

        // Check for segment_id from profile API events for better correlation
        let segmentId = null;
        if (event.segment_id) {
          segmentId = event.segment_id;
        } else if (eventData.context && eventData.context.segment_id) {
          segmentId = eventData.context.segment_id;
        } else if (eventData.related && eventData.related.users && eventData.related.users.length > 0) {
          segmentId = eventData.related.users[0]; // Use first segment_id from related.users
        }

        // For profile API events with segment_id, try to match to existing profiles first
        let forceProfileMatch = null;
        if (segmentId && event.sourceType === 'profile-api') {
          // Look for existing profiles that might have this segment_id
          // This helps with proper identity resolution correlation
          forceProfileMatch = segmentId;
        }

        // Process through IdentitySimulation with additional context
        const simulationResult = simulation.processEvent({ 
          identifiers: normalizedIdentifiers,
          metadata: {
            segmentId: segmentId,
            sourceType: event.sourceType,
            forceProfileMatch: forceProfileMatch
          }
        });

        // Convert simulation result to DiagramNode expected format
        const action = convertSimulationResultToAction(simulationResult, profileApiResults);

        // Create processed event with action and metadata
        const processedEvent = {
          ...event,
          eventData,
          identifiers: eventIdentifiers,
          action,
          simulationResult, // Keep original for debugging
          sequenceNumber: i + 1,
          timestamp: eventData.timestamp || eventData.originalTimestamp || event.timestamp || new Date(event.createdAt).getTime(),
          // Include segment_id and external_ids for identity correlation
          segmentId: segmentId,
          external_ids: eventData.external_ids || event.external_ids || [],
          related: eventData.related || event.related || {}
        };

        processed.push(processedEvent);
      }

      setProcessedEvents(processed);
      setLoading(false);
    };

    if (events.length > 0) {
      processEventsForVisualization();
    } else {
      setProcessedEvents([]);
      setLoading(false);
    }
  }, [events, identifierOptions, profileApiResults]);

  // Listen for analysis trigger events
  useEffect(() => {
    const handleAnalysisTrigger = async () => {
      if (events.length === 0) return;
      
      setLoading(true);
      
      // Sort events by timestamp
      const sortedEvents = [...events].sort((a, b) => {
        const timestampA = a.timestamp || new Date(a.createdAt).getTime();
        const timestampB = b.timestamp || new Date(b.createdAt).getTime();
        return timestampA - timestampB;
      });

      // Create simulation configuration from identifierOptions
      const simulationConfig = {
        limits: {},
        priorities: {}
      };

      identifierOptions.forEach((option, index) => {
        simulationConfig.limits[option.value] = option.limit || 5;
        simulationConfig.priorities[option.value] = option.priority || (index + 1);
      });

      const simulation = new IdentitySimulation(simulationConfig);
      const processed = [];
      
      for (let i = 0; i < sortedEvents.length; i++) {
        const event = sortedEvents[i];
        
        // Parse event data to extract identifiers
        let eventData;
        try {
          eventData = typeof event.rawData === 'string' ? JSON.parse(event.rawData) : event.rawData;
        } catch (e) {
          console.error('Failed to parse event data:', e);
          continue;
        }

        // Extract identifiers from the event using the helper function
        const eventIdentifiers = extractIdentifiersFromEvent(eventData, identifierOptions);
        
        // Convert to IdentitySimulation expected format (normalize to sets)
        const normalizedIdentifiers = {};
        Object.entries(eventIdentifiers).forEach(([key, identifierData]) => {
          normalizedIdentifiers[key] = identifierData.value;
        });

        // Process through IdentitySimulation
        const simulationResult = simulation.processEvent({ 
          identifiers: normalizedIdentifiers 
        });

        // Create processed event with action and metadata
        const processedEvent = {
          ...event,
          eventData,
          identifiers: eventIdentifiers,
          action: convertSimulationResultToAction(simulationResult, profileApiResults),
          simulationResult, // Keep original for debugging
          sequenceNumber: i + 1,
          timestamp: eventData.timestamp || eventData.originalTimestamp || event.timestamp || new Date(event.createdAt).getTime()
        };

        processed.push(processedEvent);
      }
      
      // Generate comprehensive analysis for the sidebar
      if (onAnalysisUpdate) {
        const analysis = generateComprehensiveAnalysis(processed, simulation);
        onAnalysisUpdate(analysis);
      }
      
      setLoading(false);
    };

    document.addEventListener('triggerAnalysis', handleAnalysisTrigger);
    
    return () => {
      document.removeEventListener('triggerAnalysis', handleAnalysisTrigger);
    };
  }, [events, identifierOptions, profileApiResults, onAnalysisUpdate]);

  if (loading) {
    return (
      <div className="diagram-timeline__loading">
        <div className="diagram-timeline__loading-spinner"></div>
        <p>Processing events for identity resolution visualization...</p>
      </div>
    );
  }

  return (
    <div className="diagram-timeline">
      <div className="diagram-timeline__timeline-container">
        {/* Horizontal Timeline */}
        <div className="diagram-timeline__timeline-line"></div>
        
        {/* Event Nodes */}
        <div className="diagram-timeline__events">
          {processedEvents.map((event, index) => (
            <DiagramNode
              key={event.id}
              event={event}
              sequenceNumber={index + 1}
              isLast={index === processedEvents.length - 1}
              identifierOptions={identifierOptions}
              position={index}
              totalEvents={processedEvents.length}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// Helper function to convert IdentitySimulation result to DiagramNode action format
const convertSimulationResultToAction = (simulationResult, profileApiResults = {}) => {
  const { action, profile, dropped, logs } = simulationResult;
  
  // Map IdentitySimulation actions to DiagramNode action types
  let actionType;
  let reason = '';
  let description = '';
  let detailedReason = '';
  
  switch (action) {
    case 'create':
      actionType = 'create_new';
      reason = 'No existing profiles match event identifiers';
      description = logs.length > 0 ? logs[logs.length - 1] : 'Created new profile for event';
      detailedReason = 'No identifiers in this event matched any existing profiles in the system.';
      break;
      
    case 'add':
      // Determine if this is adding new identifiers or just events
      const addedIdentifiersLog = logs.find(log => log.includes('Added identifiers'));
      const hasNewIdentifiers = addedIdentifiersLog !== undefined;
      
      if (hasNewIdentifiers) {
        actionType = 'add_identifier_to_existing';
        reason = 'Adding new identifier to existing profile';
        description = addedIdentifiersLog || 'New identifier added to existing profile';
        detailedReason = 'Event contains identifiers that match an existing profile, plus new identifiers that will be added to that profile.';
      } else {
        actionType = 'add_event_to_existing';
        reason = 'Adding event to existing profile (no new identifiers)';
        description = logs.length > 0 ? logs[logs.length - 1] : 'Event added to existing profile';
        detailedReason = 'All identifiers in this event already exist on a single profile. Event will be added without changing profile identifiers.';
      }
      break;
      
    case 'merge':
      actionType = 'merge_profiles';
      reason = 'Multiple profiles need to be merged';
      detailedReason = 'Event identifiers span multiple existing profiles, requiring them to be merged into one.';
      
      // Enhanced merge description with profile direction
      const mergeDescription = getMergeDescriptionForProfile(profile, logs, profileApiResults);
      description = typeof mergeDescription === 'string' ? mergeDescription : mergeDescription.action;
      
      return {
        type: actionType,
        reason,
        detailedReason,
        description,
        mergeTarget: typeof mergeDescription === 'object' ? mergeDescription.target : null,
        processingLog: typeof mergeDescription === 'object' ? mergeDescription.processingLog : null,
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
    return 'Profiles merged successfully';
  }

  // Try to extract merge information from logs
  const mergeLog = logs.find(log => log.includes('Merged profile') || log.includes('Starting merge'));
  
  if (!mergeLog) {
    return 'Profiles merged successfully';
  }

  // Extract profile IDs from merge logs
  const profileIds = [];
  logs.forEach(log => {
    const mergeMatch = log.match(/Merged profile (profile_\d+)/);
    if (mergeMatch) {
      profileIds.push(mergeMatch[1]);
    }
    const startMatch = log.match(/Starting merge of profiles: (.+)/);
    if (startMatch) {
      const ids = startMatch[1].split(', ').map(id => `profile_${id}`);
      profileIds.push(...ids);
    }
  });

  if (profileIds.length === 0) {
    return 'Profiles merged successfully';
  }

  // Create merge direction (older profile wins)
  const baseProfileId = profile.id;
  const mergedProfileIds = profileIds.filter(id => id !== baseProfileId);
  
  if (mergedProfileIds.length === 0) {
    return 'Profile consolidated successfully';
  }

  // Format profile names for display
  const formatProfileName = (profileId) => {
    // Try to find real profile name from API results
    for (const [, result] of Object.entries(profileApiResults)) {
      if (result && result._combinedData && result._combinedData.metadata) {
        if (result._combinedData.metadata.segment_id === profileId) {
          return result._combinedData.metadata.segment_id;
        }
      }
    }
    // Fallback to cleaned up profile name
    return profileId.replace(/^profile_/, 'Profile ');
  };

  const baseName = formatProfileName(baseProfileId);
  const mergedName = formatProfileName(mergedProfileIds[0]);
  
  // Find common identifier from logs
  let commonIdentifier = 'shared identifier';
  const addedLog = logs.find(log => log.includes('Added identifiers'));
  if (addedLog) {
    // Try to infer the identifier type that caused the merge
    commonIdentifier = 'common identifier';
  }

  const direction = `${mergedName} (Profile 2) merged into ${baseName} (Profile 1)`;
  const processingLog = `Profiles merged by ${commonIdentifier}. ${mergedName} merged into ${baseName} (older profile takes precedence).`;

  return {
    action: `Merge Profiles Result: ${direction}`,
    processingLog: processingLog,
    target: direction,
    details: 'Profiles successfully merged according to identity resolution rules'
  };
};

// Helper function to extract identifiers from event data
const extractIdentifiersFromEvent = (eventData, identifierOptions) => {
  const identifiers = {};
  
  // Check each configured identifier option
  identifierOptions.forEach(option => {
    const key = option.value;
    let value = null;

    // Map of identifier ID to possible event field paths
    const fieldMappings = {
      'user_id': ['userId', 'user_id', 'userID'],
      'anonymous_id': ['anonymousId', 'anonymous_id'],
      'email': ['email', 'traits.email', 'properties.email', 'context.traits.email'],
      'phone': ['phone', 'traits.phone', 'properties.phone', 'context.traits.phone'],
      'android.id': ['context.device.id'],
      'android.idfa': ['context.device.advertisingId'],
      'android.push_token': ['context.device.token'],
      'ga_client_id': ['context.integrations.Google Analytics.clientId'],
      'ios.id': ['context.device.id'],
      'ios.idfa': ['context.device.advertisingId'],
      'ios.push_token': ['context.device.token']
    };

    // Get possible field paths for this identifier
    const possiblePaths = fieldMappings[key] || [
      key,
      `traits.${key}`,
      `properties.${key}`,
      `context.traits.${key}`,
      `context.externalIds.${key}`
    ];

    // Try each possible path
    for (const path of possiblePaths) {
      value = getNestedValue(eventData, path);
      if (value) break;
    }

    // Special handling for externalIds in context
    if (!value && eventData.context && Array.isArray(eventData.context.externalIds)) {
      const externalId = eventData.context.externalIds.find(ext => ext.type === key);
      if (externalId && externalId.id) {
        value = externalId.id;
      }
    }

    // Check top-level external_ids array (from profile API events)
    if (!value && Array.isArray(eventData.external_ids)) {
      const externalId = eventData.external_ids.find(ext => ext.type === key);
      if (externalId && externalId.id) {
        value = externalId.id;
      }
    }

    // Check properties.external_ids array (from profile API events in properties)
    if (!value && eventData.properties && Array.isArray(eventData.properties.external_ids)) {
      const externalId = eventData.properties.external_ids.find(ext => ext.type === key);
      if (externalId && externalId.id) {
        value = externalId.id;
      }
    }

    // Check context.identifiers object (from profile API events)
    if (!value && eventData.context && eventData.context.identifiers && eventData.context.identifiers[key]) {
      value = eventData.context.identifiers[key];
    }

    if (value) {
      identifiers[key] = {
        value: value,
        label: option.label,
        priority: option.priority,
        limit: option.limit,
        frequency: option.frequency,
        isCustom: option.isCustom
      };
    }
  });

  return identifiers;
};

export default DiagramTimeline;
