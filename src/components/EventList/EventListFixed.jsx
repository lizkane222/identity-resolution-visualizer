import React, { useState, useRef, useEffect } from 'react';
import { simulateEvents } from '../../utils/eventSimulator';
import { sendAppEventsToSegment, getStoredWriteKey } from '../../utils/segmentAPI';
import { getSourceIcon } from '../../utils/sourceIcons';
import './EventList.css';

const EventList = ({ events, onRemoveEvent, onClearEvents, onEditEvent, highlightedEventIndices = [] }) => {
  // Editing state
  const [editingEventId, setEditingEventId] = useState(null);
  const [editingValue, setEditingValue] = useState('');
  // Event ordering state
  const [orderBy, setOrderBy] = useState('timestamp');
  const [customOrderField, setCustomOrderField] = useState('');
  const [orderEnabled, setOrderEnabled] = useState(false);

  // Sort events by selected field
  const sortedEvents = orderEnabled
    ? [...events].sort((a, b) => {
        try {
          const aObj = JSON.parse(a.rawData);
          const bObj = JSON.parse(b.rawData);
          if (orderBy === 'timestamp') {
            // Extract timestamp from rawData with fallbacks
            const getTimestamp = (obj) => obj.timestamp || obj.originalTimestamp || obj.receivedAt || obj.sentAt || new Date(0).toISOString();
            return new Date(getTimestamp(aObj)) - new Date(getTimestamp(bObj));
          } else if (orderBy === 'custom' && customOrderField) {
            if (aObj[customOrderField] === undefined) return 1;
            if (bObj[customOrderField] === undefined) return -1;
            if (aObj[customOrderField] < bObj[customOrderField]) return -1;
            if (aObj[customOrderField] > bObj[customOrderField]) return 1;
            return 0;
          }
          return 0;
        } catch {
          return 0;
        }
      })
    : events;

  const [isRunning, setIsRunning] = useState(false);
  const [timeoutMs, setTimeoutMs] = useState(1000);
  const [currentEventIndex, setCurrentEventIndex] = useState(-1);
  const [simulationLog, setSimulationLog] = useState([]);
  const [expandedEvents, setExpandedEvents] = useState(new Set());
  const [highlightedEvents, setHighlightedEvents] = useState(new Set());
  const [showEventTypesTooltip, setShowEventTypesTooltip] = useState(false);
  const [showDataPointsTooltip, setShowDataPointsTooltip] = useState(false);
  const [simulationLogExpanded, setSimulationLogExpanded] = useState(true);
  
  // Checkpoint state - only one checkpoint at a time
  const [checkpointIndex, setCheckpointIndex] = useState(-1); // -1 means start from beginning
  const [isDraggingCheckpoint, setIsDraggingCheckpoint] = useState(false);
  const [lastProcessedEventIndex, setLastProcessedEventIndex] = useState(-1);
  
  // Refs for scrolling functionality
  const eventsListRef = useRef(null);
  const activeEventRef = useRef(null);
  const checkpointRef = useRef(null);

  // Auto-scroll to active event during simulation
  useEffect(() => {
    if (isRunning && currentEventIndex >= 0 && activeEventRef.current && eventsListRef.current) {
      activeEventRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });
    }
  }, [currentEventIndex, isRunning]);

  // Auto-scroll when checkpoint moves to ensure checkpoint and next event are visible
  useEffect(() => {
    if (checkpointRef.current && eventsListRef.current) {
      checkpointRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });
    }
  }, [checkpointIndex]);

  // ... (keep all the existing handler functions like handleRun, handleTimeout, etc.)
  // For brevity, I'll include just the essential parts of the component structure

  // Handle running the event simulation
  const handleRun = async () => {
    if (events.length === 0) {
      alert('No events to simulate. Please add some events first.');
      return;
    }

    // Get events to process (only from checkpoint onwards)
    const eventsToProcess = sortedEvents.slice(checkpointIndex + 1);
    const startIndex = checkpointIndex + 1;
    
    if (eventsToProcess.length === 0) {
      alert('No events to process from checkpoint. All events before the checkpoint have already been processed.');
      return;
    }

    setIsRunning(true);
    setCurrentEventIndex(-1);
    
    // Don't clear the simulation log if we're continuing from a checkpoint
    if (checkpointIndex === -1) {
      setSimulationLog([]);
    }

    // ... (keep existing simulation logic)
    try {
      await simulateEvents(
        eventsToProcess,
        timeoutMs,
        // Progress callback - adjust index to match original event list
        (eventIndex, event, result) => {
          const actualIndex = startIndex + eventIndex;
          setCurrentEventIndex(actualIndex);
          setLastProcessedEventIndex(actualIndex);
          setSimulationLog(prev => [
            ...prev,
            {
              timestamp: new Date().toISOString(),
              eventIndex: actualIndex,
              event,
              result,
              status: 'success'
            }
          ]);
        },
        // Error callback
        (eventIndex, event, error) => {
          const actualIndex = startIndex + eventIndex;
          setSimulationLog(prev => [
            ...prev,
            {
              timestamp: new Date().toISOString(),
              eventIndex: actualIndex,
              event,
              error: error.message,
              status: 'error'
            }
          ]);
        }
      );
      
      // Update checkpoint to the last processed event
      setCheckpointIndex(lastProcessedEventIndex >= 0 ? lastProcessedEventIndex : checkpointIndex);
      
    } catch (error) {
      console.error('Simulation failed:', error);
    } finally {
      setIsRunning(false);
      setCurrentEventIndex(-1);
    }
  };

  // Handle timeout input change
  const handleTimeoutChange = (e) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 100) {
      setTimeoutMs(value);
    }
  };

  // Handle checkpoint drag
  const handleCheckpointDrag = (e) => {
    e.preventDefault();
    
    const eventsList = e.currentTarget.closest('.event-list__events');
    if (!eventsList) return;
    
    const events = eventsList.querySelectorAll('.event-list__event');
    const mouseY = e.clientY;
    
    let newCheckpointIndex = -1;
    
    for (let i = 0; i < events.length; i++) {
      const eventRect = events[i].getBoundingClientRect();
      const eventMiddle = eventRect.top + eventRect.height / 2;
      
      if (mouseY < eventMiddle) {
        newCheckpointIndex = i - 1;
        break;
      }
    }
    
    // If we didn't find a position, put checkpoint at the end
    if (newCheckpointIndex === -1) {
      newCheckpointIndex = events.length - 1;
    }
    
    setCheckpointIndex(Math.max(-1, newCheckpointIndex));
  };

  // Handle mouse events for checkpoint dragging
  const handleCheckpointMouseDown = (e) => {
    e.preventDefault();
    setIsDraggingCheckpoint(true);
    
    const handleMouseMove = (e) => {
      if (!isDraggingCheckpoint) return;
      handleCheckpointDrag(e);
    };
    
    const handleMouseUp = () => {
      setIsDraggingCheckpoint(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Toggle event card expansion
  const toggleEventExpansion = (eventId) => {
    setExpandedEvents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }
      return newSet;
    });
  };

  // Extract event type from event data
  const getEventType = (eventData) => {
    try {
      const parsed = JSON.parse(eventData);
      
      // Check for common event type fields
      if (parsed.type) return parsed.type;
      if (parsed.event) return parsed.event;
      if (parsed.action) return parsed.action;
      if (parsed.eventType) return parsed.eventType;
      
      // Infer from specific event structures
      if (parsed.userId || parsed.anonymousId) {
        if (parsed.traits) return 'identify';
        if (parsed.properties && parsed.properties.name) return 'track';
        if (parsed.properties && parsed.properties.url) return 'page';
      }
      
      return 'event';
    } catch {
      return 'event';
    }
  };

  // Format event data for display
  const formatEventForDisplay = (eventData) => {
    try {
      const parsed = JSON.parse(eventData);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return eventData;
    }
  };

  return (
    <div className="event-list event-list--sidebar">
      <div className="event-list__header">
        <h2 className="event-list__title">Events ({events.length})</h2>
        {events.length > 0 && (
          <button
            onClick={onClearEvents}
            disabled={isRunning}
            className="event-list__clear-button"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Events list - scrollable */}
      <div className="event-list__events event-list__events--scrollable" ref={eventsListRef}>
        {sortedEvents.length === 0 ? (
          <div className="event-list__empty-state">
            <p className="event-list__empty-message">No events added yet.</p>
            <p className="event-list__empty-subtitle">Use the Event Builder above to create and save events.</p>
          </div>
        ) : (
          <>
            {/* Render all events */}
            {sortedEvents.map((event, index) => {
              const isExpanded = expandedEvents.has(event.id);
              const isHighlighted = highlightedEvents.has(event.id);
              const isUserHighlighted = highlightedEventIndices.includes(index);
              const eventType = getEventType(event.rawData);
              const isBeforeCheckpoint = index <= checkpointIndex;
              
              // Parse rawData to extract event name
              let eventName = null;
              try {
                const parsedData = JSON.parse(event.rawData);
                eventName = parsedData.event || parsedData.properties?.name || null;
              } catch (e) {
                eventName = null;
              }

              return (
                <div
                  key={event.id}
                  ref={currentEventIndex === index ? activeEventRef : null}
                  className={`event-list__event ${
                    currentEventIndex === index ? 'event-list__event--active' : ''
                  } ${isExpanded ? 'event-list__event--expanded' : ''} ${
                    isHighlighted ? 'event-list__event--highlighted' : ''
                  } ${
                    isUserHighlighted ? 'event-list__event--user-highlighted' : ''
                  } ${
                    isBeforeCheckpoint ? 'event-list__event--processed' : ''
                  }`}
                >
                  <div 
                    className="event-list__event-header"
                    onClick={() => toggleEventExpansion(event.id)}
                  >
                    {/* First Line: Event # - type - "event name" and timestamp */}
                    <div className="event-list__event-line-one">
                      <div className="event-list__event-meta">
                        <span className="event-list__event-number">
                          Event #{index + 1} - {eventType}{eventType === 'track' && eventName ? ` - ${eventName}` : ''}
                        </span>
                        {eventName && eventType !== 'track' && (
                          <span className="event-list__event-name">
                            "{eventName}"
                          </span>
                        )}
                        {currentEventIndex === index && (
                          <span className="event-list__event-status">
                            Running...
                          </span>
                        )}
                      </div>
                      <div className="event-list__event-controls">
                        <span className="event-list__event-timestamp">
                          {(() => {
                            try {
                              const parsedData = JSON.parse(event.rawData);
                              const timestamp = parsedData.timestamp || parsedData.originalTimestamp || parsedData.receivedAt || event.timestamp;
                              return timestamp ? new Date(timestamp).toLocaleTimeString() : 'No timestamp';
                            } catch (e) {
                              return event.timestamp ? new Date(event.timestamp).toLocaleTimeString() : 'No timestamp';
                            }
                          })()}
                        </span>
                        <div className="event-list__event-toggle">
                          {isExpanded ? '▼' : '▶'}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveEvent(event.id);
                          }}
                          disabled={isRunning}
                          className="event-list__remove-button"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                    
                    {/* Second Line: Source flags */}
                    {(event.sources && event.sources.length > 0) || event.sourceName ? (
                      <div className="event-list__event-line-two">
                        <div className="event-list__event-sources">
                          {event.sources && event.sources.length > 0 ? (
                            event.sources.map((source, sourceIndex) => (
                              <span 
                                key={sourceIndex}
                                className="event-list__event-source" 
                                title={`WriteKey: ${source.settings?.writeKey || 'Not set'}`}
                              >
                                {getSourceIcon(source.type)} {source.name || source.type}
                              </span>
                            ))
                          ) : (
                            <span className="event-list__event-source" title={`WriteKey: ${event.writeKey || 'Not set'}`}>
                              {getSourceIcon(event.sourceType)} {event.sourceName || event.sourceType}
                            </span>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {isExpanded && (
                    <div className="event-list__event-content">
                      <pre
                        className="event-list__event-json"
                        contentEditable
                        suppressContentEditableWarning
                        spellCheck={false}
                        onFocus={e => {
                          setEditingEventId(event.id);
                          setEditingValue(formatEventForDisplay(event.rawData));
                        }}
                        onInput={e => {
                          if (editingEventId === event.id) {
                            setEditingValue(e.currentTarget.textContent);
                          }
                        }}
                        onBlur={e => {
                          if (editingEventId === event.id) {
                            try {
                              const parsed = JSON.parse(e.currentTarget.textContent);
                              if (typeof onEditEvent === 'function') {
                                onEditEvent(event.id, parsed);
                              }
                            } catch {
                              // Handle error silently or show warning
                            }
                            setEditingEventId(null);
                            setEditingValue('');
                          }
                        }}
                        style={{ 
                          outline: editingEventId === event.id ? '2px solid #2563eb' : 'none', 
                          minHeight: 120, 
                          cursor: 'text' 
                        }}
                      >
                        {editingEventId === event.id ? editingValue : formatEventForDisplay(event.rawData)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Single checkpoint - positioned after checkpoint index or at top */}
            {sortedEvents.length > 0 && (
              <div 
                ref={checkpointRef}
                className={`event-list__checkpoint ${
                  isDraggingCheckpoint ? 'event-list__checkpoint--dragging' : ''
                }`}
                onMouseDown={handleCheckpointMouseDown}
                title="Drag to move checkpoint. Only events below this line will be processed."
                style={{
                  cursor: isDraggingCheckpoint ? 'grabbing' : 'grab',
                  order: checkpointIndex + 2, // Position after the checkpoint event
                }}
              >
                <div className="event-list__checkpoint-line"></div>
                <div className="event-list__checkpoint-handle">
                  <span className="event-list__checkpoint-icon">⋮⋮</span>
                  <span className="event-list__checkpoint-text">
                    Checkpoint - Start simulation from here ({Math.max(0, sortedEvents.length - (checkpointIndex + 1))} events remaining)
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Simulation controls - sticky footer */}
      <div className="event-list__controls event-list__controls--footer">
        <div className="event-list__order-group">
          <label htmlFor="order-enabled-checkbox" className="event-list__order-label" style={{marginRight: 4}}>
            Order Events By:
          </label>
          <input
            type="checkbox"
            id="order-enabled-checkbox"
            checked={orderEnabled}
            onChange={e => setOrderEnabled(e.target.checked)}
            className="event-list__order-toggle"
            style={{marginRight: 8}}
          />
          <select
            id="order-by-select"
            value={orderBy}
            onChange={e => setOrderBy(e.target.value)}
            className="event-list__order-select"
            disabled={!orderEnabled}
          >
            <option value="timestamp">timestamp</option>
            <option value="custom">Custom Field</option>
          </select>
          {orderBy === 'custom' && (
            <input
              type="text"
              placeholder="Enter field name"
              value={customOrderField}
              onChange={e => setCustomOrderField(e.target.value)}
              className="event-list__order-input"
              disabled={!orderEnabled}
            />
          )}
        </div>
        <div className="event-list__timeout-group">
          <label htmlFor="timeout-input" className="event-list__timeout-label">
            Timeout (ms):
          </label>
          <input
            id="timeout-input"
            type="number"
            min="100"
            max="10000"
            step="100"
            value={timeoutMs}
            onChange={handleTimeoutChange}
            disabled={isRunning}
            className="event-list__timeout-input"
          />
        </div>

        <button
          onClick={handleRun}
          disabled={isRunning || events.length === 0 || checkpointIndex >= sortedEvents.length - 1}
          className="event-list__run-button"
        >
          {isRunning ? (
            <>
              <div className="event-list__spinner"></div>
              Running...
            </>
          ) : (
            <>
              Run Simulation
              {checkpointIndex >= 0 && checkpointIndex < sortedEvents.length - 1 && (
                <span className="event-list__run-count">
                  ({sortedEvents.length - (checkpointIndex + 1)} events)
                </span>
              )}
              {checkpointIndex === -1 && sortedEvents.length > 0 && (
                <span className="event-list__run-count">
                  ({sortedEvents.length} events)
                </span>
              )}
            </>
          )}
        </button>
      </div>

      {/* Simulation log (simplified for brevity) */}
      {simulationLog.length > 0 && (
        <div className="event-list__log-section">
          <h3 
            className="event-list__log-title event-list__log-title--clickable"
            onClick={() => setSimulationLogExpanded(!simulationLogExpanded)}
          >
            Simulation Log
            <span className={`event-list__log-toggle ${simulationLogExpanded ? 'event-list__log-toggle--expanded' : ''}`}>
              ▼
            </span>
          </h3>
          {simulationLogExpanded && (
            <div className="event-list__log-container">
              {simulationLog.map((logEntry, index) => (
                <div
                  key={index}
                  className={`event-list__log-entry ${
                    logEntry.status === 'error' 
                      ? 'event-list__log-entry--error' 
                      : logEntry.status === 'info'
                      ? 'event-list__log-entry--info'
                      : 'event-list__log-entry--success'
                  }`}
                >
                  <div className="event-list__log-header">
                    <span className="event-list__log-event-title">
                      {logEntry.eventIndex >= 0 ? `Event #${logEntry.eventIndex + 1}` : 'System'}
                    </span>
                    <span className="event-list__log-timestamp">
                      {new Date(logEntry.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  
                  {logEntry.status === 'success' ? (
                    <div className={`event-list__log-message event-list__log-message--success`}>
                      ✓ Event processed successfully
                      {logEntry.result && (
                        <div className="event-list__log-result">
                          Result: {JSON.stringify(logEntry.result)}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className={`event-list__log-message event-list__log-message--error`}>
                      ✗ {logEntry.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EventList;
