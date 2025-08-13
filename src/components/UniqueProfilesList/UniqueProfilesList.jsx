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
            // Traits endpoint - object with trait key-value pairs
            endpointType = 'traits';
          }
        }

        // Find user_id from the data to group profiles
        let userId = null;
        let profileKey = identifier; // Default to the lookup identifier

        if (endpointType === 'external_ids') {
          // Look for user_id in external IDs
          const userIdEntry = data.find(entry => entry.type === 'user_id');
          if (userIdEntry) {
            userId = userIdEntry.id;
            profileKey = userId; // Group by user_id
          }
        } else if (endpointType === 'traits') {
          // Check if traits contain user_id information
          if (data.user_id) {
            userId = data.user_id;
            profileKey = userId;
          }
        } else if (endpointType === 'events') {
          // Look for user_id in event data
          const eventWithUserId = data.find(event => event.userId || event.user_id);
          if (eventWithUserId) {
            userId = eventWithUserId.userId || eventWithUserId.user_id;
            profileKey = userId;
          }
        }

        console.log(`🔑 Profile key resolution:`);
        console.log(`  - Identifier: ${identifier}`);
        console.log(`  - Endpoint: ${endpointType}`);
        console.log(`  - Found userId: ${userId}`);
        console.log(`  - Profile key: ${profileKey}`);

        // Get or create profile
        if (!profilesMap.has(profileKey)) {
          console.log(`🆕 Creating new profile for key: ${profileKey}`);
          profilesMap.set(profileKey, {
            id: profileKey,
            userId: userId,
            lookupIdentifier: identifier,
            endpoints: [],
            externalIds: [],
            traits: {},
            events: [],
            eventCount: 0,
            eventIndices: [],
            firstSeen: null,
            lastSeen: null,
          });
        } else {
          console.log(`🔄 Using existing profile for key: ${profileKey}`);
        }

        const profile = profilesMap.get(profileKey);

      // Add endpoint to the list if not already present
      if (!profile.endpoints.includes(endpointType)) {
        profile.endpoints.push(endpointType);
      }

        // Process data based on endpoint type
        if (endpointType === 'external_ids') {
          // Merge external IDs, avoiding duplicates
          data.forEach(identifier => {
            const exists = profile.externalIds.some(existing => 
              existing.type === identifier.type && existing.id === identifier.id
            );
            if (!exists) {
              profile.externalIds.push(identifier);
            }
          });

          // Update timestamps from external IDs
          const timestamps = data
            .map(id => id.created_at)
            .filter(Boolean)
            .map(date => new Date(date));        if (timestamps.length > 0) {
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
          console.log(`➕ New traits data:`, data.traits);
          
          if (data.traits) {
            profile.traits = { ...profile.traits, ...data.traits };
            console.log(`✅ Merged traits:`, profile.traits);
            console.log(`📋 Total trait count: ${Object.keys(profile.traits).length}`);
          } else {
            console.warn(`⚠️ No traits found in response data`);
          }
          
          console.groupEnd();
        }

        if (endpointType === 'events') {
          // Add events, avoiding duplicates
          data.forEach(event => {
            const exists = profile.events.some(existing => 
              existing.messageId === event.messageId || 
              (existing.timestamp === event.timestamp && existing.event === event.event)
            );
            if (!exists) {
              profile.events.push(event);
            }
          });

          // Update event count and timestamps
          profile.eventCount = profile.events.length;
          
          const eventTimestamps = data
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
        console.groupEnd(); // Close endpoint processing group
      }); // Close endpointsToProcess.forEach
    }); // Close profileApiResults Object.entries

    // Convert map to array and sort
    return Array.from(profilesMap.values()).sort((a, b) => {
      // Sort by user_id presence first, then by event count, then by first seen
      if (a.userId && !b.userId) return -1;
      if (!a.userId && b.userId) return 1;
      if (b.eventCount !== a.eventCount) return b.eventCount - a.eventCount;
      if (a.firstSeen && b.firstSeen) {
        return new Date(a.firstSeen) - new Date(b.firstSeen);
      }
      return 0;
    });
  }, [profileApiResults]);

  // Match profiles with event indices from the events list
  const profilesWithEventIndices = useMemo(() => {
    return uniqueProfiles.map(profile => {
      const eventIndices = [];
      
      if (events && profile.userId) {
        events.forEach((event, index) => {
          try {
            const parsed = JSON.parse(event.rawData);
            const eventUserId = parsed.userId || parsed.user_id;
            if (eventUserId === profile.userId) {
              eventIndices.push(index);
            }
          } catch {}
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
