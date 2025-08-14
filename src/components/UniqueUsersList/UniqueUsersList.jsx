import React, { useMemo } from 'react';
import UniqueUser from '../UniqueUser/UniqueUser.jsx';
import './UniqueUsersList.css';

const UniqueUsersList = ({ events, currentUser, onHighlightEvents }) => {
  // Extract unique users from events
  const uniqueUsers = useMemo(() => {
    const usersMap = new Map();
    
    // Process events to build user profiles
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
        
        // Find existing user to merge with based on the hierarchy:
        // 1. If event has userId, find user with same userId
        // 2. If event has anonymousId, find user with same anonymousId (regardless of whether they have userId)
        // 3. If event has email, find user with same email and matching userId or anonymousId
        let existingUserKey = null;
        
        for (const [key, existingUser] of usersMap.entries()) {
          // Priority 1: Match by userId if current event has userId
          if (userId && existingUser.identifierValues.userId && existingUser.identifierValues.userId.includes(userId)) {
            existingUserKey = key;
            break;
          }
          
          // Priority 2: Match by anonymousId if current event has anonymousId
          if (anonymousId && existingUser.identifierValues.anonymousId && existingUser.identifierValues.anonymousId.includes(anonymousId)) {
            existingUserKey = key;
            break;
          }
        }
        
        // If no match found by userId or anonymousId, check email matching
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
        
        // If no existing user found, create a new key
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
        
        if (!usersMap.has(existingUserKey)) {
          usersMap.set(existingUserKey, {
            userId: userId || null,
            anonymousIds: anonymousId ? [anonymousId] : [], // Store as array for backward compatibility
            email: email || null,
            identifierValues: {}, // New structure to store all unique values per identifier type
            traits: parsed.traits || {},
            properties: parsed.properties || {},
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
        
        // Collect all unique identifier values for this user
        Object.entries(allIdentifierFields).forEach(([fieldName, fieldValue]) => {
          if (fieldValue !== null && fieldValue !== undefined && fieldValue !== '') {
            // Initialize array for this identifier type if it doesn't exist
            if (!user.identifierValues[fieldName]) {
              user.identifierValues[fieldName] = [];
            }
            
            // Add unique values only
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
          // Initialize anonymousIds array if it doesn't exist (for backward compatibility)
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
    
    // Convert map to array and sort by event count (descending) then by first seen (ascending)
    return Array.from(usersMap.values()).sort((a, b) => {
      if (b.eventCount !== a.eventCount) {
        return b.eventCount - a.eventCount;
      }
      return new Date(a.firstSeen) - new Date(b.firstSeen);
    });
  }, [events]);
  
  // Check if current user matches any unique user
  const isCurrentUserActive = (user) => {
    if (!currentUser || Object.keys(currentUser).length === 0) return false;
    
    return (
      (currentUser.userId && currentUser.userId === user.userId) ||
      (currentUser.anonymousId && user.anonymousIds && user.anonymousIds.includes(currentUser.anonymousId)) ||
      (currentUser.email && currentUser.email === user.email)
    );
  };
  
  return (
    <div className="unique-users-list">
      <div className="unique-users-list__header">
        <h3 className="unique-users-list__title">
          Unique Users ({uniqueUsers.length})
        </h3>
        <p className="unique-users-list__subtitle">
          Users identified from saved events
        </p>
      </div>
      
      <div className="unique-users-list__content">
        {uniqueUsers.length === 0 ? (
          <div className="unique-users-list__empty">
            <p className="unique-users-list__empty-message">
              No users found yet.
            </p>
            <p className="unique-users-list__empty-subtitle">
              Save events to see unique users appear here.
            </p>
          </div>
        ) : (
          <div className="unique-users-list__users">
            {uniqueUsers.map((user, index) => {
              const compositeKey = [user.userId, ...(user.anonymousIds || []), user.email].filter(Boolean).join('|') || `anonymous-${index}`;
              
              return (
                <UniqueUser
                  key={compositeKey}
                  user={user}
                  eventCount={user.eventCount}
                  eventIndices={user.eventIndices || []}
                  isActive={isCurrentUserActive(user)}
                  onHighlightEvents={onHighlightEvents}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default UniqueUsersList;
