import React, { useMemo } from 'react';
import UniqueProfile from '../UniqueProfile/UniqueProfile.jsx';
import './UniqueProfilesList.css';

const UniqueProfilesList = ({ profileApiResults, events, onHighlightEvents }) => {
  // Add debugging for incoming data
  console.group('🔍 [UNIQUE PROFILES LIST] Processing profile API results');
  console.log(`📦 Received profileApiResults:`, profileApiResults);
  console.log(`📊 Number of identifiers:`, Object.keys(profileApiResults || {}).length);
  console.groupEnd();
  
  // Process Profile API results into unique profiles
  const uniqueProfiles = useMemo(() => {
    if (!profileApiResults || Object.keys(profileApiResults).length === 0) {
      return [];
    }

    const profilesMap = new Map();

    // Process each API result
    Object.entries(profileApiResults).forEach(([identifier, result]) => {
      if (!result) return;

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

      // Process each endpoint's data
      endpointsToProcess.forEach(({ endpoint: endpointType, data, identifier }) => {
        if (!data) return;

        console.group(`🔍 [ENDPOINT PROCESSING] ${endpointType} for ${identifier}`);
        console.log(`📋 Raw data:`, data);

        // Determine the endpoint type if not already known
        if (endpointType === 'unknown') {
          if (Array.isArray(data)) {
            // External IDs endpoint - array of identifier objects
            if (data.length > 0 && data[0].type && data[0].id) {
              endpointType = 'external_ids';
            }
            // Events endpoint - array of event objects
            else if (data.length > 0 && (data[0].event || data[0].type)) {
              endpointType = 'events';
            }
          } else if (typeof data === 'object') {
            // Traits or metadata endpoint - object with key-value pairs
            if (data.segment_id && data.metadata) {
              endpointType = 'metadata';
            } else {
              endpointType = 'traits';
            }
          }
        }

        // Find segment_id from metadata endpoint for grouping, fall back to user_id
        let segmentId = null;
        let userId = null;
        let profileKey = identifier; // Default to the lookup identifier

        // First, check if we have metadata endpoint data for this identifier
        if (endpointType === 'metadata' && data.segment_id) {
          segmentId = data.segment_id;
          profileKey = segmentId; // Group by segment_id
        } else {
          // Check if we already have metadata for this identifier in the current batch
          const metadataFromSameIdentifier = result._combinedData?.metadata;
          if (metadataFromSameIdentifier && metadataFromSameIdentifier.segment_id) {
            segmentId = metadataFromSameIdentifier.segment_id;
            profileKey = segmentId;
          }
        }

        // Fall back to user_id grouping if no segment_id available
        if (!segmentId) {
          if (endpointType === 'external_ids') {
            // Look for user_id in external IDs - handle nested data structure
            const externalIdsArray = Array.isArray(data) ? data : (data.data || []);
            const userIdEntry = externalIdsArray.find(entry => entry.type === 'user_id');
            if (userIdEntry) {
              userId = userIdEntry.id;
              profileKey = userId; // Group by user_id
            }
          } else if (endpointType === 'traits') {
            // Extract user_id from identifier (e.g., "user_id:3eca7d22-6f6d-4ef0-8f4b-19296da2612f")
            if (identifier.startsWith('user_id:')) {
              userId = identifier.replace('user_id:', '');
              profileKey = userId;
            } else if (data.user_id) {
              userId = data.user_id;
              profileKey = userId;
            }
          } else if (endpointType === 'events') {
            // Look for user_id in event data - handle nested data structure
            const eventsArray = Array.isArray(data) ? data : (data.data || []);
            const eventWithUserId = eventsArray.find(event => event.userId || event.user_id);
            if (eventWithUserId) {
              userId = eventWithUserId.userId || eventWithUserId.user_id;
              profileKey = userId;
            } else {
              // If no userId in event, look in external_ids within each event
              const eventWithExternalIds = eventsArray.find(event => 
                event.external_ids && Array.isArray(event.external_ids)
              );
              if (eventWithExternalIds) {
                const userIdExternal = eventWithExternalIds.external_ids.find(extId => extId.type === 'user_id');
                if (userIdExternal) {
                  userId = userIdExternal.id;
                  profileKey = userId;
                } else {
                  // Try to match with any other external_id that might correspond to existing profiles
                  const emailExternal = eventWithExternalIds.external_ids.find(extId => extId.type === 'email');
                  if (emailExternal) {
                    profileKey = `email:${emailExternal.id}`;
                  }
                }
              }
            }
          }
        }

        console.log(`🔑 Profile key resolution:`);
        console.log(`  - Identifier: ${identifier}`);
        console.log(`  - Endpoint: ${endpointType}`);
        console.log(`  - Found segmentId: ${segmentId}`);
        console.log(`  - Found userId: ${userId}`);
        console.log(`  - Profile key: ${profileKey}`);

        // For events endpoint, try to find existing profile by matching external_ids
        if (endpointType === 'events' && !profilesMap.has(profileKey)) {
          const eventsArray = Array.isArray(data) ? data : (data.data || []);
          const eventWithExternalIds = eventsArray.find(event => 
            event.external_ids && Array.isArray(event.external_ids)
          );
          
          if (eventWithExternalIds && eventWithExternalIds.external_ids) {
            // Try to find an existing profile that has matching external_ids
            for (const [existingKey, existingProfile] of profilesMap.entries()) {
              if (existingProfile.externalIds && existingProfile.externalIds.length > 0) {
                // Check if any external_id from the event matches any external_id from existing profile
                const hasMatchingId = eventWithExternalIds.external_ids.some(eventExtId => 
                  existingProfile.externalIds.some(profileExtId => 
                    profileExtId.type === eventExtId.type && profileExtId.id === eventExtId.id
                  )
                );
                
                if (hasMatchingId) {
                  profileKey = existingKey;
                  userId = existingProfile.userId || userId;
                  console.log(`🔗 Matched event to existing profile: ${existingKey}`);
                  break;
                }
              }
            }
          }
        }

        // Get or create profile
        if (!profilesMap.has(profileKey)) {
          console.log(`🆕 Creating new profile for key: ${profileKey}`);
          profilesMap.set(profileKey, {
            id: profileKey,
            segmentId: segmentId,
            userId: userId,
            lookupIdentifier: identifier,
            endpoints: [],
            externalIds: [],
            traits: {},
            events: [],
            metadata: null,
            eventCount: 0,
            eventIndices: [],
            firstSeen: null,
            lastSeen: null,
          });
        } else {
          console.log(`🔄 Using existing profile for key: ${profileKey}`);
        }

        const profile = profilesMap.get(profileKey);

        // Update segmentId and userId if we found them and profile doesn't have them yet
        if (segmentId && !profile.segmentId) {
          profile.segmentId = segmentId;
        }
        if (userId && !profile.userId) {
          profile.userId = userId;
        }

        // Add endpoint to the list if not already present (exclude metadata from visible endpoints)
        if (endpointType !== 'metadata' && !profile.endpoints.includes(endpointType)) {
          profile.endpoints.push(endpointType);
        }

        // Process data based on endpoint type
        if (endpointType === 'metadata') {
          // Store metadata information
          profile.metadata = data;
          
          // Update profile ID to use segment_id if available
          if (data.segment_id && profile.id !== data.segment_id) {
            // Update the map key to use segment_id
            profilesMap.delete(profileKey);
            profile.id = data.segment_id;
            profile.segmentId = data.segment_id;
            profilesMap.set(data.segment_id, profile);
          }
          
          // Update timestamps from metadata
          if (data.metadata) {
            if (data.metadata.created_at) {
              const createdAt = new Date(data.metadata.created_at);
              if (!profile.firstSeen || createdAt < new Date(profile.firstSeen)) {
                profile.firstSeen = createdAt.toISOString();
              }
            }
            if (data.metadata.updated_at) {
              const updatedAt = new Date(data.metadata.updated_at);
              if (!profile.lastSeen || updatedAt > new Date(profile.lastSeen)) {
                profile.lastSeen = updatedAt.toISOString();
              }
            }
          }
        } else if (endpointType === 'external_ids') {
          // Merge external IDs, avoiding duplicates - handle nested data structure
          const externalIdsArray = Array.isArray(data) ? data : (data.data || []);
          externalIdsArray.forEach(identifier => {
            const exists = profile.externalIds.some(existing => 
              existing.type === identifier.type && existing.id === identifier.id
            );
            if (!exists) {
              profile.externalIds.push(identifier);
            }
          });

          // Update timestamps from external IDs
          const timestamps = externalIdsArray
            .map(id => id.created_at)
            .filter(Boolean)
            .map(date => new Date(date));
            
          if (timestamps.length > 0) {
            const earliest = new Date(Math.min(...timestamps));
            const latest = new Date(Math.max(...timestamps));
            
            if (!profile.firstSeen || earliest < new Date(profile.firstSeen)) {
              profile.firstSeen = earliest.toISOString();
            }
            if (!profile.lastSeen || latest > new Date(profile.lastSeen)) {
              profile.lastSeen = latest.toISOString();
            }
          }
        }

        if (endpointType === 'traits') {
          // Merge traits
          console.group(`🔍 [TRAITS PROCESSING] Processing traits for: ${identifier}`);
          console.log(`📊 Current traits:`, profile.traits);
          console.log(`📥 Full response:`, data);
          console.log(`➕ New traits data:`, data.traits || data);
          
          // Handle all possible response formats:
          // 1. Segment API traits response format: { traits: { trait1: value1, ... }, cursor: {...} }
          // 2. Direct traits object: { trait1: value1, ... }
          // 3. Legacy data format: { data: {...} }
          const traitsData = data.traits || data.data || data;
          
          if (traitsData && typeof traitsData === 'object') {
            profile.traits = { ...profile.traits, ...traitsData };
            console.log(`✅ Merged traits:`, profile.traits);
            console.log(`📋 Total trait count: ${Object.keys(profile.traits).length}`);
          } else {
            console.warn(`⚠️ No traits found in response data`);
          }
          
          console.groupEnd();
        }

        if (endpointType === 'events') {
          // Add events, avoiding duplicates - handle nested data structure
          const eventsArray = Array.isArray(data) ? data : (data.data || []);
          eventsArray.forEach(event => {
            const exists = profile.events.some(existing => 
              existing.message_id === event.message_id || 
              (existing.timestamp === event.timestamp && existing.event === event.event)
            );
            if (!exists) {
              profile.events.push(event);
            }
          });

          // Update event count and timestamps
          profile.eventCount = profile.events.length;
          
          const eventTimestamps = eventsArray
            .map(event => event.timestamp)
            .filter(Boolean)
            .map(date => new Date(date));
            
          if (eventTimestamps.length > 0) {
            const earliest = new Date(Math.min(...eventTimestamps));
            const latest = new Date(Math.max(...eventTimestamps));
            
            if (!profile.firstSeen || earliest < new Date(profile.firstSeen)) {
              profile.firstSeen = earliest.toISOString();
            }
            if (!profile.lastSeen || latest > new Date(profile.lastSeen)) {
              profile.lastSeen = latest.toISOString();
            }
          }
        }

        console.groupEnd();
      });
    });

    const profiles = Array.from(profilesMap.values());
    console.log(`🏁 [UNIQUE PROFILES LIST] Final profiles:`, profiles);
    return profiles;
  }, [profileApiResults]);

  // Add event indices to profiles for event highlighting
  const profilesWithEventIndices = useMemo(() => {
    return uniqueProfiles.map(profile => {
      const eventIndices = [];
      
      if (profile.events && profile.events.length > 0 && events && events.length > 0) {
        profile.events.forEach(profileEvent => {
          const matchingIndices = events.map((event, index) => {
            // Match by messageId if available
            if (profileEvent.message_id && event.messageId === profileEvent.message_id) {
              return index;
            }
            
            // Match by userId and event name combination
            if (profileEvent.userId === profile.userId && 
                profileEvent.event === event.event &&
                profileEvent.timestamp === event.timestamp) {
              return index;
            }
            
            return null;
          }).filter(index => index !== null);
          
          eventIndices.push(...matchingIndices);
        });
      }
      
      return { ...profile, eventIndices };
    });
  }, [uniqueProfiles, events]);

  return (
    <div className="unique-profiles-list">
      <div className="unique-profiles-list__header">
        <h3 className="unique-profiles-list__title">
          Profile Lookups ({profilesWithEventIndices.length})
        </h3>
        <p className="unique-profiles-list__subtitle">
          Profiles built from Profile API responses
        </p>
      </div>
      
      <div className="unique-profiles-list__content">
        {profilesWithEventIndices.length === 0 ? (
          <div className="unique-profiles-list__empty">
            <p className="unique-profiles-list__empty-message">
              No profile lookups performed yet.
            </p>
            <p className="unique-profiles-list__empty-subtitle">
              Use the Profile Lookup tool to query the Segment Profile API.
            </p>
          </div>
        ) : (
          <div className="unique-profiles-list__profiles">
            {profilesWithEventIndices.map((profile, index) => (
              <UniqueProfile
                key={profile.id || index}
                profile={profile}
                onHighlightEvents={onHighlightEvents}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UniqueProfilesList;
