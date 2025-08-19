import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef, useCallback } from 'react';
import { formatAsJSON, validateJSON } from '../../utils/jsonUtils';
import { parseSegmentMethodCall } from '../../utils/EventBuilderSpecPayloads';

import { getStoredSourceConfig } from '../../utils/segmentAPI';
import { parseCSV } from '../../utils/parseCSV';

import './EventBuilder.css';



// Utility to clean up CSV row keys/values and convert to Segment event spec
// (Currently unused but kept for potential future CSV processing enhancements)
// eslint-disable-next-line no-unused-vars
function cleanCSVRowToSegmentEvent(row) {
  const cleaned = {};
  for (let key in row) {
    // Remove extra quotes from keys and values
    let cleanKey = key.replace(/^"+|"+$/g, '').replace(/^'+|'+$/g, '').replace(/\\"/g, '');
    let value = row[key];
    if (typeof value === 'string') {
      value = value.replace(/^"+|"+$/g, '').replace(/^'+|'+$/g, '');
      // Replace equals before curly brace with colon (for malformed JSON)
      value = value.replace(/=\s*([\{[])/g, ':$1');
      // Remove unnecessary backslashes except in URLs
      if (!/^https?:\/\//.test(value)) {
        value = value.replace(/\\(?!["\/bnrt])/g, '');
      }
      // Try to parse JSON-like values
      try {
        if ((value.startsWith('{') && value.endsWith('}')) || (value.startsWith('[') && value.endsWith(']'))) {
          value = JSON.parse(value);
        }
      } catch {}
    }
    cleaned[cleanKey.toLowerCase()] = value;
  }
  // Remove messageId if present
  delete cleaned['messageid'];
  // Map to Segment spec: userId, anonymousId, event, properties, type, etc.
  if (cleaned.userid) cleaned.userId = cleaned.userid;
  if (cleaned.anonymousid) cleaned.anonymousId = cleaned.anonymousid;
  // Remove lowercased keys after mapping
  delete cleaned.userid;
  delete cleaned.anonymousid;
  return cleaned;
}

// Utility to ensure userId and anonymousId are always first in payload
function reorderPayloadFields(payload) {
  const orderedPayload = {};
  
  // Add userId and anonymousId first if they exist
  if ('userId' in payload) {
    orderedPayload.userId = payload.userId;
  }
  if ('anonymousId' in payload) {
    orderedPayload.anonymousId = payload.anonymousId;
  }
  
  // Add all other fields
  Object.keys(payload).forEach(key => {
    if (key !== 'userId' && key !== 'anonymousId') {
      orderedPayload[key] = payload[key];
    }
  });
  
  return orderedPayload;
}

// Utility to move top-level messageId to context.messageId for Segment compatibility
function processMessageIdForSegment(payload) {
  try {
    const payloadObj = typeof payload === 'string' ? JSON.parse(payload) : payload;
    
    // Check if there's a top-level messageId
    if (payloadObj.messageId) {
      // Create a copy to avoid mutating the original
      const processedPayload = { ...payloadObj };
      
      // Store the messageId in context
      if (!processedPayload.context) {
        processedPayload.context = {};
      }
      
      // Only move messageId if it's not already in context
      if (!processedPayload.context.messageId) {
        processedPayload.context.messageId = processedPayload.messageId;
        console.log(`🔄 [EventBuilder] Moved messageId "${processedPayload.messageId}" to context.messageId to prevent Segment deduplication`);
      }
      
      // Remove the top-level messageId
      delete processedPayload.messageId;
      
      return processedPayload;
    }
    
    return payloadObj;
  } catch (error) {
    console.warn('⚠️ [EventBuilder] Failed to process messageId:', error);
    return payload;
  }
}



const EventBuilder = forwardRef(({ onSave, selectedEvent, currentUser, onEventInfoChange, userUpdateTrigger, sourceConfigUpdateTrigger, onCurrentUserUpdate, onCSVUploadStart, onAddSourceToEvent }, ref) => {
  const [rawText, setRawText] = useState('');
  const [formattedText, setFormattedText] = useState('');
  const [isValid, setIsValid] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [selectedSource, setSelectedSource] = useState(null);
  const [configuredSources, setConfiguredSources] = useState([]);
  const [lastUpdatedFrom, setLastUpdatedFrom] = useState('raw'); // Track which field was last updated
  const [showFormattedBorder, setShowFormattedBorder] = useState(false); // Track when to show blue border
  const textareaRef = useRef(null);
  const formattedTextareaRef = useRef(null);
  
  // Extract toggle states to a separate variable for better dependency detection
  const toggleStatesStr = JSON.stringify(currentUser?._toggles || {});

  // Load configured sources with writeKeys
  useEffect(() => {
    const sources = getStoredSourceConfig();
    // Filter sources that are enabled and have a writeKey configured
    const sourcesWithWriteKeys = sources.filter(
      source =>
        source.enabled &&
        source.settings &&
        source.settings.writeKey &&
        source.settings.writeKey.trim() !== ''
    );
    setConfiguredSources(sourcesWithWriteKeys);
    // No default source selection - user must explicitly choose or send to all
  }, []);

  // Refresh configured sources when source config is updated
  useEffect(() => {
    if (sourceConfigUpdateTrigger > 0) {
      const sources = getStoredSourceConfig();
      const sourcesWithWriteKeys = sources.filter(
        source =>
          source.enabled &&
          source.settings &&
          source.settings.writeKey &&
          source.settings.writeKey.trim() !== ''
      );
      setConfiguredSources(sourcesWithWriteKeys);
      console.log('🔄 [EventBuilder] Refreshed configured sources after config update');
    }
  }, [sourceConfigUpdateTrigger]);

  // Handle source selection
  const handleSourceSelect = (source) => {
    // If we're editing an existing event, add the source to that event
    if (selectedEvent && selectedEvent._editingEventId && onAddSourceToEvent) {
      onAddSourceToEvent(selectedEvent._editingEventId, source);
      return;
    }
    
    // Otherwise, handle normal source selection for new events
    // If the clicked source is already selected, deselect it
    if (selectedSource?.id === source.id) {
      setSelectedSource(null);
    } else {
      // Otherwise, select the new source
      setSelectedSource(source);
    }
  };

  // Load selected event when it changes
  useEffect(() => {
    if (selectedEvent) {
      console.log('🔄 [EventBuilder] Loading selectedEvent:', selectedEvent.name);
      console.log('👤 [EventBuilder] currentUser data:', JSON.stringify(currentUser, null, 2));
      
      // Check if payload is a function (new format) or object (old format)
      let payload;
      if (typeof selectedEvent.payload === 'function') {
        // New format: payload is a function that takes currentUser
        payload = selectedEvent.payload(currentUser);
        console.log('📦 [EventBuilder] Payload from function:', JSON.stringify(payload, null, 2));
      } else {
        // Old format: payload is an object (fallback for compatibility)
        payload = { ...selectedEvent.payload };
        console.log('📦 [EventBuilder] Initial payload (before user merge):', JSON.stringify(payload, null, 2));
        
        // Merge current user data into payload (legacy logic)
        if (currentUser) {
          // Get toggle states from currentUser (if available)
          const toggles = currentUser._toggles || { userId: true, anonymousId: true };
          console.log('🔀 [EventBuilder] Toggle states:', toggles);
          console.log('🆔 [EventBuilder] anonymousId in currentUser:', !!currentUser.anonymousId, currentUser.anonymousId);
          
          // Only update fields if their toggles are enabled AND they exist in currentUser
          if (toggles.userId && currentUser.userId) {
            payload.userId = currentUser.userId;
            console.log('✅ [EventBuilder] Added userId to payload:', currentUser.userId);
          } else if (!toggles.userId) {
            // Remove userId if toggle is disabled
            delete payload.userId;
            console.log('❌ [EventBuilder] Removed userId from payload (toggle disabled)');
          }
          
          if (toggles.anonymousId && currentUser.anonymousId) {
            payload.anonymousId = currentUser.anonymousId;
            console.log('✅ [EventBuilder] Added anonymousId to payload:', currentUser.anonymousId);
          } else if (!toggles.anonymousId) {
            // Remove anonymousId if toggle is disabled
            delete payload.anonymousId;
            console.log('❌ [EventBuilder] Removed anonymousId from payload (toggle disabled)');
          } else {
            console.log('⚠️ [EventBuilder] anonymousId not added. Toggle enabled:', toggles.anonymousId, 'Value exists:', !!currentUser.anonymousId);
          }
          
          // Update traits object
          if (payload.traits || currentUser.email || currentUser.firstName || currentUser.lastName) {
            payload.traits = payload.traits || {};
            if (currentUser.email) payload.traits.email = currentUser.email;
            if (currentUser.firstName) payload.traits.firstName = currentUser.firstName;
            if (currentUser.lastName) payload.traits.lastName = currentUser.lastName;
            
            // Add custom fields to traits
            Object.keys(currentUser).forEach(key => {
              if (!['userId', 'anonymousId', 'email', 'firstName', 'lastName', '_toggles'].includes(key)) {
                if (currentUser[key]) payload.traits[key] = currentUser[key];
              }
            });
          }
        }
      }
      
      // Reorder payload to ensure userId and anonymousId are first
      const reorderedPayload = reorderPayloadFields(payload);
      const formattedPayload = JSON.stringify(reorderedPayload, null, 2);
      
      // Set both raw and formatted text to the same value initially
      setRawText(formattedPayload);
      setFormattedText(formattedPayload);
      setLastUpdatedFrom('system');
      
      // Send event info to parent component
      const eventInfo = {
        name: selectedEvent.name,
        description: selectedEvent.description
      };
      if (onEventInfoChange) {
        onEventInfoChange(eventInfo);
      }
      
      setIsValid(true);
      setErrorMessage('');
    }
  }, [selectedEvent, currentUser, toggleStatesStr]);

  // Handle user updates for existing payload
  useEffect(() => {
    if (userUpdateTrigger > 0 && (rawText.trim() || formattedText.trim())) {
      try {
        // Use the formatted text as the source of truth for user updates
        const sourceText = formattedText.trim() || rawText.trim();
        const currentPayload = JSON.parse(sourceText);
        let updatedPayload = { ...currentPayload };
        
        // Apply dynamic user identification logic
        if (currentUser) {
          // Get toggle states from currentUser (if available)
          const toggles = currentUser._toggles || { userId: true, anonymousId: true };
          
          // Remove existing userId/anonymousId first
          delete updatedPayload.userId;
          delete updatedPayload.anonymousId;
          
          // Apply userId only if toggle is enabled and value exists
          if (toggles.userId && currentUser.userId && currentUser.userId.trim()) {
            updatedPayload.userId = currentUser.userId.trim();
          }
          
          // Apply anonymousId only if toggle is enabled and value exists
          if (toggles.anonymousId && currentUser.anonymousId && currentUser.anonymousId.trim()) {
            updatedPayload.anonymousId = currentUser.anonymousId.trim();
          }
          
          // Fallback logic only if both toggles are enabled but no values provided
          if (toggles.userId && toggles.anonymousId && 
              (!currentUser.userId || !currentUser.userId.trim()) && 
              (!currentUser.anonymousId || !currentUser.anonymousId.trim())) {
            updatedPayload.userId = "user123"; // Default fallback
          }
          
          // Update traits object if it exists
          if (updatedPayload.traits) {
            if (currentUser.email) updatedPayload.traits.email = currentUser.email;
            if (currentUser.firstName) updatedPayload.traits.firstName = currentUser.firstName;
            if (currentUser.lastName) updatedPayload.traits.lastName = currentUser.lastName;
            
            // Add custom fields to traits
            Object.keys(currentUser).forEach(key => {
              if (!['userId', 'anonymousId', 'email', 'firstName', 'lastName', '_toggles'].includes(key)) {
                if (currentUser[key]) updatedPayload.traits[key] = currentUser[key];
              }
            });
          }
          
          // Update properties object if it exists (for some events that store user data there)
          if (updatedPayload.properties) {
            if (currentUser.email && ('email' in updatedPayload.properties)) {
              updatedPayload.properties.email = currentUser.email;
            }
            if (currentUser.firstName && ('firstName' in updatedPayload.properties)) {
              updatedPayload.properties.firstName = currentUser.firstName;
            }
            if (currentUser.lastName && ('lastName' in updatedPayload.properties)) {
              updatedPayload.properties.lastName = currentUser.lastName;
            }
            
            // Update custom fields that already exist in properties
            Object.keys(currentUser).forEach(key => {
              if (!['userId', 'anonymousId', 'email', 'firstName', 'lastName', '_toggles'].includes(key)) {
                if (currentUser[key] && (key in updatedPayload.properties)) {
                  updatedPayload.properties[key] = currentUser[key];
                }
              }
            });
          }
        }
        
        // Reorder payload to ensure userId and anonymousId are first
        const reorderedPayload = reorderPayloadFields(updatedPayload);
        const formattedPayload = JSON.stringify(reorderedPayload, null, 2);
        
        // Update both raw and formatted text
        setRawText(formattedPayload);
        setFormattedText(formattedPayload);
        setLastUpdatedFrom('system');
        setIsValid(true);
        setErrorMessage('');
      } catch (error) {
        console.error('Error updating payload with user data:', error);
      }
    }
  }, [userUpdateTrigger, currentUser, rawText, formattedText]);

  // Handle raw text input (Event Data section)
  const handleRawTextChange = (e) => {
    const value = e.target.value;
    setRawText(value);
    setLastUpdatedFrom('raw');
    
    // Check if this looks like a Segment analytics method call
    const segmentMethodCall = parseSegmentMethodCall(value, currentUser);
    if (segmentMethodCall) {
      // Convert the analytics call to proper Segment JSON format
      const formattedJSON = JSON.stringify(segmentMethodCall, null, 2);
      setFormattedText(formattedJSON);
      setIsValid(true);
      setErrorMessage('');
      
      // Notify parent of payload change
      if (onEventInfoChange) {
        const eventInfo = {
          payload: segmentMethodCall,
          action: 'method_call_converted'
        };
        onEventInfoChange(eventInfo);
      }
      
      // Extract user data and sync back to CurrentUser
      extractAndSyncUserData(segmentMethodCall);
      return; // Exit early since we converted the method call
    }
    
    // Try to parse as JSON and format
    const validation = validateJSON(value);
    if (validation.isValid) {
      try {
        const parsedPayload = JSON.parse(value);
        const reorderedPayload = reorderPayloadFields(parsedPayload);
        const formattedJSON = JSON.stringify(reorderedPayload, null, 2);
        setFormattedText(formattedJSON);
        setIsValid(true);
        setErrorMessage('');
        
        // Notify parent and sync user data
        notifyPayloadChange(parsedPayload);
        extractAndSyncUserData(parsedPayload);
      } catch (error) {
        // This shouldn't happen if validation passed, but handle it gracefully
        setFormattedText(value);
        setIsValid(false);
        setErrorMessage('Failed to parse JSON');
      }
    } else {
      // Invalid JSON or plain text - just show it in formatted section
      setFormattedText(value);
      setIsValid(false);
      setErrorMessage(validation.error);
    }
  };

  // Handle formatted text input (Formatted Preview section)
  const handleFormattedTextChange = (e) => {
    const value = e.target.value;
    setFormattedText(value);
    setLastUpdatedFrom('formatted');
    
    // Validate JSON
    const validation = validateJSON(value);
    setIsValid(validation.isValid);
    setErrorMessage(validation.error);
    
    if (validation.isValid) {
      try {
        const parsedPayload = JSON.parse(value);
        const reorderedPayload = reorderPayloadFields(parsedPayload);
        
        // Only update raw text if the content actually changed (avoid infinite loops)
        const reFormattedJSON = JSON.stringify(reorderedPayload, null, 2);
        if (reFormattedJSON !== value) {
          setFormattedText(reFormattedJSON);
        }
        
        // Update raw text to match
        setRawText(reFormattedJSON);
        
        // Notify parent and sync user data
        notifyPayloadChange(parsedPayload);
        extractAndSyncUserData(parsedPayload);
      } catch (error) {
        // JSON parsing error - this shouldn't happen if validation passed
        console.error('Error parsing formatted JSON:', error);
      }
    }
  };

  // Handle focus on formatted textarea
  const handleFormattedTextFocus = () => {
    setShowFormattedBorder(true);
  };

  // Handle blur on formatted textarea
  const handleFormattedTextBlur = () => {
    setShowFormattedBorder(false);
  };

  // Helper function to notify parent of payload changes
  const notifyPayloadChange = (parsedPayload) => {
    if (onEventInfoChange) {
      const eventInfo = {
        payload: parsedPayload
      };
      onEventInfoChange(eventInfo);
    }
  };

  // Helper function to extract user data and sync back to CurrentUser
  const extractAndSyncUserData = (parsedPayload) => {
    if (onCurrentUserUpdate && parsedPayload) {
      const extractedUserData = {};
      
      // Extract identifier fields
      if (parsedPayload.userId) extractedUserData.userId = parsedPayload.userId;
      if (parsedPayload.anonymousId) extractedUserData.anonymousId = parsedPayload.anonymousId;
      
      // Extract traits if they exist
      if (parsedPayload.traits && typeof parsedPayload.traits === 'object') {
        Object.keys(parsedPayload.traits).forEach(key => {
          extractedUserData[key] = parsedPayload.traits[key];
        });
      }
      
      // Only update if we found user data
      if (Object.keys(extractedUserData).length > 0) {
        console.log('🔄 [EventBuilder] Extracted user data from payload:', extractedUserData);
        onCurrentUserUpdate(extractedUserData);
      }
    }
  };

  // Copy formatted JSON to clipboard
  const handleCopy = async () => {
    try {
      const textToCopy = formattedText.trim() ? formattedText : formatAsJSON(rawText);
      await navigator.clipboard.writeText(textToCopy);
      
      // Visual feedback
      setCopySuccess(true);
      setShowFormattedBorder(true); // Show border when copying
      setTimeout(() => {
        setCopySuccess(false);
        setShowFormattedBorder(false); // Hide border after a few seconds
      }, 1500);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      alert('Failed to copy to clipboard');
    }
  };

  // Clear event content
  const handleClear = () => {
    setRawText('');
    setFormattedText('');
    setIsValid(true);
    setErrorMessage('');
    setLastUpdatedFrom('system');
    
    // Clear event info and notify parent to clear selectedEvent
    if (onEventInfoChange) {
      onEventInfoChange({
        action: 'clear',
        clearSelectedEvent: true
      });
    }
    
    // Focus back to textarea
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  // Save event to the list
  const handleSave = useCallback(() => {
    const dataToSave = formattedText.trim() || rawText.trim();
    
    if (!dataToSave) {
      alert('Please enter some event data before saving');
      return;
    }

    const validation = validateJSON(dataToSave);
    if (!validation.isValid) {
      alert('Please fix JSON errors before saving:\n' + validation.error);
      return;
    }

    // Process the payload to handle messageId before saving
    const processedPayload = processMessageIdForSegment(dataToSave);
    const processedDataString = JSON.stringify(processedPayload);
    const formattedProcessedData = formatAsJSON(processedDataString);

    // If no source is selected, save one event with all configured sources
    // If a source is selected, save event for that source only
    if (!selectedSource && configuredSources.length > 0) {
      // Create a single event with all configured sources
      const eventData = {
        id: Date.now() + Math.random(),
        timestamp: new Date().toISOString(),
        rawData: processedDataString,
        formattedData: formattedProcessedData,
        // Store all sources in arrays for multi-source support
        writeKeys: configuredSources.map(source => source.settings?.writeKey).filter(Boolean),
        sourceNames: configuredSources.map(source => source.name).filter(Boolean),
        sourceTypes: configuredSources.map(source => source.type).filter(Boolean),
        sources: configuredSources, // Store full source objects for reference
        // Legacy single-source fields for backward compatibility (use first source)
        writeKey: configuredSources[0]?.settings?.writeKey || null,
        sourceName: configuredSources[0]?.name || null,
        sourceType: configuredSources[0]?.type || null
      };
      onSave(eventData);
    } else {
      // Create a single event for the selected source or null if no sources configured
      const sourceToUse = selectedSource || null;
      const eventData = {
        id: Date.now() + Math.random(),
        timestamp: new Date().toISOString(),
        rawData: processedDataString,
        formattedData: formattedProcessedData,
        writeKey: sourceToUse?.settings?.writeKey || null,
        sourceName: sourceToUse?.name || null,
        sourceType: sourceToUse?.type || null
      };
      onSave(eventData);
    }
    
    // Clear both inputs after saving
    setRawText('');
    setFormattedText('');
    setIsValid(true);
    setErrorMessage('');
    setLastUpdatedFrom('system');
    
    // Clear event info and notify parent to clear selectedEvent
    if (onEventInfoChange) {
      onEventInfoChange({
        action: 'clear',
        clearSelectedEvent: true
      });
    }
    
    // Focus back to textarea
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [formattedText, rawText, onSave, selectedSource, configuredSources]);

  // Format display text for the textarea
  // const displayText = rawText ? formatAsJSON(rawText) : '';

  // Handle CSV upload
  const fileInputRef = useRef();
  const handleCSVUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Notify parent that CSV upload is starting to set checkpoint
    if (onCSVUploadStart) {
      onCSVUploadStart();
    }
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      const csvText = evt.target.result;
      const rows = parseCSV(csvText);
      // If no source is selected, create one event per row with all configured sources
      // If a source is selected, create one event per row for that source only
      rows.forEach((row, rowIndex) => {
        // Clear both raw and formatted text
        setRawText('');
        setFormattedText('');
        setLastUpdatedFrom('system');
        
        let rawData;
        let eventWriteKey = null;
        
        // Check if this CSV has "Raw Event Data" column (from downloaded events)
        if (row.rawEventData || row['Raw Event Data']) {
          // Use the raw event data directly
          const rawEventJson = row.rawEventData || row['Raw Event Data'];
          try {
            // Parse and re-stringify to ensure it's valid JSON
            const eventObj = JSON.parse(rawEventJson);
            // Remove messageId if present (Segment generates this)
            delete eventObj.messageId;
            delete eventObj.messageid;
            rawData = JSON.stringify(eventObj);
          } catch (e) {
            console.error('Failed to parse raw event data:', e);
            // Fallback to original behavior
            delete row.messageId;
            delete row.messageid;
            const processedRow = processMessageIdForSegment(row);
            rawData = JSON.stringify(processedRow);
          }
        } else {
          // Original behavior for other CSV formats
          // Remove messageId if present (Segment generates this)
          delete row.messageId;
          delete row.messageid;
          
          // Only use fields that were actually present in the CSV
          // Don't add timestamp if it wasn't in the original data
          // Process the row to move messageId to context if present
          const processedRow = processMessageIdForSegment(row);
          rawData = JSON.stringify(processedRow);
        }

        // Check if the CSV row has a writeKey (from downloaded events)
        if (row.writeKey || row['Write Key']) {
          eventWriteKey = row.writeKey || row['Write Key'];
        }

        // Determine which source(s) to use based on writeKey
        let sourceToUse = null;
        let useAllSources = false;

        if (eventWriteKey) {
          // Find the configured source that matches this writeKey
          sourceToUse = configuredSources.find(source => 
            source.settings?.writeKey === eventWriteKey
          );
          
          if (!sourceToUse) {
            console.warn(`No configured source found for writeKey: ${eventWriteKey}. Using selectedSource instead.`);
            sourceToUse = selectedSource;
          }
        } else {
          // No writeKey provided, use selectedSource or all sources
          if (!selectedSource && configuredSources.length > 0) {
            useAllSources = true;
          } else {
            sourceToUse = selectedSource;
          }
        }

        if (useAllSources) {
          // Create a single event with all configured sources
          const eventData = {
            id: Date.now() + Math.random() + rowIndex,
            rawData,
            formattedData: formatAsJSON(rawData),
            // Store all sources in arrays for multi-source support
            writeKeys: configuredSources.map(source => source.settings?.writeKey).filter(Boolean),
            sourceNames: configuredSources.map(source => source.name).filter(Boolean),
            sourceTypes: configuredSources.map(source => source.type).filter(Boolean),
            sources: configuredSources, // Store full source objects for reference
            // Legacy single-source fields for backward compatibility (use first source)
            writeKey: configuredSources[0]?.settings?.writeKey || null,
            sourceName: configuredSources[0]?.name || null,
            sourceType: configuredSources[0]?.type || null
          };
          onSave(eventData);
        } else {
          // Create a single event for the determined source
          const eventData = {
            id: Date.now() + Math.random() + rowIndex,
            rawData,
            formattedData: formatAsJSON(rawData),
            writeKey: sourceToUse?.settings?.writeKey || null,
            sourceName: sourceToUse?.name || null,
            sourceType: sourceToUse?.type || null
          };
          onSave(eventData);
        }
      });
      
      // Reset file input so same file can be uploaded again if needed
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  // Expose handleSave function to parent components
  useImperativeHandle(ref, () => ({
    saveEvent: handleSave
  }), [handleSave]);

  return (
    <div className="event-builder">
      <div className="event-builder__header">
        <h2 className="event-builder__title">
          {/* <img src="/assets/Tetris.svg" alt="Event Builder" className="event-builder__header-icon" /> */}
          Event Builder
        </h2>
        
        {/* Source status info */}
        {selectedEvent && selectedEvent._editingEventId ? (
          <div className="event-builder__source-status">
            <span className="event-builder__source-status-text">
              Editing Event #{selectedEvent._editingEventId} - Click sources below to add them to this event
            </span>
          </div>
        ) : (
          <>
            {configuredSources.length > 0 && selectedSource && (
              <div className="event-builder__source-status">
                <span className="event-builder__source-status-text">
                  {/* Events will be sent to:  */}
                  Events will be sent to: <strong>{selectedSource.name}</strong>
                  {/* Events will be sent to: <strong>{selectedSource.name}</strong> ({selectedSource.type}) */}
                </span>
              </div>
            )}
            {configuredSources.length > 0 && !selectedSource && (
              <div className="event-builder__source-status">
                <span className="event-builder__source-status-text">
                  Events will be sent to: All configured sources listed below 
                  {/* Events will be sent to: <strong>All configured sources</strong> ({configuredSources.map(s => s.name).join(', ')}) */}
                </span>
              </div>
            )}
          </>
        )}
      </div>
      
      <div className="event-builder__content">
        {/* Tip and Source Row - aligned horizontally */}
        <div className="event-builder__tip-source-row">
          {/* Tip text */}
          <div className="event-builder__tip">
            <p className="event-builder__tip-text">
              <span className="event-builder__tip-title">Tip:</span> Paste any text, analytics method calls (e.g. analytics.identify({})), or JSON and it will be formatted as valid Segment spec JSON. Save to add it to your event list.
            </p>
          </div>
          
          {/* Source selection row */}
          {configuredSources.length > 0 && (
            <div className="event-builder__source-row">
              {/* Source selection indicator - bounces when payload exists but no source selected */}
              {!selectedEvent?._editingEventId && !selectedSource && rawText.trim() && configuredSources.length > 1 && (
                <div className="event-builder__select-source-indicator">
                  <span className="event-builder__select-source-text">
                    Select A Source
                  </span>
                  <span className="event-builder__select-source-arrow">→</span>
                </div>
              )}
              
              {/* Source selection buttons */}
              <div className="event-builder__source-buttons">
                {configuredSources.map((source) => (
                  <button
                    key={source.id}
                    className={`event-builder__source-button ${
                      selectedSource?.id === source.id ? 'event-builder__source-button--active' : ''
                    } ${
                      selectedEvent?._editingEventId ? 'event-builder__source-button--add-mode' : ''
                    }`}
                    onClick={() => handleSourceSelect(source)}
                    title={selectedEvent?._editingEventId 
                      ? `Add ${source.name} to event (WriteKey: ${source.settings.writeKey})`
                      : `WriteKey: ${source.settings.writeKey}`
                    }
                  >
                    {selectedEvent?._editingEventId ? '+ ' : ''}{source.name || source.type}
                  </button>
                ))}
                {!selectedEvent?._editingEventId && selectedSource && (
                  <button
                    className="event-builder__source-button event-builder__source-button--clear"
                    onClick={() => setSelectedSource(null)}
                    title="Clear source selection - events will be sent to all configured sources"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Input and Preview sections side by side */}
        <div className="event-builder__main-section">
          {/* Raw input textarea */}
          <div className="event-builder__input-group">
            <label htmlFor="event-input" className="event-builder__label">
              Event Data (paste Analytics.js calls or JSON here)
            </label>
            <textarea
              id="event-input"
              ref={textareaRef}
              value={rawText}
              onChange={handleRawTextChange}
              placeholder='Enter event data... e.g.: {"userId": "123", "action": "login"} or analytics.identify({nickname: "Grace"})'
              className={`event-builder__textarea ${
                !isValid ? 'event-builder__textarea--error' : ''
              }`}
            />
            
            {/* Error message */}
            {!isValid && errorMessage && (
              <div className="event-builder__error">
                <div className="event-builder__error-title">JSON Error:</div>
                {errorMessage}
              </div>
            )}
          </div>

          {/* Formatted/editable preview */}
          <div className="event-builder__preview-group">
            <label htmlFor="formatted-input" className="event-builder__label">
              Segment JSON (editable)
            </label>
            <textarea
              id="formatted-input"
              ref={formattedTextareaRef}
              value={formattedText}
              onChange={handleFormattedTextChange}
              onFocus={handleFormattedTextFocus}
              onBlur={handleFormattedTextBlur}
              placeholder='Formatted JSON will appear here and can be edited directly'
              className={`event-builder__textarea ${
                showFormattedBorder ? 'event-builder__textarea--formatted' : ''
              } ${
                !isValid ? 'event-builder__textarea--error' : ''
              }`}
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="event-builder__actions" style={{ position: 'relative' }}>
          <div className="event-builder__buttons-group">
            <button
              onClick={handleClear}
              disabled={!rawText.trim() && !formattedText.trim()}
              className="event-builder__button event-builder__button--clear"
            >
              Clear Event
            </button>
            
            <button
              onClick={handleCopy}
              disabled={(!rawText.trim() && !formattedText.trim()) || !isValid}
              className={`event-builder__button event-builder__button--copy ${
                copySuccess ? 'event-builder__button--copy-success' : ''
              }`}
              title="Use the Copy button to copy the JSON payload"
            >
              {copySuccess ? 'Copied!' : 'Copy JSON'}
            </button>
            
                        <button
              onClick={handleSave}
              disabled={(!rawText.trim() && !formattedText.trim()) || !isValid}
              className="event-builder__button event-builder__button--save"
              title="Save this event to the event list on the left."
            >
              Save Event
            </button>

            {/* Upload CSV Button */}
            <input
              type="file"
              accept=".csv"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleCSVUpload}
            />
            <button
              className="event-builder__button event-builder__button--upload"
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              style={{ minWidth: 110 }}
            >
              Upload CSV
            </button>
          </div>

          {/* Event Info Display */}
          <div className="event-builder__event-info-display">
            {/* Event Description */}
            {selectedEvent && (
              <div className="event-builder__event-info">
                <h4 className="event-builder__event-name">{selectedEvent.name}</h4>
                <p className="event-builder__event-description">{selectedEvent.description}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export default EventBuilder;