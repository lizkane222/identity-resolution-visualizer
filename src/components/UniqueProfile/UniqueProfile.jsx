import React, { useState } from 'react';
import { getConfiguredIdentifiers, getIdentifierDisplayName } from '../../utils/idResolutionConfig';
import './UniqueProfile.css';

const UniqueProfile = ({ profile, onHighlightEvents, onAddEventToList }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [expandedEvents, setExpandedEvents] = useState(new Set());

  // Debug logging for profile data
  console.group(`🎭 [UNIQUE PROFILE] Rendering profile: ${profile.id}`);
  console.log(`📋 Profile data:`, profile);
  console.log(`🏷️ Traits data:`, profile.traits);
  console.log(`📊 Traits count:`, profile.traits ? Object.keys(profile.traits).length : 0);
  console.log(`📡 Available endpoints:`, profile.endpoints);
  console.groupEnd();

  // Get display name prioritizing firstName and lastName when available from traits endpoint
  const getDisplayName = () => {
    const firstName = profile.traits?.firstName;
    const lastName = profile.traits?.lastName;
    
    // If we have both firstName and lastName from traits, combine them
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    }
    
    // If we have only one name field from traits, use it
    if (firstName) return firstName;
    if (lastName) return lastName;
    
    // Fall back to existing logic
    return profile.traits?.name || 
           profile.traits?.email || 
           profile.userId || 
           (profile.externalIds?.length > 0 ? profile.externalIds[0].id : '') || 
           `Profile ${profile.id}`;
  };
  
  const displayName = getDisplayName();
  
  const avatarChar = displayName ? displayName.charAt(0).toUpperCase() : 'P';

  // Sort identifiers based on ID Resolution Config order
  const getOrderedExternalIds = () => {
    if (!profile.externalIds || profile.externalIds.length === 0) return [];
    
    const configuredIds = getConfiguredIdentifiers();
    
    // Create ordered array of external IDs
    const orderedIds = [];
    
    // Add identifiers in config order
    configuredIds.forEach(config => {
      const matchingIds = profile.externalIds.filter(extId => {
        // Match by various possible naming conventions
        return extId.type === config.id ||
               extId.type === config.id.replace('_', '') ||
               (config.id === 'user_id' && extId.type === 'userId') ||
               (config.id === 'anonymous_id' && extId.type === 'anonymousId') ||
               (config.id === 'ga_client_id' && extId.type === 'gaClientId');
      });
      orderedIds.push(...matchingIds);
    });
    
    // Add any remaining identifiers not in config
    profile.externalIds.forEach(extId => {
      if (!orderedIds.some(orderedId => orderedId.type === extId.type && orderedId.id === extId.id)) {
        orderedIds.push(extId);
      }
    });
    
    return orderedIds;
  };

  const handleHighlight = () => {
    if (onHighlightEvents && profile.eventIndices) {
      onHighlightEvents(profile.eventIndices);
    }
  };

  const handleCardClick = () => {
    setIsExpanded(!isExpanded);
  };

  const handleEventClick = (e, eventIndex) => {
    e.stopPropagation(); // Prevent card expansion when clicking event
    const newExpandedEvents = new Set(expandedEvents);
    if (expandedEvents.has(eventIndex)) {
      newExpandedEvents.delete(eventIndex);
    } else {
      newExpandedEvents.add(eventIndex);
    }
    setExpandedEvents(newExpandedEvents);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString();
  };

    // Convert profile event to EventList format
  const convertProfileEventToEventData = (event, segmentId) => {
    // Extract identifiers from the event's external_ids
    const identifiers = {};
    
    // Extract userId from external_ids if available
    if (event.external_ids && Array.isArray(event.external_ids)) {
      event.external_ids.forEach(extId => {
        if (extId.type === 'user_id') {
          identifiers.userId = extId.id;
        } else if (extId.type === 'anonymous_id') {
          identifiers.anonymousId = extId.id;
        } else if (extId.type === 'email') {
          identifiers.email = extId.id;
        }
        // Store all identifiers for reference
        identifiers[extId.type] = extId.id;
      });
    }
    
    // Extract segment_id from event's related.users field if available
    const eventSegmentId = event.related && event.related.users && event.related.users[0];
    const finalSegmentId = eventSegmentId || segmentId;
    
    // Create the event payload in Segment format
    const eventPayload = {
      type: event.type || 'track',
      event: event.event || event.type || 'Profile Event',
      userId: identifiers.userId || event.userId || event.user_id || undefined,
      anonymousId: identifiers.anonymousId || event.anonymousId || event.anonymous_id || undefined,
      timestamp: event.timestamp || new Date().toISOString(),
      properties: {
        ...(event.properties || {}),
        // Include external_ids in properties for reference
        ...(event.external_ids && { external_ids: event.external_ids })
      },
      traits: event.traits || undefined,
      context: {
        ...(event.context || {}),
        source: {
          id: event.source_id || 'profile-api',
          name: 'Profile API'
        },
        // Add segment_id from the related.users field
        ...(finalSegmentId && { segment_id: finalSegmentId }),
        // Include all identifiers for identity resolution
        identifiers: identifiers
      },
      messageId: event.message_id || event.messageId || `profile-event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      // Include original external_ids and related data for identity resolution
      external_ids: event.external_ids || [],
      related: event.related || {}
    };

    // Remove undefined fields
    Object.keys(eventPayload).forEach(key => {
      if (eventPayload[key] === undefined) {
        delete eventPayload[key];
      }
    });

    return {
      id: `profile-event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      rawData: JSON.stringify(eventPayload, null, 2),
      writeKey: '', // Will need to be set by user
      sourceType: 'profile-api',
      sourceName: 'Profile API Event',
      timestamp: event.timestamp || new Date().toISOString(),
      // Include segment_id at the top level for identity resolution
      segment_id: finalSegmentId,
      external_ids: event.external_ids || [],
      related: event.related || {}
    };
  };

  // Handle adding event to EventList
  const handleAddEvent = (event, index) => {
    if (!onAddEventToList) return;
    
    // Extract segment_id from the event's related.users field first, fallback to profile data
    const eventSegmentId = event.related && event.related.users && event.related.users[0];
    const profileSegmentId = profile.segmentId || 
                            (profile.related && profile.related.users && profile.related.users[0]);
    
    const segmentId = eventSegmentId || profileSegmentId || null;
    
    const eventData = convertProfileEventToEventData(event, segmentId);
    onAddEventToList(eventData);
  };

  return (
    <div 
      className={`unique-profile ${isExpanded ? 'unique-profile--expanded' : ''}`}
      onMouseEnter={handleHighlight}
      onMouseLeave={() => onHighlightEvents && onHighlightEvents([])}
      onClick={handleCardClick}
    >
      <div className="unique-profile__header">
        <div className="unique-profile__avatar">
          {avatarChar}
        </div>
        <div className="unique-profile__info">
          <div className="unique-profile__name" title={displayName}>
            {displayName}
          </div>
          <div className="unique-profile__id" title={profile.segmentId || profile.userId || profile.id}>
            {profile.segmentId || profile.userId || `Profile #${profile.id}`}
          </div>
        </div>
        <div className="unique-profile__expand-icon">
          <svg 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            className={`unique-profile__expand-chevron ${isExpanded ? 'unique-profile__expand-chevron--rotated' : ''}`}
          >
            <path 
              d="M9 18L15 12L9 6" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      <div className="unique-profile__stats">
        <div className="unique-profile__stat">
          <span className="unique-profile__stat-value">{profile.eventCount || 0}</span>
          <span className="unique-profile__stat-label">Events</span>
        </div>
      </div>

      {/* Endpoints info */}
      {profile.endpoints && profile.endpoints.length > 0 && (
        <div className="unique-profile__endpoints-info">
          <span className="unique-profile__endpoints">
            Endpoints: {profile.endpoints.join(', ')}
          </span>
        </div>
      )}

      {/* Identifiers Section */}
      {profile.externalIds && profile.externalIds.length > 0 && (
        <div className="unique-profile__section">
          <h5 className="unique-profile__section-title">Identifiers</h5>
          <div className="unique-profile__identifiers">
            {getOrderedExternalIds().map((identifier, index) => (
              <div key={`${identifier.type}-${index}`} className={`unique-profile__identifier ${isExpanded ? 'unique-profile__identifier--expanded' : ''}`}>
                {isExpanded ? (
                  // Expanded view: type and value on first line, source and date on second line
                  <>
                    <div className="unique-profile__identifier-main">
                      <span className="unique-profile__identifier-type">
                        {getIdentifierDisplayName(identifier.type) || identifier.type}:
                      </span>
                      <span className="unique-profile__identifier-value">{identifier.id}</span>
                    </div>
                    {(identifier.source_id || identifier.created_at) && (
                      <div className="unique-profile__identifier-metadata">
                        {identifier.source_id && (
                          <span className="unique-profile__identifier-source">
                            Source: {identifier.source_id}
                          </span>
                        )}
                        {identifier.created_at && (
                          <span className="unique-profile__identifier-date">
                            {formatDate(identifier.created_at)}
                          </span>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  // Collapsed view: only type and value (wrapped)
                  <>
                    <span className="unique-profile__identifier-type">
                      {getIdentifierDisplayName(identifier.type) || identifier.type}:
                    </span>
                    <span className="unique-profile__identifier-value unique-profile__identifier-value--wrapped">
                      {identifier.id}
                    </span>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Traits Section */}
      {profile.traits && Object.keys(profile.traits).length > 0 && (
        <div className="unique-profile__section">
          <h5 className="unique-profile__section-title">Traits</h5>
          <div className="unique-profile__traits">
            {Object.entries(profile.traits).map(([key, value]) => (
              <div key={key} className="unique-profile__trait">
                <span className="unique-profile__trait-key">{key}:</span>
                <span className="unique-profile__trait-value">
                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Events Section */}
      {profile.events && profile.events.length > 0 && (
        <div className="unique-profile__section">
          <h5 className="unique-profile__section-title">
            Recent Events ({profile.events.length})
          </h5>
          <div className="unique-profile__events">
            {profile.events.slice(0, 5).map((event, index) => {
              const isEventExpanded = expandedEvents.has(index);
              return (
                <div key={index} className="unique-profile__event-container">
                  <div 
                    className={`unique-profile__event ${isEventExpanded ? 'unique-profile__event--expanded' : ''}`}
                    onClick={(e) => handleEventClick(e, index)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="unique-profile__event-content">
                      <span className="unique-profile__event-type">
                        {event.event || event.type || 'Event'}
                      </span>
                      {event.timestamp && (
                        <span className="unique-profile__event-time">
                          {formatTime(event.timestamp)}
                        </span>
                      )}
                      {event.properties && Object.keys(event.properties).length > 0 && (
                        <span className="unique-profile__event-props">
                          {Object.keys(event.properties).length} properties
                        </span>
                      )}
                      <span className="unique-profile__event-expand">
                        {isEventExpanded ? '▼' : '▶'}
                      </span>
                    </div>
                    {onAddEventToList && (
                      <button
                        className="unique-profile__add-event-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddEvent(event, index);
                        }}
                        title="Add this event to the Event List for visualization"
                      >
                        +
                      </button>
                    )}
                  </div>
                  
                  {isEventExpanded && (
                    <div className="unique-profile__event-details">
                      {/* Source ID */}
                      {event.source_id && (
                        <div className="unique-profile__event-detail">
                          <span className="unique-profile__event-detail-key">Source ID:</span>
                          <span className="unique-profile__event-detail-value">{event.source_id}</span>
                        </div>
                      )}
                      
                      {/* Message ID */}
                      {event.message_id && (
                        <div className="unique-profile__event-detail">
                          <span className="unique-profile__event-detail-key">Message ID:</span>
                          <span className="unique-profile__event-detail-value">{event.message_id}</span>
                        </div>
                      )}
                      
                      {/* Properties */}
                      {event.properties && Object.keys(event.properties).length > 0 && (
                        <div className="unique-profile__event-detail">
                          <span className="unique-profile__event-detail-key">Properties:</span>
                          <div className="unique-profile__event-properties">
                            {Object.entries(event.properties).map(([propKey, propValue]) => (
                              <div key={propKey} className="unique-profile__event-property">
                                <span className="unique-profile__event-property-key">{propKey}:</span>
                                <span className="unique-profile__event-property-value">
                                  {typeof propValue === 'object' ? JSON.stringify(propValue) : String(propValue)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {profile.events.length > 5 && (
              <div className="unique-profile__event unique-profile__event--more">
                +{profile.events.length - 5} more events
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer with summary info */}
      <div className="unique-profile__footer">
        {profile.firstSeen && (
          <span className="unique-profile__first-seen">
            First seen: {formatDate(profile.firstSeen)}
          </span>
        )}
        {profile.lastSeen && (
          <span className="unique-profile__last-seen">
            Last seen: {formatDate(profile.lastSeen)}
          </span>
        )}
      </div>
    </div>
  );
};

export default UniqueProfile;
