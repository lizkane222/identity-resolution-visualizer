import React, { useState } from 'react';
import './DiagramNode2.css';

const DiagramNode2 = ({ 
  event, 
  sequenceNumber, 
  isLast, 
  identifierOptions, 
  position, 
  totalEvents, 
  simulation,
  hoveredProfileId,
  onEventHover,
  onEventHoverLeave,
  onPayloadExpand,
  onPayloadCollapse
}) => {
  const [expanded, setExpanded] = useState(false);

  const handleExpandToggle = () => {
    const newExpanded = !expanded;
    setExpanded(newExpanded);
    
    if (newExpanded && onPayloadExpand) {
      onPayloadExpand();
    } else if (!newExpanded && onPayloadCollapse) {
      onPayloadCollapse();
    }
  };

  const getActionIcon = (actionType) => {
    switch (actionType) {
      case 'create':
      case 'create_new':
        return <img src="/assets/User-plus.svg" alt="Create" className="diagram-node2__action-icon-svg" />;
      case 'add':
      case 'add_to_existing':
      case 'add_event_to_existing':
      case 'add_identifier_to_existing':
        return <img src="/assets/User-Checkmark.svg" alt="Add to Profile" className="diagram-node2__action-icon-svg" />;
      case 'merge':
      case 'merge_profiles':
        return <img src="/assets/Unified-profiles.svg" alt="Merge" className="diagram-node2__action-icon-svg" />;
      case 'dual_action':
        return <img src="/assets/User-Checkmark.svg" alt="Add to Profile" className="diagram-node2__action-icon-svg" />;
      default:
        return '❓';
    }
  };

  const getActionColor = (actionType) => {
    switch (actionType) {
      case 'create':
      case 'create_new':
        return '#e1f5fe';
      case 'add':
      case 'add_to_existing':
      case 'add_event_to_existing':
      case 'add_identifier_to_existing':
        return '#f3e5f5';
      case 'merge':
      case 'merge_profiles':
        return '#e8f5e8';
      case 'dual_action':
        return '#f3e5f5'; // Same as add actions
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

  // Get identifier details with priority info
  const getIdentifierDetails = () => {
    const details = [];
    Object.entries(event.identifiers).forEach(([key, value]) => {
      const optionConfig = identifierOptions.find(opt => opt.value === key);
      const priority = optionConfig ? identifierOptions.indexOf(optionConfig) + 1 : 999;
      const isDropped = event.simulationResult.dropped.includes(key);
      
      details.push({
        key,
        value,
        label: optionConfig?.label || key,
        priority,
        limit: optionConfig?.limit || 5,
        isDropped,
        isCustom: optionConfig?.isCustom || false
      });
    });
    return details.sort((a, b) => a.priority - b.priority);
  };

  const identifierDetails = getIdentifierDetails();

  // Check if this node should be highlighted based on profile hover
  const isProfileHighlighted = hoveredProfileId && 
    event.simulationResult && 
    event.simulationResult.profile && 
    event.simulationResult.profile.id === hoveredProfileId;

  return (
    <div className="diagram-node2">
      {/* Above Timeline: Event Input Data */}
      <div className="diagram-node2__above">
        {/* Event Payload (Expandable - appears above event card) */}
        <div className="diagram-node2__payload-container">
          {expanded && (
            <div className="diagram-node2__payload-card">
              <h5>Event Payload</h5>
              <pre className="diagram-node2__json-display">
                {JSON.stringify(event.eventData, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Event Details */}
        <div className="diagram-node2__event-card" onClick={handleExpandToggle}>
          <div className="diagram-node2__event-header">
            <span className="diagram-node2__event-type">{eventType}</span>
            <span className="diagram-node2__event-time">{formatTimestamp(event.timestamp)}</span>
          </div>
          <div className="diagram-node2__event-identifiers">
            <h5>Event Identifiers</h5>
            <div className="diagram-node2__identifier-chips">
              {identifierDetails.length === 0 ? (
                <span className="diagram-node2__no-identifiers">No identifiers</span>
              ) : (
                identifierDetails.map(({ key, value, label, priority, isDropped }) => (
                  <div 
                    key={key} 
                    className={`diagram-node2__identifier-chip ${isDropped ? 'diagram-node2__identifier-chip--dropped' : ''}`}
                  >
                    <span className="diagram-node2__identifier-priority">P{priority}</span>
                    <span className="diagram-node2__identifier-label">{label}</span>
                    <span className="diagram-node2__identifier-value">{value}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Connection Line to Timeline */}
        <div className="diagram-node2__connection-line diagram-node2__connection-line--above"></div>
      </div>

      {/* On Timeline: Event Node Circle */}
      <div className="diagram-node2__timeline-node">
        <div 
          className={`diagram-node2__node-circle ${isProfileHighlighted ? 'diagram-node2__node-circle--highlighted' : ''}`} 
          onClick={handleExpandToggle}
          onMouseEnter={() => {
            if (onEventHover && event.simulationResult?.profile?.id) {
              onEventHover(event.simulationResult.profile.id);
            }
          }}
          onMouseLeave={() => {
            if (onEventHoverLeave) {
              onEventHoverLeave();
            }
          }}
        >
          <span className="diagram-node2__sequence">{sequenceNumber}</span>
        </div>
        {/* <div className="diagram-node2__node-label">
          Event #{sequenceNumber}
        </div> */}
      </div>

      {/* Below Timeline: Resolution Results */}
      <div className="diagram-node2__below">
        {/* Connection Line from Timeline */}
        <div className="diagram-node2__connection-line diagram-node2__connection-line--below"></div>

        {/* Action Result */}
        {event.simulationResult.action === 'dual_action' ? (
          // Handle dual actions
          <div className="diagram-node2__dual-actions">
            <div 
              className="diagram-node2__action-card"
              style={{ backgroundColor: getActionColor('add_identifier_to_existing') }}
            >
              <div className="diagram-node2__action-header">
                <span className="diagram-node2__action-icon">{getActionIcon('add_identifier_to_existing')}</span>
                <span className="diagram-node2__action-title">Add Identifier to Existing Profile</span>
              </div>
              <div className="diagram-node2__action-description">
                {event.simulationResult.primaryAction?.description || 'New identifier added to existing profile'}
              </div>
            </div>
            <div 
              className="diagram-node2__action-card"
              style={{ backgroundColor: getActionColor('add_event_to_existing'), marginTop: '8px' }}
            >
              <div className="diagram-node2__action-header">
                <span className="diagram-node2__action-icon">{getActionIcon('add_event_to_existing')}</span>
                <span className="diagram-node2__action-title">Add Event to Existing Profile</span>
              </div>
              <div className="diagram-node2__action-description">
                {event.simulationResult.secondaryAction?.description || 'Event added to existing profile'}
              </div>
            </div>
          </div>
        ) : (
          // Handle single actions
          <div 
            className="diagram-node2__action-card"
            style={{ backgroundColor: getActionColor(event.simulationResult.action) }}
          >
            <div className="diagram-node2__action-header">
              <span className="diagram-node2__action-icon">{getActionIcon(event.simulationResult.action)}</span>
              <span className="diagram-node2__action-title">
                {(event.simulationResult.action === 'create' || event.simulationResult.action === 'create_new') && 'Create New Profile'}
                {(event.simulationResult.action === 'add' || event.simulationResult.action === 'add_to_existing' || event.simulationResult.action === 'add_event_to_existing') && 'Add Event to Existing Profile'}
                {event.simulationResult.action === 'add_identifier_to_existing' && 'Add Identifier to Existing Profile'}
                {(event.simulationResult.action === 'merge' || event.simulationResult.action === 'merge_profiles') && 'Merge Profiles'}
              </span>
            </div>
            <div className="diagram-node2__action-description">
              Result: {event.simulationResult.profile.segmentId || 
                       event.simulationResult.profile.id.replace(/^profile_/, 'Profile ')}
            </div>
            {event.simulationResult.dropped.length > 0 && (
              <div className="diagram-node2__action-dropped">
                <strong>Dropped:</strong> {event.simulationResult.dropped.join(', ')}
              </div>
            )}
          </div>
        )}

        {/* Dropped Identifiers Section */}
        {event.simulationResult.dropped.length > 0 && (
          <div className="diagram-node2__dropped-card">
            <h5>
              <img src="/assets/User-warning.svg" alt="Warning" className="diagram-node2__header-icon" />
              Dropped Identifiers
            </h5>
            <div className="diagram-node2__dropped-items">
              {event.simulationResult.dropped.map((droppedKey) => {
                const identifierDetail = identifierDetails.find(id => id.key === droppedKey);
                return (
                  <div key={droppedKey} className="diagram-node2__dropped-item">
                    <span className="diagram-node2__dropped-name">
                      {identifierDetail?.label || droppedKey}
                    </span>
                    <span className="diagram-node2__dropped-reason">
                      Priority {identifierDetail?.priority || 'Unknown'} - Dropped due to conflict
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Processing Logs */}
        <div className="diagram-node2__logic-card">
          <h5>Processing Logs</h5>
          <div className="diagram-node2__logic-steps">
            {event.simulationResult.logs.map((log, index) => (
              <div key={index} className="diagram-node2__logic-step">
                <span className="diagram-node2__step-number">{index + 1}</span>
                <span className="diagram-node2__step-text">{log}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Profile Target - Show which profile this event affects */}
        <div className="diagram-node2__profile-target-card">
          <h5>Profile Target</h5>
          <div className="diagram-node2__profile-target">
            <span className="diagram-node2__target-arrow">→</span>
            <span className="diagram-node2__target-profile">
              {event.simulationResult.profile.segmentId || 
               event.simulationResult.profile.id.replace(/^profile_/, 'Profile ')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiagramNode2;
