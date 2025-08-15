import React, { useState, useEffect } from 'react';
import DiagramNode from './DiagramNode';
import './DiagramTimeline.css';

const DiagramTimeline = ({ events, identifierOptions, unifySpaceSlug }) => {
  const [processedEvents, setProcessedEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Process events to determine identity resolution actions
    const processEventsForVisualization = async () => {
      setLoading(true);
      
      // Sort events by timestamp
      const sortedEvents = [...events].sort((a, b) => {
        const timestampA = a.timestamp || new Date(a.createdAt).getTime();
        const timestampB = b.timestamp || new Date(b.createdAt).getTime();
        return timestampA - timestampB;
      });

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

        // Extract identifiers from the event
        const eventIdentifiers = extractIdentifiersFromEvent(eventData, identifierOptions);
        
        // Determine the identity resolution action based on the logic
        const action = await determineIdentityResolutionAction(
          eventIdentifiers, 
          processed, 
          identifierOptions
        );

        // Create processed event with action and metadata
        const processedEvent = {
          ...event,
          eventData,
          identifiers: eventIdentifiers,
          action,
          sequenceNumber: i + 1,
          timestamp: eventData.timestamp || eventData.originalTimestamp || event.timestamp || new Date(event.createdAt).getTime()
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
  }, [events, identifierOptions]);

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
      <div className="diagram-timeline__header">
        <h3>Identity Resolution Flow - {processedEvents.length} Events</h3>
        <p>This diagram shows how each event affects identity resolution based on existing profiles and configured rules.</p>
      </div>

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

// Helper function to get nested value from object using dot notation
const getNestedValue = (obj, path) => {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : null;
  }, obj);
};

// Helper function to determine identity resolution action based on the flowchart logic
const determineIdentityResolutionAction = async (eventIdentifiers, previousEvents, identifierOptions) => {
  // Simulate the identity resolution decision logic from the flowchart
  const existingProfiles = getExistingProfilesFromEvents(previousEvents);
  const identifierKeys = Object.keys(eventIdentifiers);
  
  if (identifierKeys.length === 0) {
    return {
      type: 'create_new',
      reason: 'No identifiers in event payload',
      description: 'Event contains no identifiable information, creating new profile',
      droppedIdentifiers: [],
      conflictingIdentifiers: [],
      profiles: []
    };
  }

  // Step 1: Check if any identifiers exist on other profiles
  const matchingProfiles = findProfilesWithMatchingIdentifiers(existingProfiles, eventIdentifiers);
  
  if (matchingProfiles.length === 0) {
    return {
      type: 'create_new',
      reason: 'No existing profiles match event identifiers',
      description: 'No profiles contain any of the identifiers from this event',
      droppedIdentifiers: [],
      conflictingIdentifiers: [],
      profiles: []
    };
  }

  // Step 2: Check for conflicts with identity resolution limits
  const conflicts = checkForIdentityResolutionConflicts(matchingProfiles, eventIdentifiers);
  
  if (conflicts.length > 0) {
    // Need to drop identifiers based on priority
    const droppedIdentifiers = resolveConflictsByDroppingIdentifiers(eventIdentifiers, conflicts, identifierOptions);
    const remainingIdentifiers = { ...eventIdentifiers };
    droppedIdentifiers.forEach(id => delete remainingIdentifiers[id]);
    
    // Re-evaluate with remaining identifiers
    const remainingMatches = findProfilesWithMatchingIdentifiers(existingProfiles, remainingIdentifiers);
    
    if (remainingMatches.length === 0) {
      return {
        type: 'create_new',
        reason: 'No profiles match after resolving conflicts',
        description: 'After dropping conflicting identifiers, no existing profiles match',
        droppedIdentifiers,
        conflictingIdentifiers: conflicts.map(c => c.identifier),
        profiles: []
      };
    } else if (remainingMatches.length === 1) {
      return {
        type: 'add_to_existing',
        reason: 'Single profile matches after conflict resolution',
        description: 'Event will be added to existing profile after dropping conflicting identifiers',
        droppedIdentifiers,
        conflictingIdentifiers: conflicts.map(c => c.identifier),
        profiles: remainingMatches
      };
    } else {
      // Multiple profiles need merging
      return {
        type: 'merge_profiles',
        reason: 'Multiple profiles need to be merged after conflict resolution',
        description: 'Event identifiers span multiple profiles which will be merged',
        droppedIdentifiers,
        conflictingIdentifiers: conflicts.map(c => c.identifier),
        profiles: remainingMatches
      };
    }
  }

  // No conflicts
  if (matchingProfiles.length === 1) {
    return {
      type: 'add_to_existing',
      reason: 'Single profile matches without conflicts',
      description: 'Event will be added to the existing profile',
      droppedIdentifiers: [],
      conflictingIdentifiers: [],
      profiles: matchingProfiles
    };
  } else {
    // Multiple profiles need merging
    const mergeConflicts = checkForMergeConflicts(matchingProfiles, eventIdentifiers);
    
    if (mergeConflicts.length > 0) {
      const droppedIdentifiers = resolveConflictsByDroppingIdentifiers(eventIdentifiers, mergeConflicts, identifierOptions);
      return {
        type: 'merge_profiles',
        reason: 'Multiple profiles will be merged after resolving merge conflicts',
        description: 'Event spans multiple profiles which will be merged after dropping conflicting identifiers',
        droppedIdentifiers,
        conflictingIdentifiers: mergeConflicts.map(c => c.identifier),
        profiles: matchingProfiles
      };
    } else {
      return {
        type: 'merge_profiles',
        reason: 'Multiple profiles will be merged without conflicts',
        description: 'Event spans multiple profiles which can be safely merged',
        droppedIdentifiers: [],
        conflictingIdentifiers: [],
        profiles: matchingProfiles
      };
    }
  }
};

