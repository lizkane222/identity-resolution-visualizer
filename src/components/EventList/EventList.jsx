import React, { useState, useRef, useEffect } from 'react';
import { sendAppEventsToSegment } from '../../utils/segmentAPI';
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
  const [simulationLogExpanded, setSimulationLogExpanded] = useState(true);
  
  // Checkpoint state - only one checkpoint at a time
  const [checkpointIndex, setCheckpointIndex] = useState(-1); // -1 means start from beginning
  const [isDraggingCheckpoint, setIsDraggingCheckpoint] = useState(false);
  
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

    try {
      // Process events one by one, sending to actual sources
      for (let i = 0; i < eventsToProcess.length; i++) {
        const actualIndex = startIndex + i;
        const event = eventsToProcess[i];
        
        setCurrentEventIndex(actualIndex);
        
        try {
          // Determine how to send the event based on its source configuration
          let results = [];
          
          if (event.sources && event.sources.length > 0) {
            // Multi-source event: send to each configured source
            for (const source of event.sources) {
              if (source.settings && source.settings.writeKey) {
                try {
                  const result = await sendAppEventsToSegment([event], source.settings.writeKey, false);
                  results.push({
                    source: source.name || source.type,
                    writeKey: source.settings.writeKey,
                    success: true,
                    result: result[0]
                  });
                } catch (error) {
                  results.push({
                    source: source.name || source.type,
                    writeKey: source.settings.writeKey,
                    success: false,
                    error: error.message
                  });
                }
              }
            }
          } else if (event.writeKey) {
            // Single-source event (legacy format)
            try {
              const result = await sendAppEventsToSegment([event], event.writeKey, false);
              results.push({
                source: event.sourceName || event.sourceType || 'Unknown',
                writeKey: event.writeKey,
                success: true,
                result: result[0]
              });
            } catch (error) {
              results.push({
                source: event.sourceName || event.sourceType || 'Unknown',
                writeKey: event.writeKey,
                success: false,
                error: error.message
              });
            }
          } else {
            // No source configuration - log as warning
            results.push({
              source: 'No Source Configured',
              writeKey: null,
              success: false,
              error: 'Event has no source configuration or writeKey'
            });
          }
          
          // Log success for this event
          setSimulationLog(prev => [
            ...prev,
            {
              timestamp: new Date().toISOString(),
              eventIndex: actualIndex,
              event,
              result: results,
              status: results.every(r => r.success) ? 'success' : (results.some(r => r.success) ? 'partial' : 'error')
            }
          ]);
          
          // Wait before processing next event (except for the last one)
          if (i < eventsToProcess.length - 1) {
            await sleep(timeoutMs);
          }
          
        } catch (error) {
          // Log error for this event
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
      }
      
      // Update checkpoint to the last processed event after simulation completes
      if (eventsToProcess.length > 0) {
        const finalProcessedIndex = startIndex + eventsToProcess.length - 1;
        setCheckpointIndex(finalProcessedIndex);
      }
      
    } catch (error) {
      console.error('Simulation failed:', error);
    } finally {
      setIsRunning(false);
      setCurrentEventIndex(-1);
    }
  };

  // Utility function to create a delay
  const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
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
    
    const eventsList = document.querySelector('.event-list__events--scrollable');
    if (!eventsList) return;
    
    const eventElements = eventsList.querySelectorAll('.event-list__event');
    const mouseY = e.clientY;
    
    let newCheckpointIndex = -1;
    
    // Check position relative to each event
    for (let i = 0; i < eventElements.length; i++) {
      const eventRect = eventElements[i].getBoundingClientRect();
      const eventMiddle = eventRect.top + eventRect.height / 2;
      
      if (mouseY < eventMiddle) {
        newCheckpointIndex = i - 1;
        break;
      }
    }
    
    // If we didn't find a position above any event, put checkpoint after the last event
    if (newCheckpointIndex === -1 && eventElements.length > 0) {
      newCheckpointIndex = eventElements.length - 1;
    }
    
    // Ensure checkpoint index is within valid bounds
    const maxIndex = sortedEvents.length - 1;
    const minIndex = -1; // -1 means start from beginning
    
    setCheckpointIndex(Math.max(minIndex, Math.min(maxIndex, newCheckpointIndex)));
  };

  // Handle mouse events for checkpoint dragging
  const handleCheckpointMouseDown = (e) => {
    e.preventDefault();
    setIsDraggingCheckpoint(true);
    
    const handleMouseMove = (moveEvent) => {
      handleCheckpointDrag(moveEvent);
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
            {/* Render events with checkpoint positioned correctly */}
            {checkpointIndex === -1 && (
              <div 
                ref={checkpointRef}
                className={`event-list__checkpoint ${
                  isDraggingCheckpoint ? 'event-list__checkpoint--dragging' : ''
                }`}
                onMouseDown={handleCheckpointMouseDown}
                title="Drag to move checkpoint. Only events below this line will be processed."
                style={{
                  cursor: isDraggingCheckpoint ? 'grabbing' : 'grab',
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
            
            {/* Render all events with checkpoint inserted at the right position */}
            {sortedEvents.map((event, index) => {
              const isExpanded = expandedEvents.has(event.id);
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
                <React.Fragment key={event.id}>
                  <div
                    ref={currentEventIndex === index ? activeEventRef : null}
                    className={`event-list__event ${
                      currentEventIndex === index ? 'event-list__event--active' : ''
                    } ${isExpanded ? 'event-list__event--expanded' : ''} ${
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
                  
                  {/* Render checkpoint after this event if this is the checkpoint position */}
                  {checkpointIndex === index && (
                    <div 
                      ref={checkpointRef}
                      className={`event-list__checkpoint ${
                        isDraggingCheckpoint ? 'event-list__checkpoint--dragging' : ''
                      }`}
                      onMouseDown={handleCheckpointMouseDown}
                      title="Drag to move checkpoint. Only events below this line will be processed."
                      style={{
                        cursor: isDraggingCheckpoint ? 'grabbing' : 'grab',
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
                </React.Fragment>
              );
            })}
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
                      ✓ Event sent successfully
                      {logEntry.result && Array.isArray(logEntry.result) && (
                        <div className="event-list__log-sources">
                          {logEntry.result.map((sourceResult, idx) => (
                            <div key={idx} className="event-list__log-source">
                              <strong>{sourceResult.source}:</strong> {sourceResult.success ? '✓ Sent' : `✗ ${sourceResult.error}`}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : logEntry.status === 'partial' ? (
                    <div className={`event-list__log-message event-list__log-message--warning`}>
                      ⚠ Event partially sent
                      {logEntry.result && Array.isArray(logEntry.result) && (
                        <div className="event-list__log-sources">
                          {logEntry.result.map((sourceResult, idx) => (
                            <div key={idx} className="event-list__log-source">
                              <strong>{sourceResult.source}:</strong> {sourceResult.success ? '✓ Sent' : `✗ ${sourceResult.error}`}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className={`event-list__log-message event-list__log-message--error`}>
                      ✗ {logEntry.error || 'Failed to send event'}
                      {logEntry.result && Array.isArray(logEntry.result) && (
                        <div className="event-list__log-sources">
                          {logEntry.result.map((sourceResult, idx) => (
                            <div key={idx} className="event-list__log-source">
                              <strong>{sourceResult.source}:</strong> {sourceResult.success ? '✓ Sent' : `✗ ${sourceResult.error}`}
                            </div>
                          ))}
                        </div>
                      )}
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
