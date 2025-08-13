import React, { useState } from 'react';
import { isIdentifierField, getIdentifierDisplayName, getConfiguredIdentifiers } from '../../utils/idResolutionConfig';
import './UniqueUser.css';

const UniqueUser = ({ user, eventCount, eventIndices = [], isActive, onHighlightEvents }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { userId, anonymousIds = [], email, traits = {} } = user;
  
  // For backward compatibility, handle both old anonymousId and new anonymousIds array
  const allAnonymousIds = anonymousIds.length > 0 ? anonymousIds : (user.anonymousId ? [user.anonymousId] : []);
  
  // Separate identifiers from traits based on ID Resolution Config
  const identifiers = {};
  const userTraits = {};
  
  // Add core identifiers if they exist
  if (userId) identifiers.userId = userId;
  if (allAnonymousIds.length > 0) {
    // Handle multiple anonymous IDs
    allAnonymousIds.forEach((id, index) => {
      const key = allAnonymousIds.length > 1 ? `anonymousId_${index + 1}` : 'anonymousId';
      identifiers[key] = id;
    });
  }
  if (email) {
    identifiers.email = email;
    // Email also appears in traits since it's both an identifier and a trait in Unify
    userTraits.email = email;
  }
  
  // Add other configured identifiers from traits
  Object.entries(traits).forEach(([key, value]) => {
    if (isIdentifierField(key)) {
      identifiers[key] = value;
      // Also add identifiers (except userId and anonymousId variants) to traits section
      // This reflects how Unify stores data where identifiers can also be traits
      if (!key.startsWith('userId') && !key.startsWith('anonymousId')) {
        userTraits[key] = value;
      }
    } else {
      userTraits[key] = value;
    }
  });
  
  // Sort identifiers based on ID Resolution Config order
  const getOrderedIdentifiers = () => {
    const configOrder = getConfiguredIdentifiers().map(config => {
      // Normalize the identifier names to match field names
      switch (config.id) {
        case 'user_id': return 'userId';
        case 'anonymous_id': return 'anonymousId';
        case 'ga_client_id': return 'gaClientId';
        default: return config.id;
      }
    });
    
    // Create ordered array of [key, value] pairs
    const orderedIdentifiers = [];
    
    // Add identifiers in config order
    configOrder.forEach(configKey => {
      if (identifiers[configKey] !== undefined) {
        orderedIdentifiers.push([configKey, identifiers[configKey]]);
      }
    });
    
    // Add any remaining identifiers not in config (like multiple anonymous IDs)
    Object.entries(identifiers).forEach(([key, value]) => {
      if (!orderedIdentifiers.some(([orderedKey]) => orderedKey === key)) {
        orderedIdentifiers.push([key, value]);
      }
    });
    
    return orderedIdentifiers;
  };
  
  // Display name priority: firstName + lastName > traits.name > email > userId > first anonymousId
  const getDisplayName = () => {
    const firstName = userTraits.firstName || traits.firstName;
    const lastName = userTraits.lastName || traits.lastName;
    
    // If we have both firstName and lastName, combine them
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    }
    
    // If we have only one name field, use it
    if (firstName) return firstName;
    if (lastName) return lastName;
    
    // Fall back to existing logic
    return userTraits.name || traits.name || email || userId || allAnonymousIds[0] || 'Unknown User';
  };
  
  const displayName = getDisplayName();
  
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
      
      {/* Show identifiers - always visible */}
      {Object.keys(identifiers).length > 0 && (
        <div className={`unique-user__identifiers ${!isExpanded ? 'unique-user__identifiers--collapsed' : ''}`}>
          {isExpanded && <div className="unique-user__section-title">Identifiers</div>}
          {getOrderedIdentifiers().map(([key, value]) => (
            <div key={key} className="unique-user__identifier">
              <span className="unique-user__identifier-type">
                {getIdentifierDisplayName(key)}:
              </span>
              <span className="unique-user__identifier-value" title={String(value)}>
                {String(value)}
              </span>
            </div>
          ))}
        </div>
      )}
      
      {/* Show traits - always visible */}
      {Object.keys(userTraits).length > 0 && (
        <div className={`unique-user__traits ${!isExpanded ? 'unique-user__traits--collapsed' : ''}`}>
          {isExpanded && <div className="unique-user__section-title">Traits</div>}
          {Object.entries(userTraits)
            .filter(([key]) => key !== 'name') // Don't show name again in traits
            .slice(0, isExpanded ? undefined : 3) // Show max 3 traits when collapsed, all when expanded
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
