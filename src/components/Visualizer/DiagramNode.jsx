import React, { useState } from 'react';
import './DiagramNode_horizontal.css';

const DiagramNode = ({ event, sequenceNumber, isLast, identifierOptions, position, totalEvents }) => {
  const [expanded, setExpanded] = useState(false);

  const getActionIcon = (actionType) => {
    switch (actionType) {
      case 'create_new':
        return '🆕';
      case 'add_to_existing':
        return '➕';
      case 'merge_profiles':
        return '🔀';
      default:
        return '❓';
    }
  };

  const getActionColor = (actionType) => {
    switch (actionType) {
      case 'create_new':
        return '#e1f5fe';
      case 'add_to_existing':
        return '#f3e5f5';
      case 'merge_profiles':
        return '#e8f5e8';
      default:
        return '#f5f5f5';
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const eventType = event.eventData?.event || 
                   (event.eventData?.type === 'track' ? event.eventData?.event : event.eventData?.type) || 
                   'Unknown';

  return (
    <div className="diagram-node">
      {/* Above Timeline: Event Input Data */}
      <div className="diagram-node__above">
        {/* Event Payload (Expandable - appears above event card) */}
        <div className="diagram-node__payload-container">
          {expanded && (
            <div className="diagram-node__payload-card">
              <h5>Event Payload</h5>
              <pre className="diagram-node__json-display">
                {JSON.stringify(event.eventData, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Event Details */}
        <div className="diagram-node__event-card" onClick={() => setExpanded(!expanded)}>
          <div className="diagram-node__event-header">
            <span className="diagram-node__event-type">{eventType}</span>
            <span className="diagram-node__event-time">{formatTimestamp(event.timestamp)}</span>
          </div>
          <div className="diagram-node__event-identifiers">
            <h5>Event Identifiers</h5>
            <div className="diagram-node__identifier-chips">
              {Object.keys(event.identifiers).length === 0 ? (
                <span className="diagram-node__no-identifiers">No identifiers</span>
              ) : (
                Object.entries(event.identifiers).map(([key, identifier]) => {
                  const isDropped = event.action.droppedIdentifiers.includes(key);
                  const isConflicting = event.action.conflictingIdentifiers.includes(key);
                  
                  return (
                    <div 
                      key={key} 
                      className={`diagram-node__identifier-chip ${isDropped ? 'diagram-node__identifier-chip--dropped' : ''} ${isConflicting ? 'diagram-node__identifier-chip--conflict' : ''}`}
                    >
                      <span className="diagram-node__identifier-priority">P{identifier.priority}</span>
                      <span className="diagram-node__identifier-label">{identifier.label}</span>
                      <span className="diagram-node__identifier-value">{identifier.value}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Profile Lookup Results */}
        {event.action.profiles && event.action.profiles.length > 0 && (
          <div className="diagram-node__profiles-card">
            <h5>Matching Profiles Found</h5>
            <div className="diagram-node__profiles-list">
              {event.action.profiles.map((profile, index) => (
                <div key={profile.id || index} className="diagram-node__profile-item">
                  <span className="diagram-node__profile-id">Profile {profile.id}</span>
                  <span className="diagram-node__profile-meta">{profile.events?.length || 0} events</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Connection Line to Timeline */}
        <div className="diagram-node__connection-line diagram-node__connection-line--above"></div>
      </div>

      {/* On Timeline: Event Node Circle */}
      <div className="diagram-node__timeline-node">
        <div className="diagram-node__node-circle" onClick={() => setExpanded(!expanded)}>
          <span className="diagram-node__sequence">{sequenceNumber}</span>
        </div>
        <div className="diagram-node__node-label">
          Event #{sequenceNumber}
        </div>
      </div>

      {/* Below Timeline: Resolution Results */}
      <div className="diagram-node__below">
        {/* Connection Line from Timeline */}
        <div className="diagram-node__connection-line diagram-node__connection-line--below"></div>

        {/* Action Result */}
        <div 
          className="diagram-node__action-card"
          style={{ backgroundColor: getActionColor(event.action.type) }}
        >
          <div className="diagram-node__action-header">
            <span className="diagram-node__action-icon">{getActionIcon(event.action.type)}</span>
            <span className="diagram-node__action-title">
              {event.action.type === 'create_new' && 'Create New Profile'}
              {event.action.type === 'add_to_existing' && 'Add to Existing Profile'}
              {event.action.type === 'merge_profiles' && 'Merge Profiles'}
            </span>
          </div>
          <div className="diagram-node__action-description">
            {event.action.description}
          </div>
        </div>

        {/* Logic Explanation */}
        <div className="diagram-node__logic-card">
          <h5>Resolution Logic</h5>
          <div className="diagram-node__logic-steps">
            <div className="diagram-node__logic-step">
              <span className="diagram-node__step-number">1</span>
              <span className="diagram-node__step-text">Check existing profiles for matching identifiers</span>
            </div>
            <div className="diagram-node__logic-step">
              <span className="diagram-node__step-number">2</span>
              <span className="diagram-node__step-text">Evaluate identity resolution limits & conflicts</span>
            </div>
            {event.action.droppedIdentifiers.length > 0 && (
              <div className="diagram-node__logic-step diagram-node__logic-step--dropped">
                <span className="diagram-node__step-number">3</span>
                <span className="diagram-node__step-text">Drop {event.action.droppedIdentifiers.length} lowest priority identifier(s)</span>
              </div>
            )}
            <div className="diagram-node__logic-step diagram-node__logic-step--result">
              <span className="diagram-node__step-number">→</span>
              <span className="diagram-node__step-text">{event.action.reason}</span>
            </div>
          </div>
        </div>

        {/* Future: Next Steps Recommendations */}
        <div className="diagram-node__next-steps-card">
          <h5>Next Steps</h5>
          <p>Profile resolution recommendations will appear here in future updates.</p>
        </div>
      </div>
    </div>
  );
};

export default DiagramNode;