// Helper functions for identity resolution logic
const getExistingProfilesFromEvents = (events) => {
  // Simulate existing profiles based on processed events
  const profiles = new Map();
  
  events.forEach(event => {
    if (event.action && event.action.type !== 'create_new') {
      Object.keys(event.identifiers).forEach(key => {
        const identifier = event.identifiers[key];
        const profileKey = `${key}:${identifier.value}`;
        
        if (!profiles.has(profileKey)) {
          profiles.set(profileKey, {
            id: `profile_${profiles.size + 1}`,
            identifiers: new Set([`${key}:${identifier.value}`]),
            events: []
          });
        }
        
        profiles.get(profileKey).events.push(event);
      });
    }
  });
  
  return Array.from(profiles.values());
};

const findProfilesWithMatchingIdentifiers = (profiles, eventIdentifiers) => {
  const matchingProfiles = [];
  
  profiles.forEach(profile => {
    const hasMatch = Object.keys(eventIdentifiers).some(key => {
      const identifierString = `${key}:${eventIdentifiers[key].value}`;
      return profile.identifiers.has(identifierString);
    });
    
    if (hasMatch) {
      matchingProfiles.push(profile);
    }
  });
  
  return matchingProfiles;
};

const checkForIdentityResolutionConflicts = (profiles, eventIdentifiers) => {
  const conflicts = [];
  
  // Check each identifier against its configured limits
  Object.keys(eventIdentifiers).forEach(identifierKey => {
    const identifier = eventIdentifiers[identifierKey];
    
    // Count how many times this identifier value appears across profiles
    let usageCount = 0;
    profiles.forEach(profile => {
      if (profile.identifiers.has(`${identifierKey}:${identifier.value}`)) {
        usageCount++;
      }
    });
    
    // Check if adding this event would exceed the limit
    if (identifier.limit && usageCount >= identifier.limit) {
      conflicts.push({
        identifier: identifierKey,
        reason: `Exceeds ${identifier.frequency.toLowerCase()} limit of ${identifier.limit}`,
        currentUsage: usageCount,
        limit: identifier.limit,
        profile: profiles.find(p => p.identifiers.has(`${identifierKey}:${identifier.value}`))?.id
      });
    }
  });
  
  return conflicts;
};

const checkForMergeConflicts = (profiles, eventIdentifiers) => {
  const conflicts = [];
  
  // Check if merging would cause any identifiers to exceed their limits
  Object.keys(eventIdentifiers).forEach(identifierKey => {
    const identifier = eventIdentifiers[identifierKey];
    
    // Count total usage across all profiles that would be merged
    const totalUsage = profiles.reduce((count, profile) => {
      const hasIdentifier = Array.from(profile.identifiers).some(id => 
        id.startsWith(`${identifierKey}:`)
      );
      return count + (hasIdentifier ? 1 : 0);
    }, 0);
    
    if (identifier.limit && totalUsage > identifier.limit) {
      conflicts.push({
        identifier: identifierKey,
        reason: `Merge would exceed ${identifier.frequency.toLowerCase()} limit of ${identifier.limit}`,
        currentUsage: totalUsage,
        limit: identifier.limit,
        profiles: profiles.map(p => p.id)
      });
    }
  });
  
  return conflicts;
};

const resolveConflictsByDroppingIdentifiers = (eventIdentifiers, conflicts, identifierOptions) => {
  const droppedIdentifiers = [];
  
  // Get all conflicting identifier keys
  const conflictingKeys = conflicts.map(c => c.identifier);
  
  // Sort conflicting identifiers by priority (higher priority number = lower priority, should be dropped first)
  const sortedConflicting = conflictingKeys.sort((a, b) => {
    const identifierA = eventIdentifiers[a];
    const identifierB = eventIdentifiers[b];
    // Higher priority number means lower priority (drop first)
    return (identifierB?.priority || 999) - (identifierA?.priority || 999);
  });
  
  // Drop identifiers starting with lowest priority until conflicts are resolved
  for (const identifierKey of sortedConflicting) {
    if (eventIdentifiers[identifierKey]) {
      droppedIdentifiers.push(identifierKey);
      
      // Check if dropping this identifier resolves enough conflicts
      // For simplicity, we'll drop all conflicting identifiers
      // In a real system, you'd re-evaluate after each drop
    }
  }
  
  return droppedIdentifiers;
};

export default DiagramTimeline;
