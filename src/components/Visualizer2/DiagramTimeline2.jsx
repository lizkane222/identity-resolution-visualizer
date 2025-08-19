import React, { useState, useEffect, useCallback } from 'react';
import DiagramNode2 from './DiagramNode2';
import { IdentitySimulation } from '../../utils/identitySimulation.js';
import './DiagramTimeline2.css';

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
    
    // Extract identifiers for display
    const identifiersList = Object.entries(event.identifiers).map(([key, identifier]) => 
      `${key}: ${identifier.value || identifier}`
    ).join(', ');

    let profileAction = '';
    let profileId = '';
    
    if (action.type === 'create_new') {
      profileCounter++;
      profileId = `Profile ${profileCounter}`;
      profileMap.set(action.profileStats?.profileId || `profile_${profileCounter}`, profileId);
      profileAction = `🆕 **Create New Profile** (${profileId})`;
    } else if (action.type === 'add_event_to_existing') {
      const simProfileId = action.profileStats?.profileId || action.profiles?.[0]?.id;
      profileId = profileMap.get(simProfileId) || `Profile ${profileCounter}`;
      profileAction = `➕ **Add Event to Existing Profile** (${profileId})`;
    } else if (action.type === 'add_identifier_to_existing') {
      const simProfileId = action.profileStats?.profileId || action.profiles?.[0]?.id;
      profileId = profileMap.get(simProfileId) || `Profile ${profileCounter}`;
      profileAction = `🔗 **Add Identifier to Existing Profile** (${profileId})`;
    } else if (action.type === 'merge_profiles') {
      // For merges, we need to update the profile mapping
      const baseProfileId = action.profileStats?.profileId;
      if (baseProfileId && action.simulationLogs) {
        // Find which profiles were merged
        const mergeLog = action.simulationLogs.find(log => log.includes('Starting merge'));
        if (mergeLog) {
          const merged = mergeLog.match(/Starting merge of profiles: (.+)/);
          if (merged) {
            const profileIds = merged[1].split(', ');
            // Map all merged profiles to the same display name
            const primaryProfile = profileMap.get(baseProfileId) || `Profile ${Object.keys(profileMap).length + 1}`;
            profileIds.forEach(id => {
              const fullId = `profile_${id}`;
              if (!profileMap.has(fullId)) {
                profileMap.set(fullId, `Profile ${Object.keys(profileMap).length + 1}`);
              }
            });
            profileMap.set(baseProfileId, primaryProfile);
          }
        }
      }
      profileId = profileMap.get(baseProfileId) || 'Merged Profile';
      profileAction = `🔀 **Merge Profiles** → ${profileId}`;
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
    `<img src="/assets/bar-graph_search.svg" width="16" height="16" style="vertical-align: middle; margin-right: 6px;" alt="Chart" /> **Total Events Processed:** ${totalEvents}`,
    `<img src="/assets/User-plus.svg" width="16" height="16" style="vertical-align: middle; margin-right: 6px;" alt="New Profile" /> **New Profiles Created:** ${createActions}`,
    `<img src="/assets/User-Checkmark.svg" width="16" height="16" style="vertical-align: middle; margin-right: 6px;" alt="Addition" /> **Addition Actions:** ${addActions}`,
    `<img src="/assets/Unified-Profiles.svg" width="16" height="16" style="vertical-align: middle; margin-right: 6px;" alt="Merge" /> **Profile Merges:** ${mergeActions}`,
    `<img src="/assets/User-Profile.svg" width="16" height="16" style="vertical-align: middle; margin-right: 6px;" alt="Profile" /> **Final Profile Count:** ${totalProfiles}`
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
    return 'Profiles merged successfully';
  }

  // Try to extract merge information from logs
  const mergeLog = logs.find(log => log.includes('Merged profile') || log.includes('Starting merge'));
  
  if (!mergeLog) {
    return 'Profiles merged successfully';
  }

  // For simplicity in Visualizer2, return basic merge description
  return 'Profiles merged successfully';
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

