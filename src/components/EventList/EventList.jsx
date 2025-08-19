import React, { useState, useRef, useEffect } from 'react';
import { sendAppEventsToSegment } from '../../utils/segmentAPI';
import { getSourceIcon } from '../../utils/sourceIcons';
import './EventList.css';

const EventList = ({ 
  events, 
  onRemoveEvent, 
  onReorderEvents,
  onClearEvents, 
  onEditEvent, 
  highlightedEventIndices = [],
  checkpointIndex: propCheckpointIndex = -1,
  onCheckpointChange,
  stopCheckpointIndex: propStopCheckpointIndex = -1,
  onStopCheckpointChange
}) => {
  // Editing state
  const [editingEventId, setEditingEventId] = useState(null);
  const [editingValue, setEditingValue] = useState('');
  // Event ordering state
  const [orderBy, setOrderBy] = useState('timestamp');
  const [customOrderField, setCustomOrderField] = useState('');
  const [orderEnabled, setOrderEnabled] = useState(false);

  // Helper function to get nested values from object
  const getNestedValue = (obj, path) => {
    try {
      const parsedData = JSON.parse(obj.rawData);
      if (path === 'timestamp') {
        return parsedData.timestamp || parsedData.originalTimestamp || parsedData.receivedAt || parsedData.sentAt || new Date(0).toISOString();
      }
      return path.split('.').reduce((current, key) => current?.[key], parsedData);
    } catch {
      return '';
    }
  };

  // Sort events by selected field
  const sortedEvents = orderEnabled
    ? [...events].sort((a, b) => {
        const fieldToSort = orderBy === 'custom' ? customOrderField : orderBy;
        const aValue = getNestedValue(a, fieldToSort);
        const bValue = getNestedValue(b, fieldToSort);
        
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return aValue.localeCompare(bValue);
        }
        
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return aValue - bValue;
        }
        
        return String(aValue).localeCompare(String(bValue));
      })
    : events;

  // Simulation state
  const [isRunning, setIsRunning] = useState(false);
  const [timeoutMs, setTimeoutMs] = useState(1000);
  const [currentEventIndex, setCurrentEventIndex] = useState(-1);
  const [simulationLog, setSimulationLog] = useState([]);
  const [expandedEvents, setExpandedEvents] = useState(new Set());
  const [simulationLogExpanded, setSimulationLogExpanded] = useState(true);
  const [simulationCompleted, setSimulationCompleted] = useState(false);
  
  // Checkpoint state - use props if provided, otherwise use local state for backward compatibility
  const [localCheckpointIndex, setLocalCheckpointIndex] = useState(-1);
  const checkpointIndex = onCheckpointChange ? propCheckpointIndex : localCheckpointIndex;
  const setCheckpointIndex = onCheckpointChange ? onCheckpointChange : setLocalCheckpointIndex;
  const [isDraggingCheckpoint, setIsDraggingCheckpoint] = useState(false);
  
  // Stop checkpoint state
  const [localStopCheckpointIndex, setLocalStopCheckpointIndex] = useState(-1);
  const stopCheckpointIndex = onStopCheckpointChange ? propStopCheckpointIndex : localStopCheckpointIndex;
  const setStopCheckpointIndex = onStopCheckpointChange ? onStopCheckpointChange : setLocalStopCheckpointIndex;
  const [isDraggingStopCheckpoint, setIsDraggingStopCheckpoint] = useState(false);
  const [showStopCheckpoint, setShowStopCheckpoint] = useState(false);
  const [checkpointManuallyMoved, setCheckpointManuallyMoved] = useState(false);
  const [stopCheckpointManuallyMoved, setStopCheckpointManuallyMoved] = useState(false);
  
  // Event drag and reorder state
  const [isDraggingEvent, setIsDraggingEvent] = useState(false);
  const [draggedEventId, setDraggedEventId] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(-1);
  
  // Refs for scrolling functionality
  const eventsListRef = useRef(null);
  const activeEventRef = useRef(null);
  const checkpointRef = useRef(null);
  const stopCheckpointRef = useRef(null);
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

  // Auto-scroll when stop checkpoint moves
  useEffect(() => {
    if (stopCheckpointRef.current && eventsListRef.current) {
      stopCheckpointRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });
    }
  }, [stopCheckpointIndex]);

  // Reset checkpoint if it's beyond the current events list
  useEffect(() => {
    // Only reset start checkpoint if it's beyond the valid range, but preserve -1 (before all events)
    if (checkpointIndex > events.length - 1 && events.length > 0) {
      setCheckpointIndex(events.length - 1);
    }
    // Only reset stop checkpoint if it's beyond the valid range  
    if (stopCheckpointIndex > events.length && events.length > 0) {
      setStopCheckpointIndex(events.length);
    }
    // Show/hide stop checkpoint based on events
    if (events.length === 0) {
      setShowStopCheckpoint(false);
      setStopCheckpointManuallyMoved(false);
      // Reset checkpoint to initial position when all events are cleared
      if (checkpointIndex !== -1) {
        setCheckpointIndex(-1);
        setCheckpointManuallyMoved(false);
      }
    } else if (events.length > 0 && !showStopCheckpoint) {
      // Auto-show stop checkpoint when events are added
      setShowStopCheckpoint(true);
      // Set stop checkpoint position at the end of all events (only when first showing)
      if (stopCheckpointIndex === -1) {
        setStopCheckpointIndex(events.length);
      }
    } else if (events.length > 0 && showStopCheckpoint && !stopCheckpointManuallyMoved) {
      // Auto-move stop checkpoint to end when new events are added (unless manually positioned)
      setStopCheckpointIndex(events.length);
    }
  }, [events.length, checkpointIndex, setCheckpointIndex, stopCheckpointIndex, setStopCheckpointIndex, showStopCheckpoint, stopCheckpointManuallyMoved]);

  // Auto-reset checkpoint to top when new events are added (if not manually positioned)
  useEffect(() => {
    if (events.length > 0 && !checkpointManuallyMoved && checkpointIndex !== -1) {
      setCheckpointIndex(-1);
    }
  }, [events.length]);

  // Debug: Log stop checkpoint state changes (disabled to reduce console spam)
  useEffect(() => {
    // console.log('Stop checkpoint state changed:', { showStopCheckpoint, stopCheckpointIndex, eventsLength: events.length });
  }, [showStopCheckpoint, stopCheckpointIndex, events.length]);

  // ... (keep all the existing handler functions like handleRun, handleTimeout, etc.)
  // For brevity, I'll include just the essential parts of the component structure

  // Handle running the event simulation
  const handleRun = async () => {
    console.log('handleRun called, showStopCheckpoint:', showStopCheckpoint);
    
    if (events.length === 0) {
      alert('No events to simulate. Please add some events first.');
      return;
    }

    console.log('Starting simulation with stop checkpoint at:', stopCheckpointIndex);

    // Determine the range of events to process
    const startIndex = checkpointIndex + 1;
    // If stop checkpoint is at or beyond the end, include all events after start
    const endIndex = stopCheckpointIndex >= sortedEvents.length ? sortedEvents.length : stopCheckpointIndex + 1;
    
    // Get events to process (between start and stop checkpoints)
    const eventsToProcess = sortedEvents.slice(startIndex, endIndex);
    
    console.log(`Processing events from index ${startIndex} to ${endIndex} (${eventsToProcess.length} events)`);
    
    if (eventsToProcess.length === 0) {
      alert('No events to process between checkpoints. Adjust checkpoint positions to include events.');
      return;
    }

    // Update checkpoints before starting simulation:
    // Move start checkpoint to where stop checkpoint was
    // Move stop checkpoint to the end of the event list
    const newStartPosition = stopCheckpointIndex >= sortedEvents.length ? sortedEvents.length - 1 : stopCheckpointIndex;
    const newStopPosition = sortedEvents.length;
    
    setCheckpointIndex(newStartPosition);
    setStopCheckpointIndex(newStopPosition);
    setCheckpointManuallyMoved(true); // Mark as manually positioned
    setStopCheckpointManuallyMoved(false); // Allow auto-repositioning for future events

    setIsRunning(true);
    setCurrentEventIndex(-1);
    setSimulationCompleted(false);
    setSimulationLogExpanded(true); // Expand log during simulation
    
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
      
      // Update start checkpoint to the last processed event after simulation completes
      // Only if the checkpoint was manually positioned (not at default -1 position)
      if (eventsToProcess.length > 0 && checkpointManuallyMoved) {
        const finalProcessedIndex = endIndex - 1;
        setCheckpointIndex(finalProcessedIndex);
      }
      
    } catch (error) {
      console.error('Simulation failed:', error);
    } finally {
      setIsRunning(false);
      setCurrentEventIndex(-1);
      setSimulationCompleted(true);
      setSimulationLogExpanded(false); // Collapse log when completed
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

  // Event drag handlers
  const handleEventDragStart = (e, eventId) => {
    if (isRunning) {
      e.preventDefault();
      return;
    }
    
    setIsDraggingEvent(true);
    setDraggedEventId(eventId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.outerHTML);
    
    // Add visual feedback
    e.target.style.opacity = '0.5';
  };

  const handleEventDragEnd = (e) => {
    e.target.style.opacity = '1';
    setIsDraggingEvent(false);
    setDraggedEventId(null);
    setDragOverIndex(-1);
  };

  const handleEventDragOver = (e, targetIndex) => {
    e.preventDefault();
    if (!isDraggingEvent || !draggedEventId) return;
    
    setDragOverIndex(targetIndex);
    e.dataTransfer.dropEffect = 'move';
  };

  const handleEventDrop = (e, targetIndex) => {
    e.preventDefault();
    if (!draggedEventId || !onReorderEvents) return;
    
    const draggedEventIndex = events.findIndex(event => event.id === draggedEventId);
    if (draggedEventIndex === -1 || draggedEventIndex === targetIndex) return;
    
    // Call the reorder function
    onReorderEvents(draggedEventIndex, targetIndex);
    
    setIsDraggingEvent(false);
    setDraggedEventId(null);
    setDragOverIndex(-1);
  };

  // Handle checkpoint drag
  const handleCheckpointDrag = (e) => {
    e.preventDefault();
    
    const eventsList = document.querySelector('.event-list__events--scrollable');
    if (!eventsList) return;
    
    const eventElements = eventsList.querySelectorAll('.event-list__event');
    const mouseY = e.clientY;
    
    // Get the bounds of the events container to handle padding area
    const eventsListRect = eventsList.getBoundingClientRect();
    
    let newCheckpointIndex = -1;
    
    // If there are no events, allow checkpoint at -1
    if (eventElements.length === 0) {
      newCheckpointIndex = -1;
    } else {
      // Check if mouse is above the first event (in the padding area)
      const firstEventRect = eventElements[0].getBoundingClientRect();
      if (mouseY < firstEventRect.top) {
        newCheckpointIndex = -1; // Before first event
      } else {
        // Check position relative to each event
        for (let i = 0; i < eventElements.length; i++) {
          const eventRect = eventElements[i].getBoundingClientRect();
          const eventMiddle = eventRect.top + eventRect.height / 2;
          
          if (mouseY < eventMiddle) {
            newCheckpointIndex = i - 1;
            break;
          }
        }
        
        // If we didn't find a position above any event, check if we're below the last event
        if (newCheckpointIndex === -1) {
          const lastEventRect = eventElements[eventElements.length - 1].getBoundingClientRect();
          if (mouseY > lastEventRect.bottom) {
            newCheckpointIndex = eventElements.length; // After last event
          } else {
            newCheckpointIndex = eventElements.length - 1; // At last event
          }
        }
      }
    }
    
    // Allow checkpoint to go beyond the last event, but ensure it's before stop checkpoint
    const maxIndex = showStopCheckpoint ? Math.min(stopCheckpointIndex - 1, sortedEvents.length) : sortedEvents.length;
    const minIndex = -1; // -1 means start from beginning
    
    setCheckpointIndex(Math.max(minIndex, Math.min(maxIndex, newCheckpointIndex)));
    setCheckpointManuallyMoved(true); // Mark as manually moved
  };

  // Handle stop checkpoint drag
  const handleStopCheckpointDrag = (e) => {
    e.preventDefault();
    
    const eventsList = document.querySelector('.event-list__events--scrollable');
    if (!eventsList) return;
    
    const eventElements = eventsList.querySelectorAll('.event-list__event');
    const mouseY = e.clientY;
    
    let newStopCheckpointIndex = -1;
    
    // If there are no events, set to -1
    if (eventElements.length === 0) {
      newStopCheckpointIndex = -1;
    } else {
      // Check position relative to each event
      for (let i = 0; i < eventElements.length; i++) {
        const eventRect = eventElements[i].getBoundingClientRect();
        const eventMiddle = eventRect.top + eventRect.height / 2;
        
        if (mouseY < eventMiddle) {
          newStopCheckpointIndex = i - 1;
          break;
        }
      }
      
      // If we didn't find a position above any event, check if we're below the last event
      if (newStopCheckpointIndex === -1) {
        const lastEventRect = eventElements[eventElements.length - 1].getBoundingClientRect();
        if (mouseY > lastEventRect.bottom) {
          newStopCheckpointIndex = eventElements.length; // After last event
        } else {
          newStopCheckpointIndex = eventElements.length - 1; // At last event
        }
      }
    }
    
    // Ensure stop checkpoint is after start checkpoint
    const minIndex = checkpointIndex + 1;
    const maxIndex = sortedEvents.length; // Allow beyond last event
    
    setStopCheckpointIndex(Math.max(minIndex, Math.min(maxIndex, newStopCheckpointIndex)));
    setStopCheckpointManuallyMoved(true); // Mark as manually moved
  };

  // Handle mouse events for checkpoint dragging
  const handleCheckpointMouseDown = (e) => {
    e.preventDefault();
    setIsDraggingCheckpoint(true);
    
    // Add smooth dragging with throttled updates
    let animationFrameId;
    
    const handleMouseMove = (moveEvent) => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      
      animationFrameId = requestAnimationFrame(() => {
        handleCheckpointDrag(moveEvent);
      });
    };
    
    const handleMouseUp = () => {
      setIsDraggingCheckpoint(false);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Handle mouse events for stop checkpoint dragging
  const handleStopCheckpointMouseDown = (e) => {
    e.preventDefault();
    setIsDraggingStopCheckpoint(true);
    
    // Add smooth dragging with throttled updates
    let animationFrameId;
    
    const handleMouseMove = (moveEvent) => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      
      animationFrameId = requestAnimationFrame(() => {
        handleStopCheckpointDrag(moveEvent);
      });
    };
    
    const handleMouseUp = () => {
      setIsDraggingStopCheckpoint(false);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
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

  // Convert events to CSV and download
  const downloadEventsCSV = () => {
    if (events.length === 0) {
      alert('No events to download');
      return;
    }

    // Prepare CSV data
    const csvRows = [];
    
    // Add header row
    csvRows.push([
      'Event Number',
      'Event Type',
      'Event Name',
      'Timestamp',
      'User ID',
      'Anonymous ID',
      'Source Name',
      'Source Type',
      'Write Key',
      'Raw Event Data'
    ]);

    // Add data rows
    sortedEvents.forEach((event, index) => {
      try {
        const parsedData = JSON.parse(event.rawData);
        const eventType = getEventType(event.rawData);
        const eventName = parsedData.event || parsedData.properties?.name || '';
        const timestamp = parsedData.timestamp || parsedData.originalTimestamp || parsedData.receivedAt || event.timestamp || '';
        const userId = parsedData.userId || '';
        const anonymousId = parsedData.anonymousId || '';
        
        // Handle multiple sources or single source
        if (event.sources && event.sources.length > 0) {
          event.sources.forEach(source => {
            csvRows.push([
              index + 1,
              eventType,
              eventName,
              timestamp,
              userId,
              anonymousId,
              source.name || '',
              source.type || '',
              source.settings?.writeKey || '',
              `"${event.rawData.replace(/"/g, '""')}"` // Escape quotes in JSON
            ]);
          });
        } else {
          csvRows.push([
            index + 1,
            eventType,
            eventName,
            timestamp,
            userId,
            anonymousId,
            event.sourceName || '',
            event.sourceType || '',
            event.writeKey || '',
            `"${event.rawData.replace(/"/g, '""')}"` // Escape quotes in JSON
          ]);
        }
      } catch (error) {
        // If parsing fails, add basic info
        csvRows.push([
          index + 1,
          'unknown',
          '',
          event.timestamp || '',
          '',
          '',
          event.sourceName || '',
          event.sourceType || '',
          event.writeKey || '',
          `"${event.rawData.replace(/"/g, '""')}"`
        ]);
      }
    });

    // Convert to CSV string
    const csvContent = csvRows.map(row => row.join(',')).join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `events_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="event-list event-list--sidebar">
      <div className="event-list__header">
        <h2 className="event-list__title">Event Simulator ({events.length})</h2>
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
                title="Drag to move start checkpoint. Events below this line will be processed."
                style={{
                  cursor: isDraggingCheckpoint ? 'grabbing' : 'grab',
                }}
              >
                <div className="event-list__checkpoint-line"></div>
                <div className="event-list__checkpoint-handle">
                  <span className="event-list__checkpoint-icon">⋮⋮</span>
                  <span className="event-list__checkpoint-text">
                    Start Checkpoint - Simulation starts from here.
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
              // Events are excluded if they are after the stop checkpoint position
              const isAfterStopCheckpoint = showStopCheckpoint && index > stopCheckpointIndex;
              // Events are in range if they're after start checkpoint and not after stop checkpoint
              const isInRange = index > checkpointIndex && !isAfterStopCheckpoint;
              
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
                  {/* Drop zone indicator before this event */}
                  {isDraggingEvent && dragOverIndex === index && (
                    <div className="event-list__drop-indicator">
                      <div className="event-list__drop-line"></div>
                    </div>
                  )}
                  
                  <div
                    ref={currentEventIndex === index ? activeEventRef : null}
                    draggable={!isRunning}
                    onDragStart={(e) => handleEventDragStart(e, event.id)}
                    onDragEnd={handleEventDragEnd}
                    onDragOver={(e) => handleEventDragOver(e, index)}
                    onDrop={(e) => handleEventDrop(e, index)}
                    className={`event-list__event ${
                      currentEventIndex === index ? 'event-list__event--active' : ''
                    } ${isExpanded ? 'event-list__event--expanded' : ''} ${
                      isUserHighlighted ? 'event-list__event--user-highlighted' : ''
                    } ${
                      isBeforeCheckpoint ? 'event-list__event--processed' : ''
                    } ${
                      isAfterStopCheckpoint ? 'event-list__event--excluded' : ''
                    } ${
                      isInRange ? 'event-list__event--in-range' : ''
                    } ${
                      isDraggingEvent && draggedEventId === event.id ? 'event-list__event--dragging' : ''
                    } ${
                      isDraggingEvent && dragOverIndex === index ? 'event-list__event--drag-over' : ''
                    }`}
                    style={{
                      cursor: !isRunning ? 'grab' : 'default'
                    }}
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
                      title="Drag to move start checkpoint. Events below this line will be processed."
                      style={{
                        cursor: isDraggingCheckpoint ? 'grabbing' : 'grab',
                      }}
                    >
                      <div className="event-list__checkpoint-line"></div>
                      <div className="event-list__checkpoint-handle">
                        <span className="event-list__checkpoint-icon">⋮⋮</span>
                        <span className="event-list__checkpoint-text">
                          Start Checkpoint - Simulation starts from here.
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Render stop checkpoint after this event if this is the stop checkpoint position */}
                  {showStopCheckpoint && stopCheckpointIndex === index && (
                    <div 
                      ref={stopCheckpointRef}
                      className={`event-list__stop-checkpoint ${
                        isDraggingStopCheckpoint ? 'event-list__stop-checkpoint--dragging' : ''
                      }`}
                      onMouseDown={handleStopCheckpointMouseDown}
                      title="Drag to move stop checkpoint. Events above this line will be processed."
                      style={{
                        cursor: isDraggingStopCheckpoint ? 'grabbing' : 'grab',
                      }}
                    >
                      <div className="event-list__stop-checkpoint-line"></div>
                      <div className="event-list__stop-checkpoint-handle">
                        <span className="event-list__stop-checkpoint-icon">⋮⋮</span>
                        <span className="event-list__stop-checkpoint-text">
                          Stop Checkpoint - Simulation stops here.
                        </span>
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
            
            {/* Render stop checkpoint at the end only if it's positioned after all events */}
            {showStopCheckpoint && stopCheckpointIndex >= sortedEvents.length && (
              <div 
                ref={stopCheckpointRef}
                className={`event-list__stop-checkpoint ${
                  isDraggingStopCheckpoint ? 'event-list__stop-checkpoint--dragging' : ''
                }`}
                onMouseDown={handleStopCheckpointMouseDown}
                title="Drag to move stop checkpoint. Events above this line will be processed."
                style={{
                  cursor: isDraggingStopCheckpoint ? 'grabbing' : 'grab',
                }}
              >
                <div className="event-list__stop-checkpoint-line"></div>
                <div className="event-list__stop-checkpoint-handle">
                  <span className="event-list__stop-checkpoint-icon">⋮⋮</span>
                  <span className="event-list__stop-checkpoint-text">
                    Stop Checkpoint - Simulation stops here.
                  </span>
                </div>
              </div>
            )}
            
            {/* Drop zone at the end for reordering */}
            {isDraggingEvent && (
              <div 
                className="event-list__drop-zone-end"
                onDragOver={(e) => handleEventDragOver(e, sortedEvents.length)}
                onDrop={(e) => handleEventDrop(e, sortedEvents.length)}
              >
                {dragOverIndex === sortedEvents.length && (
                  <div className="event-list__drop-indicator">
                    <div className="event-list__drop-line"></div>
                  </div>
                )}
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
          <button
            onClick={downloadEventsCSV}
            disabled={events.length === 0}
            className="event-list__download-button"
            title="Download events as CSV"
          >
            <img src="/assets/Download_symbol.svg" alt="Download" className="event-list__download-icon" />
            Download
          </button>
        </div>

        <button
          onClick={handleRun}
          disabled={isRunning || events.length === 0 || (showStopCheckpoint && stopCheckpointIndex <= checkpointIndex)}
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
              {showStopCheckpoint && stopCheckpointIndex > checkpointIndex && (
                <span className="event-list__run-count">
                  ({stopCheckpointIndex - checkpointIndex} events)
                </span>
              )}
            </>
          )}
        </button>
      </div>

      {/* Simulation log */}
      {simulationLog.length > 0 && (
        <div className="event-list__log-section">
          <h3 
            className="event-list__log-title event-list__log-title--clickable"
            onClick={() => setSimulationLogExpanded(!simulationLogExpanded)}
          >
            Simulation Log
            {simulationCompleted && (
              <span className="event-list__log-completed">COMPLETED</span>
            )}
            <span className={`event-list__log-toggle ${simulationLogExpanded ? 'event-list__log-toggle--expanded' : ''}`}>
              ▼
            </span>
          </h3>
          {simulationLogExpanded && (
            <div className="event-list__log-container">
              {/* During simulation, show only the latest log. After completion, show all logs */}
              {(isRunning ? simulationLog.slice(-1) : simulationLog).map((logEntry, index, array) => {
                // Use original index for key when showing only latest, otherwise use current index
                const keyIndex = isRunning ? simulationLog.length - 1 : index;
                return (
                  <div
                    key={keyIndex}
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
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EventList;
