import React, { useState, useEffect } from 'react';
import DiagramNode2 from './DiagramNode2';
import { IdentitySimulation } from '../../utils/identitySimulation.js';
import './DiagramTimeline2.css';

const DiagramTimeline2 = ({ events, identifierOptions, unifySpaceSlug, profileApiResults = {}, onSimulationUpdate }) => {
  const [processedEvents, setProcessedEvents] = useState([]);
  const [simulation, setSimulation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hoveredProfileId, setHoveredProfileId] = useState(null);

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
        
        // Create processed event with simulation results
        const processedEvent = {
          ...event,
          eventData: JSON.parse(event.rawData),
          identifiers: eventIdentifiers,
          simulationResult: result,
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
    };

    if (events.length > 0) {
      processEventsForSimulation();
    } else {
      setProcessedEvents([]);
      setSimulation(null);
      setLoading(false);
      
      // Notify parent component about simulation clear
      if (onSimulationUpdate) {
        onSimulationUpdate(null);
      }
    }
  }, [events, identifierOptions]);

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
            return profiles.length > 0 && (
              <div className="diagram-timeline2__profiles-list">
                {profiles.map((profile, idx) => (
                  <div 
                    key={profile.id || idx} 
                    className="visualizer2__profile-card"
                    onMouseEnter={() => {
                      console.log('Profile hover enter:', profile.id);
                      setHoveredProfileId(profile.id);
                    }}
                    onMouseLeave={() => {
                      console.log('Profile hover leave');
                      setHoveredProfileId(null);
                    }}
                  >
                    <div className="visualizer2__profile-header">
                      <div className="visualizer2__profile-avatar">👤</div>
                      <div className="visualizer2__profile-info">
                        <h4>{profile.id}</h4>
                        <div className="visualizer2__profile-id">Profile ID: {profile.id}</div>
                      </div>
                    </div>
                    
                    <div className="visualizer2__profile-stats">
                      <div className="visualizer2__profile-stat">
                        <div className="visualizer2__profile-stat-value">{Object.keys(profile.identifiers).length}</div>
                        <div className="visualizer2__profile-stat-label">Identifiers</div>
                      </div>
                      <div className="visualizer2__profile-stat">
                        <div className="visualizer2__profile-stat-value">{profile.events ? profile.events.length : 0}</div>
                        <div className="visualizer2__profile-stat-label">Events</div>
                      </div>
                    </div>
                    
                    <div className="visualizer2__profile-identifiers">
                      <div className="visualizer2__identifiers-label">Identifiers</div>
                      {Object.entries(profile.identifiers).map(([type, value]) => (
                        <div key={type} className={`visualizer2__identifier-row ${type === 'email' ? 'visualizer2__identifier-row--email' : ''}`}>
                          <span className="visualizer2__identifier-type">{type}:</span>
                          <span className="visualizer2__identifier-values">
                            {Array.isArray(value) ? value.join(', ') : value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
          {/* Event Nodes */}
          <div className="diagram-timeline2__event-nodes">
            {processedEvents.map((event, index) => {
              if (hoveredProfileId) {
                console.log('Event simulation result:', {
                  eventIndex: index,
                  eventId: event.id,
                  simulationResult: event.simulationResult,
                  profileId: event.simulationResult?.profile?.id
                });
              }
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