const DiagramTimeline2 = ({ events, identifierOptions, unifySpaceSlug, profileApiResults = {}, onSimulationUpdate, onAnalysisUpdate }) => {
  const [processedEvents, setProcessedEvents] = useState([]);
  const [simulation, setSimulation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hoveredProfileId, setHoveredProfileId] = useState(null);
  const [hoveredEventProfileId, setHoveredEventProfileId] = useState(null);

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
        
        // Convert simulation result to detailed action format
        const actionDetails = convertSimulationResultToAction(result, profileApiResults);
        
        // Create processed event with simulation results
        const processedEvent = {
          ...event,
          eventData: JSON.parse(event.rawData),
          identifiers: eventIdentifiers,
          simulationResult: {
            ...result,
            actionDetails: actionDetails,
            action: actionDetails.type // Use the detailed action type
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
    <div className="diagram-timeline2">
      <div className="diagram-timeline2__timeline-container">
        {/* Horizontal Timeline */}
        <div className="diagram-timeline2__timeline-line"></div>

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
                
                // Use the real profile's segmentId as the key if available, otherwise use simulation profileId
                const mapKey = realProfile?.segmentId || profileId;
                
                if (!profilesMap.has(mapKey)) {
                  profilesMap.set(mapKey, {
                    id: mapKey, // Use segmentId or profileId for consistency
                    segmentId: segmentId, // Use real segmentId when available
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
                  const isEventHighlighted = hoveredEventProfileId && hoveredEventProfileId === profile.id;
                  
                  return (
                  <div 
                    key={profile.id || idx} 
                    className={`visualizer2__profile-card ${isEventHighlighted ? 'visualizer2__profile-card--highlighted' : ''}`}
                    onMouseEnter={() => {
                      setHoveredProfileId(profile.id);
                    }}
                    onMouseLeave={() => {
                      setHoveredProfileId(null);
                    }}
                  >
                    <div className="visualizer2__profile-header">
                      <div className="visualizer2__profile-avatar">👤</div>
                      <div className="visualizer2__profile-info">
                        <h5>
                          {/* Display Profile # as primary identifier */}
                          {profile.displayName && profile.displayName.startsWith('Profile ') 
                            ? profile.displayName 
                            : profile.id && profile.id.startsWith('Profile ') 
                              ? profile.id 
                              : `Profile ${profile.id || profile.segmentId}`
                          }
                          {/* Show full name if available from traits */}
                          {(() => {
                            // Check if we have a real profile with traits data
                            const realProfile = profile.realProfile;
                            if (realProfile && realProfile.metadata && realProfile.metadata.traits) {
                              const traits = realProfile.metadata.traits;
                              const firstName = traits.firstName || traits.first_name;
                              const lastName = traits.lastName || traits.last_name;
                              if (firstName && lastName) {
                                return ` - ${firstName} ${lastName}`;
                              }
                            }
                            return '';
                          })()}
                        </h5>
                        {profile.segmentId && (
                          <div className="visualizer2__segment-id">Segment ID: {profile.segmentId}</div>
                        )}
                        {!profile.segmentId && profile.id && (
                          <div className="visualizer2__profile-id">Profile ID: {profile.id}</div>
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
                            // Match by profile ID, segmentId, or if this profile was derived from the event
                            return eventProfileId === profile.id || 
                                   eventProfileId === profile.segmentId ||
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
                          .map(([type, values]) => (
                            <div key={type} className={`visualizer2__identifier-row ${type === 'email' ? 'visualizer2__identifier-row--email' : ''}`}>
                              <span className="visualizer2__identifier-type">{type}:</span>
                              <span className="visualizer2__identifier-values">
                                {Array.isArray(values) ? values.join(', ') : values}
                              </span>
                            </div>
                          ))
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
                  hoveredProfileId={hoveredProfileId}
                  onEventHover={(profileId) => {
                    setHoveredEventProfileId(profileId);
                  }}
                  onEventHoverLeave={() => {
                    setHoveredEventProfileId(null);
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
