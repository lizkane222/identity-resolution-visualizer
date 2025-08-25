import React, { useMemo, useEffect } from 'react';
import UniqueUser from '../UniqueUser/UniqueUser.jsx';
import './UniqueUsersList.css';

const UniqueUsersList = ({ events, currentUser, onHighlightEvents, onAddEventToList }) => {
  // Extract unique users from events using proper identity resolution logic
  const uniqueUsers = useMemo(() => {
    // If no events, try to load from localStorage
    if (!events || events.length === 0) {
      try {
        const saved = localStorage.getItem('uniqueUsers_data');
        if (saved) {
          const parsedData = JSON.parse(saved);
          console.log('Loaded unique users from localStorage:', parsedData.uniqueUsers?.length);
          return parsedData.uniqueUsers || [];
        }
      } catch (error) {
        console.error('Error loading unique users from localStorage:', error);
      }
      return [];
    }

    const usersMap = new Map();
    
    // Process events to build user profiles with proper identity resolution merging
    events.forEach((event, eventIndex) => {
      try {
        const parsed = JSON.parse(event.rawData);
        // Extract identifiers (not all fields) - only pull identifier fields
        const userId = parsed.userId || parsed.user_id || parsed.userID;
        const anonymousId = parsed.anonymousId || parsed.anonymous_id;
        
        // For traits, only use actual traits fields, not track event properties
        const userTraits = parsed.traits || {};
        const contextTraits = parsed.context?.traits || {};
        const allTraits = { ...userTraits, ...contextTraits };
        
        // Extract identifier values from traits and specific fields only
        const email = allTraits.email || parsed.email;
        const phone = allTraits.phone || parsed.phone;
        
        // Only collect identifier fields for identity resolution, not all properties
        const identifierFields = {
          userId,
          anonymousId,
          email,
          phone,
          // Add other identifier fields from traits (not properties)
          ...Object.fromEntries(
            Object.entries(allTraits).filter(([key, value]) => {
              // Only include fields that are likely identifiers (not arbitrary trait data)
              const identifierKeywords = ['id', 'email', 'phone', 'username', 'account'];
              return identifierKeywords.some(keyword => key.toLowerCase().includes(keyword));
            })
          )
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
            anonymousIds: anonymousId ? [anonymousId] : [], // Store as array for backward compatibility
            email: email || null,
            identifierValues: {}, // New structure to store all unique values per identifier type
            traits: allTraits || {}, // Only actual traits, not track properties
            properties: parsed.properties || {}, // Track properties stored separately
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
        
        // Collect all unique identifier values for this user (not properties)
        Object.entries(identifierFields).forEach(([fieldName, fieldValue]) => {
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
          // Initialize anonymousIds array if it doesn't exist (for backward compatibility)
          if (!user.anonymousIds) {
            user.anonymousIds = [];
          }
          user.anonymousIds.push(anonymousId);
        }
        if (email && !user.email) {
          user.email = email;
        }
        
        // Only merge actual traits (from traits object or context.traits), not track event properties
        if (allTraits && Object.keys(allTraits).length > 0) {
          user.traits = { ...user.traits, ...allTraits };
        }
        
        // Store properties separately (don't mix with traits)
        if (parsed.properties) {
          if (!user.properties) {
            user.properties = {};
          }
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

  // Persist uniqueUsers to localStorage when they change
  useEffect(() => {
    if (uniqueUsers && uniqueUsers.length > 0) {
      try {
        const eventsString = JSON.stringify(events);
        const dataToStore = {
          uniqueUsers: uniqueUsers,
          eventsHash: btoa(eventsString),
          timestamp: Date.now()
        };
        localStorage.setItem('uniqueUsers_data', JSON.stringify(dataToStore));
        console.log('Persisted unique users data to localStorage:', uniqueUsers.length);
      } catch (error) {
        console.error('Error saving unique users to localStorage:', error);
      }
    } else {
      // Clear localStorage if no users
      localStorage.removeItem('uniqueUsers_data');
    }
  }, [uniqueUsers, events]);
  
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
        <div className="unique-users-list__title-row">
          <h3 className="unique-users-list__title">
            <img src="/assets/user.svg" alt="Users" className="unique-users-list__header-icon" />
            Unique Users ({uniqueUsers.length})
          </h3>
          <p className="unique-users-list__subtitle">
            Users identified from saved events
          </p>
        </div>
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
