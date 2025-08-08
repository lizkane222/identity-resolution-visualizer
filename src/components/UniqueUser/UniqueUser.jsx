import React, { useState } from 'react';
import './UniqueUser.css';

const UniqueUser = ({ user, eventCount, eventIndices = [], isActive, onHighlightEvents }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { userId, anonymousIds = [], email, traits = {} } = user;
  
  // For backward compatibility, handle both old anonymousId and new anonymousIds array
  const allAnonymousIds = anonymousIds.length > 0 ? anonymousIds : (user.anonymousId ? [user.anonymousId] : []);
  
  // Display name priority: traits.name > email > userId > first anonymousId
  const displayName = traits.name || email || userId || allAnonymousIds[0] || 'Unknown User';
  
  // Get primary identifier
  const primaryId = userId || allAnonymousIds[0] || 'No ID';
  
  // Handle mouse events for highlighting
  const handleMouseEnter = () => {
    if (onHighlightEvents && eventIndices.length > 0) {
      onHighlightEvents(eventIndices);
    }
  };
  
  const handleMouseLeave = () => {
    if (onHighlightEvents) {
      onHighlightEvents([]);
    }
  };
  
  // Handle click to toggle expand/collapse
  const handleCardClick = (e) => {
    e.preventDefault();
    setIsExpanded(!isExpanded);
  };
  
  // Get all identifiers for this user
  const identifiers = [];
  if (userId) identifiers.push({ type: 'userId', value: userId });
  if (allAnonymousIds.length > 0) {
    allAnonymousIds.forEach((anonymousId, index) => {
      identifiers.push({ 
        type: allAnonymousIds.length > 1 ? `anonymousId_${index + 1}` : 'anonymousId', 
        value: anonymousId 
      });
    });
  }
  if (email) identifiers.push({ type: 'email', value: email });
  
  return (
    <div 
      className={`unique-user ${isActive ? 'unique-user--active' : ''} ${isExpanded ? 'unique-user--expanded' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleCardClick}
    >
      <div className="unique-user__header">
        <div className="unique-user__avatar">
          {displayName.charAt(0).toUpperCase()}
        </div>
        <div className="unique-user__info">
          <div className="unique-user__name" title={displayName}>
            {displayName}
          </div>
          <div className="unique-user__id" title={primaryId}>
            {primaryId}
          </div>
        </div>
        
        <div className="unique-user__expand-icon">
          <svg 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            className={`unique-user__expand-chevron ${isExpanded ? 'unique-user__expand-chevron--rotated' : ''}`}
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
      
      <div className="unique-user__stats">
        <div className="unique-user__stat">
          <span className="unique-user__stat-value">{eventCount}</span>
          <span className="unique-user__stat-label">Events</span>
        </div>
      </div>
      
      {/* Show all identifiers */}
      {identifiers.length > 1 && (
        <div className="unique-user__identifiers">
          <div className="unique-user__identifiers-label">Identifiers:</div>
          {identifiers.map(({ type, value }) => (
            <div key={type} className="unique-user__identifier">
              <span className="unique-user__identifier-type">{type}:</span>
              <span className="unique-user__identifier-value" title={String(value)}>
                {String(value)}
              </span>
            </div>
          ))}
        </div>
      )}
      
      {email && identifiers.length === 1 && (
        <div className="unique-user__email" title={email}>
          {email}
        </div>
      )}
      
      {Object.keys(traits).length > 0 && (
        <div className="unique-user__traits">
          {Object.entries(traits)
            .filter(([key]) => key !== 'name') // Don't show name again
            .slice(0, 2) // Show max 2 additional traits
            .map(([key, value]) => (
              <div key={key} className="unique-user__trait">
                <span className="unique-user__trait-key">{key}:</span>
                <span className="unique-user__trait-value" title={String(value)}>
                  {String(value)}
                </span>
              </div>
            ))
          }
        </div>
      )}
    </div>
  );
};

export default UniqueUser;
