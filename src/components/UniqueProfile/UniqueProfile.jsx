import React, { useState } from 'react';
import './UniqueProfile.css';

const UniqueProfile = ({ profile, onHighlightEvents }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleHighlight = () => {
    if (onHighlightEvents && profile.eventIndices) {
      onHighlightEvents(profile.eventIndices);
    }
  };

  const handleCardClick = () => {
    setIsExpanded(!isExpanded);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString();
  };

  return (
    <div 
      className={`unique-profile ${isExpanded ? 'unique-profile--expanded' : ''}`}
      onMouseEnter={handleHighlight}
      onMouseLeave={() => onHighlightEvents && onHighlightEvents([])}
      onClick={handleCardClick}
    >
      <div className="unique-profile__header">
        <h4 className="unique-profile__title">
          Profile {profile.userId ? `(${profile.userId})` : `#${profile.id}`}
        </h4>
        <div className="unique-profile__metadata">
          {profile.endpoints && (
            <span className="unique-profile__endpoints">
              Endpoints: {profile.endpoints.join(', ')}
            </span>
          )}
          {profile.eventCount > 0 && (
            <span className="unique-profile__event-count">
              {profile.eventCount} event{profile.eventCount !== 1 ? 's' : ''}
            </span>
          )}
          <span className="unique-profile__expand-indicator">
            {isExpanded ? '−' : '+'}
          </span>
        </div>
      </div>

      {/* External IDs Section */}
      {profile.externalIds && profile.externalIds.length > 0 && (
        <div className="unique-profile__section">
          <h5 className="unique-profile__section-title">External IDs</h5>
          <div className="unique-profile__identifiers">
            {profile.externalIds.map((identifier, index) => (
              <div key={index} className={`unique-profile__identifier ${isExpanded ? 'unique-profile__identifier--expanded' : ''}`}>
                {isExpanded ? (
                  // Expanded view: type, value, source, and date all on same line
                  <>
                    <span className="unique-profile__identifier-type">{identifier.type}:</span>
                    <span className="unique-profile__identifier-value">{identifier.id}</span>
                    {identifier.source_id && (
                      <span className="unique-profile__identifier-source">
                        Source: {identifier.source_id.substring(0, 8)}...
                      </span>
                    )}
                    {identifier.created_at && (
                      <span className="unique-profile__identifier-date">
                        {formatDate(identifier.created_at)}
                      </span>
                    )}
                  </>
                ) : (
                  // Collapsed view: only type and value (wrapped)
                  <>
                    <span className="unique-profile__identifier-type">{identifier.type}:</span>
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
            {profile.events.slice(0, 3).map((event, index) => (
              <div key={index} className="unique-profile__event">
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
              </div>
            ))}
            {profile.events.length > 3 && (
              <div className="unique-profile__event unique-profile__event--more">
                +{profile.events.length - 3} more events
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
