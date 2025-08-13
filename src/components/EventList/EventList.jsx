import React, { useState } from 'react';
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

  // Handle running the event simulation
  const handleRun = async () => {
    if (events.length === 0) {
      alert('No events to simulate. Please add some events first.');
      return;
    }

    setIsRunning(true);
    setCurrentEventIndex(-1);
    setSimulationLog([]);

    // Check for events with writeKeys and global fallback writeKey
    const globalWriteKey = getStoredWriteKey();
    
    // For multi-source events, check if any source has a writeKey
    // For single-source events, check the writeKey field
    const eventsWithWriteKeys = events.filter(event => {
      if (event.sources && event.sources.length > 0) {
        // Multi-source event: check if any source has a writeKey
        return event.sources.some(source => source.settings?.writeKey && source.settings.writeKey.trim() !== '');
      } else {
        // Single-source event: check writeKey field
        return event.writeKey && event.writeKey.trim() !== '';
      }
    });
    
    const eventsWithoutWriteKeys = events.filter(event => {
      if (event.sources && event.sources.length > 0) {
        // Multi-source event: only include if NO sources have writeKeys
        return !event.sources.some(source => source.settings?.writeKey && source.settings.writeKey.trim() !== '');
      } else {
        // Single-source event: check writeKey field
        return !event.writeKey || event.writeKey.trim() === '';
      }
    });
    
    let segmentEnabled = false;
    
    if (eventsWithWriteKeys.length > 0) {
      segmentEnabled = true;
      setSimulationLog(prev => [
        ...prev,
        {
          timestamp: new Date().toISOString(),
          eventIndex: -1,
          event: null,
          result: `Found ${eventsWithWriteKeys.length} events with configured sources - will be sent to Segment`,
          status: 'info'
        }
      ]);
    }
    
    if (eventsWithoutWriteKeys.length > 0) {
      if (globalWriteKey && globalWriteKey.length > 0) {
        segmentEnabled = true;
        setSimulationLog(prev => [
          ...prev,
          {
            timestamp: new Date().toISOString(),
            eventIndex: -1,
            event: null,
            result: `Found ${eventsWithoutWriteKeys.length} events without sources - will use global writeKey`,
            status: 'info'
          }
        ]);
      } else {
        setSimulationLog(prev => [
          ...prev,
          {
            timestamp: new Date().toISOString(),
            eventIndex: -1,
            event: null,
            result: `Found ${eventsWithoutWriteKeys.length} events without sources and no global writeKey - will simulate only`,
            status: 'info'
          }
        ]);
      }
    }
    
    if (!segmentEnabled) {
      setSimulationLog(prev => [
        ...prev,
        {
          timestamp: new Date().toISOString(),
          eventIndex: -1,
          event: null,
          result: 'Segment integration disabled - configure writeKey in Source Config to enable',
          status: 'info'
        }
      ]);
    }

    try {
      await simulateEvents(
        events,
        timeoutMs,
        // Progress callback
        (eventIndex, event, result) => {
          setCurrentEventIndex(eventIndex);
          setSimulationLog(prev => [
            ...prev,
            {
              timestamp: new Date().toISOString(),
              eventIndex,
              event,
              result,
              status: 'success'
            }
          ]);
        },
        // Error callback
        (eventIndex, event, error) => {
          setSimulationLog(prev => [
            ...prev,
            {
              timestamp: new Date().toISOString(),
              eventIndex,
              event,
              error: error.message,
              status: 'error'
            }
          ]);
        }
      );

      // After simulation, send events to Segment if enabled
      if (segmentEnabled) {
        try {
          setSimulationLog(prev => [
            ...prev,
            {
              timestamp: new Date().toISOString(),
              eventIndex: -1,
              event: null,
              result: 'Sending events to Segment...',
              status: 'info'
            }
          ]);

          // Group events by writeKey, handling both single and multi-source events
          const eventsByWriteKey = new Map();
          
          // Handle events with their own writeKeys (single source events)
          eventsWithWriteKeys.forEach(event => {
            if (event.sources && event.sources.length > 0) {
              // Multi-source event: create separate entries for each source
              event.sources.forEach(source => {
                const writeKey = source.settings?.writeKey;
                if (writeKey) {
                  if (!eventsByWriteKey.has(writeKey)) {
                    eventsByWriteKey.set(writeKey, []);
                  }
                  // Create a single-source version of the event for sending
                  const singleSourceEvent = {
                    ...event,
                    writeKey: writeKey,
                    sourceName: source.name,
                    sourceType: source.type,
                    sources: undefined // Remove sources array for individual sending
                  };
                  eventsByWriteKey.get(writeKey).push(singleSourceEvent);
                }
              });
            } else {
              // Single source event
              if (!eventsByWriteKey.has(event.writeKey)) {
                eventsByWriteKey.set(event.writeKey, []);
              }
              eventsByWriteKey.get(event.writeKey).push(event);
            }
          });
          
          // Add events without writeKeys to global writeKey group (if available)
          if (globalWriteKey && globalWriteKey.length > 0 && eventsWithoutWriteKeys.length > 0) {
            eventsByWriteKey.set(globalWriteKey, eventsWithoutWriteKeys);
          }
          
          let totalSent = 0;
          
          // Send events for each writeKey group
          for (const [writeKey, eventsGroup] of eventsByWriteKey.entries()) {
            try {
              await sendAppEventsToSegment(eventsGroup, writeKey, true);
              totalSent += eventsGroup.length;
              
              setSimulationLog(prev => [
                ...prev,
                {
                  timestamp: new Date().toISOString(),
                  eventIndex: -1,
                  event: null,
                  result: `Sent ${eventsGroup.length} events to writeKey: ${writeKey.substring(0, 8)}...`,
                  status: 'success'
                }
              ]);
            } catch (writeKeyError) {
              setSimulationLog(prev => [
                ...prev,
                {
                  timestamp: new Date().toISOString(),
                  eventIndex: -1,
                  event: null,
                  error: `Failed to send ${eventsGroup.length} events to writeKey ${writeKey.substring(0, 8)}...: ${writeKeyError.message}`,
                  status: 'error'
                }
              ]);
            }
          }
          
          if (totalSent > 0) {
            setSimulationLog(prev => [
              ...prev,
              {
                timestamp: new Date().toISOString(),
                eventIndex: -1,
                event: null,
                result: `Successfully sent ${totalSent} total events to Segment across ${eventsByWriteKey.size} sources`,
                status: 'success'
              }
            ]);
          }
          
        } catch (segmentError) {
          setSimulationLog(prev => [
            ...prev,
            {
              timestamp: new Date().toISOString(),
              eventIndex: -1,
              event: null,
              error: 'Failed to send events to Segment: ' + segmentError.message,
              status: 'error'
            }
          ]);
        }
      }
    } catch (error) {
      console.error('Simulation failed:', error);
      setSimulationLog(prev => [
        ...prev,
        {
          timestamp: new Date().toISOString(),
          eventIndex: -1,
          error: 'Simulation interrupted: ' + error.message,
          status: 'error'
        }
      ]);
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

  // Get all unique event types for tooltip
  const getUniqueEventTypes = () => {
    const types = new Set(events.map(event => getEventType(event.rawData)));
    return Array.from(types).sort();
  };

  // Get data points details for a specific event
  const getDataPointsForEvent = (eventData) => {
    try {
      const parsed = JSON.parse(eventData);
      return Object.keys(parsed);
    } catch {
      return [];
    }
  };

  // Get all unique data point keys across all events
  const getAllDataPointTypes = () => {
    const dataPoints = new Set();
    events.forEach(event => {
      getDataPointsForEvent(event.rawData).forEach(key => dataPoints.add(key));
    });
    return Array.from(dataPoints).sort();
  };

  // Handle Events stat card hover - highlight all events
  const handleEventsHover = (isHovering) => {
    if (isHovering) {
      const allEventIds = new Set(events.map(event => event.id));
      setHighlightedEvents(allEventIds);
    } else {
      setHighlightedEvents(new Set());
    }
  };

  // Handle Event Types stat card hover - show tooltip
  const handleEventTypesHover = (isHovering) => {
    setShowEventTypesTooltip(isHovering);
  };

  // Handle Data Points stat card hover - show tooltip
  const handleDataPointsHover = (isHovering) => {
    setShowDataPointsTooltip(isHovering);
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
      <div className="event-list__events event-list__events--scrollable">
        {sortedEvents.length === 0 ? (
          <div className="event-list__empty-state">
            <p className="event-list__empty-message">No events added yet.</p>
            <p className="event-list__empty-subtitle">Use the Event Builder above to create and save events.</p>
          </div>
        ) : (
          sortedEvents.map((event, index) => {
            const isExpanded = expandedEvents.has(event.id);
            const isHighlighted = highlightedEvents.has(event.id);
            const isUserHighlighted = highlightedEventIndices.includes(index);
            const eventType = getEventType(event.rawData);
            
            // Parse rawData to extract event name
            let eventName = null;
            try {
              const parsedData = JSON.parse(event.rawData);
              eventName = parsedData.event || parsedData.properties?.name || null;
            } catch (e) {
              eventName = null;
            }
            
            const isEditing = editingEventId === event.id;

            const handleEditClick = (e) => {
              e.stopPropagation();
              setEditingEventId(event.id);
              setEditingValue(formatEventForDisplay(event.rawData));
            };

            const handleEditSave = () => {
              try {
                const parsed = JSON.parse(editingValue);
                if (typeof onEditEvent === 'function') {
                  onEditEvent(event.id, parsed);
                }
                setEditingEventId(null);
                setEditingValue('');
              } catch {
                alert('Invalid JSON. Please fix errors before saving.');
              }
            };

            const handleEditCancel = () => {
              setEditingEventId(null);
              setEditingValue('');
            };

            return (
              <div
                key={event.id}
                className={`event-list__event ${
                  currentEventIndex === index ? 'event-list__event--active' : ''
                } ${isExpanded ? 'event-list__event--expanded' : ''} ${
                  isHighlighted ? 'event-list__event--highlighted' : ''
                } ${
                  isUserHighlighted ? 'event-list__event--user-highlighted' : ''
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
                            // For CSV uploaded events, timestamp is in rawData
                            const parsedData = JSON.parse(event.rawData);
                            const timestamp = parsedData.timestamp || parsedData.originalTimestamp || parsedData.receivedAt || event.timestamp;
                            return timestamp ? new Date(timestamp).toLocaleTimeString() : 'No timestamp';
                          } catch (e) {
                            // Fallback for built-in events that have timestamp directly
                            return event.timestamp ? new Date(event.timestamp).toLocaleTimeString() : 'No timestamp';
                          }
                        })()}
                      </span>
                      <div className="event-list__event-toggle">
                        {isExpanded ? '▼' : '▶'}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent toggle when clicking remove
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
                          // Multi-source event: show all sources
                          event.sources.map((source, sourceIndex) => (
                            <span 
                              key={sourceIndex}
                              className="event-list__event-source" 
                              title={`WriteKey: ${source.settings?.writeKey || 'Not set'}`}
                            >
                              {getSourceIcon(source.type)} {source.name}
                            </span>
                          ))
                        ) : (
                          // Single source event
                          <span className="event-list__event-source" title={`WriteKey: ${event.writeKey || 'Not set'}`}>
                            {getSourceIcon(event.sourceType)} {event.sourceName}
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
                      ref={el => {
                        if (!el) return;
                        if (editingEventId !== event.id) return;
                        if (document.activeElement !== el) return;
                        // Restore selection if needed
                        if (window._jsonCursorAbs !== undefined) {
                          const absOffset = window._jsonCursorAbs;
                          const sel = window.getSelection();
                          if (sel && el.firstChild && el.firstChild.nodeType === Node.TEXT_NODE) {
                            const range = document.createRange();
                            range.setStart(el.firstChild, Math.min(absOffset, el.firstChild.textContent.length));
                            range.collapse(true);
                            sel.removeAllRanges();
                            sel.addRange(range);
                          }
                        }
                      }}
                      onFocus={e => {
                        setEditingEventId(event.id);
                        setEditingValue(formatEventForDisplay(event.rawData));
                        // Move cursor to end
                        setTimeout(() => {
                          const el = e.currentTarget;
                          if (!el) return;
                          const sel = window.getSelection();
                          if (el.childNodes.length > 0 && sel) {
                            const range = document.createRange();
                            range.setStart(el.childNodes[0], el.textContent.length);
                            range.collapse(true);
                            sel.removeAllRanges();
                            sel.addRange(range);
                          }
                        }, 0);
                      }}
                      onInput={e => {
                        if (editingEventId === event.id) {
                          // Save absolute cursor position
                          const sel = window.getSelection();
                          let absOffset = 0;
                          if (sel && sel.anchorNode && e.currentTarget.contains(sel.anchorNode)) {
                            // Only works for single text node (JSON string)
                            absOffset = sel.anchorOffset;
                          }
                          window._jsonCursorAbs = absOffset;
                          setEditingValue(e.currentTarget.textContent);
                          // Restore cursor position after state update
                          setTimeout(() => {
                            const el = e.currentTarget;
                            if (!el) return;
                            const absOffset = window._jsonCursorAbs;
                            const sel = window.getSelection();
                            if (el.firstChild && el.firstChild.nodeType === Node.TEXT_NODE && sel) {
                              const range = document.createRange();
                              range.setStart(el.firstChild, Math.min(absOffset, el.firstChild.textContent.length));
                              range.collapse(true);
                              sel.removeAllRanges();
                              sel.addRange(range);
                            }
                          }, 0);
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
                            // Optionally show error or revert
                          }
                          setEditingEventId(null);
                          setEditingValue('');
                        }
                      }}
                      style={{ outline: editingEventId === event.id ? '2px solid #2563eb' : 'none', minHeight: 120, cursor: 'text' }}
                    >
                      {editingEventId === event.id ? editingValue : formatEventForDisplay(event.rawData)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Statistics Dashboard - two row layout */}
      {events.length > 0 && (
        <div className="event-list__stats">
          <div className="event-list__stats-row">
            <div 
              className="event-list__stat-card event-list__stat-card--interactive"
              onMouseEnter={() => handleEventsHover(true)}
              onMouseLeave={() => handleEventsHover(false)}
            >
              <div className="event-list__stat-value">{events.length}</div>
              <div className="event-list__stat-label">Events</div>
            </div>
            
            <div className="event-list__stat-card">
              <div className="event-list__stat-value">
                {new Set(events.map(event => {
                  try {
                    const parsed = JSON.parse(event.rawData);
                    return parsed.userId || parsed.user_id || parsed.userID || 'anon';
                  } catch {
                    return 'anon';
                  }
                })).size}
              </div>
              <div className="event-list__stat-label">Users</div>
            </div>
          </div>
          
          <div className="event-list__stats-row">
            <div 
              className="event-list__stat-card event-list__stat-card--interactive event-list__stat-card--tooltip"
              onMouseEnter={() => handleDataPointsHover(true)}
              onMouseLeave={() => handleDataPointsHover(false)}
            >
              <div className="event-list__stat-value">
                {events.reduce((total, event) => {
                  try {
                    const parsed = JSON.parse(event.rawData);
                    return total + Object.keys(parsed).length;
                  } catch {
                    return total;
                  }
                }, 0)}
              </div>
              <div className="event-list__stat-label">Data Points</div>
              
              {/* Tooltip for Data Points */}
              {showDataPointsTooltip && (
                <div className="event-list__tooltip">
                  <div className="event-list__tooltip-title">Data Point Fields:</div>
                  <ul className="event-list__tooltip-list">
                    {getAllDataPointTypes().map(field => (
                      <li key={field} className="event-list__tooltip-item">
                        {field}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            
            <div 
              className="event-list__stat-card event-list__stat-card--interactive event-list__stat-card--tooltip"
              onMouseEnter={() => handleEventTypesHover(true)}
              onMouseLeave={() => handleEventTypesHover(false)}
            >
              <div className="event-list__stat-value">
                {new Set(events.map(event => {
                  try {
                    const parsed = JSON.parse(event.rawData);
                    return parsed.event || parsed.type || 'unknown';
                  } catch {
                    return 'unknown';
                  }
                })).size}
              </div>
              <div className="event-list__stat-label">Event Types</div>
              
              {/* Tooltip for Event Types */}
              {showEventTypesTooltip && (
                <div className="event-list__tooltip">
                  <div className="event-list__tooltip-title">Event Types:</div>
                  <ul className="event-list__tooltip-list">
                    {getUniqueEventTypes().map(type => (
                      <li key={type} className="event-list__tooltip-item">
                        {type}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
          disabled={isRunning || events.length === 0}
          className="event-list__run-button"
        >
          {isRunning ? 'Running...' : 'Run Simulation'}
        </button>

        {isRunning && (
          <div className="event-list__running-status">
            <div className="event-list__spinner"></div>
            <span>Processing events...</span>
          </div>
        )}
      </div>

      {/* Simulation log */}
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