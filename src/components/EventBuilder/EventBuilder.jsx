import React, { useState, useRef, useEffect } from 'react';
import { formatAsJSON, validateJSON } from '../../utils/jsonUtils';

import { getStoredSourceConfig } from '../../utils/segmentAPI';
import { parseCSV } from '../../utils/parseCSV';

import './EventBuilder.css';



// Utility to clean up CSV row keys/values and convert to Segment event spec
function cleanCSVRowToSegmentEvent(row) {
  const cleaned = {};
  for (let key in row) {
    // Remove extra quotes from keys and values
    let cleanKey = key.replace(/^"+|"+$/g, '').replace(/^'+|'+$/g, '').replace(/\\"/g, '');
    let value = row[key];
    if (typeof value === 'string') {
      value = value.replace(/^"+|"+$/g, '').replace(/^'+|'+$/g, '');
      // Replace equals before curly brace with colon (for malformed JSON)
      value = value.replace(/=\s*([\{\[])/g, ':$1');
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



const EventBuilder = ({ onSave, selectedEvent, currentUser, onEventInfoChange, userUpdateTrigger }) => {
  const [rawText, setRawText] = useState('');
  const [isValid, setIsValid] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [selectedSource, setSelectedSource] = useState(null);
  const [configuredSources, setConfiguredSources] = useState([]);
  const textareaRef = useRef(null);
  
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
    // Auto-select if only one source is available
    if (sourcesWithWriteKeys.length === 1) {
      setSelectedSource(sourcesWithWriteKeys[0]);
    }
  }, []);

  // Handle source selection
  const handleSourceSelect = (source) => {
    setSelectedSource(source);
  };

  // Load selected event when it changes
  useEffect(() => {
    if (selectedEvent) {
      // Check if payload is a function (new format) or object (old format)
      let payload;
      if (typeof selectedEvent.payload === 'function') {
        // New format: payload is a function that takes currentUser
        payload = selectedEvent.payload(currentUser);
      } else {
        // Old format: payload is an object (fallback for compatibility)
        payload = { ...selectedEvent.payload };
        
        // Merge current user data into payload (legacy logic)
        if (currentUser) {
          // Get toggle states from currentUser (if available)
          const toggles = currentUser._toggles || { userId: true, anonymousId: true };
          
          // Only update fields if their toggles are enabled AND they have values
          if (toggles.userId && currentUser.userId) {
            payload.userId = currentUser.userId;
          } else if (!toggles.userId) {
            // Remove userId if toggle is disabled
            delete payload.userId;
          }
          
          if (toggles.anonymousId && currentUser.anonymousId) {
            payload.anonymousId = currentUser.anonymousId;
          } else if (!toggles.anonymousId) {
            // Remove anonymousId if toggle is disabled
            delete payload.anonymousId;
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
      setRawText(formattedPayload);
      
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
    if (userUpdateTrigger > 0 && rawText.trim()) {
      try {
        const currentPayload = JSON.parse(rawText);
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
        setRawText(formattedPayload);
        setIsValid(true);
        setErrorMessage('');
      } catch (error) {
        console.error('Error updating payload with user data:', error);
      }
    }
  }, [userUpdateTrigger, currentUser, rawText]);

  // Handle text input and format as JSON
  const handleTextChange = (e) => {
    const value = e.target.value;
    setRawText(value);
    
    // Validate and format JSON
    const validation = validateJSON(value);
    setIsValid(validation.isValid);
    setErrorMessage(validation.error);
    
    // If valid JSON, notify parent of payload change
    if (validation.isValid && onEventInfoChange) {
      try {
        const parsedPayload = JSON.parse(value);
        const eventInfo = {
          payload: parsedPayload
        };
        onEventInfoChange(eventInfo);
      } catch (error) {
        // JSON parsing error - ignore for now since validation already handles this
      }
    }
  };

  // Copy formatted JSON to clipboard
  const handleCopy = async () => {
    try {
      const formattedJSON = formatAsJSON(rawText);
      await navigator.clipboard.writeText(formattedJSON);
      
      // Visual feedback
      setCopySuccess(true);
      setTimeout(() => {
        setCopySuccess(false);
      }, 1500);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      alert('Failed to copy to clipboard');
    }
  };

  // Save event to the list
  const handleSave = () => {
    if (!rawText.trim()) {
      alert('Please enter some event data before saving');
      return;
    }

    const validation = validateJSON(rawText);
    if (!validation.isValid) {
      alert('Please fix JSON errors before saving:\n' + validation.error);
      return;
    }

    const eventData = {
      id: Date.now() + Math.random(), // Simple unique ID
      timestamp: new Date().toISOString(),
      rawData: rawText.trim(),
      formattedData: formatAsJSON(rawText),
      // Include selected source writeKey if available
      writeKey: selectedSource?.settings?.writeKey || null,
      sourceName: selectedSource?.name || null,
      sourceType: selectedSource?.type || null
    };

    onSave(eventData);
    
    // Clear the input after saving
    setRawText('');
    setIsValid(true);
    setErrorMessage('');
    
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

  // Format display text for the textarea
  const displayText = rawText ? formatAsJSON(rawText) : '';

  // Handle CSV upload
  const fileInputRef = useRef();
  const handleCSVUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const csvText = evt.target.result;
      const rows = parseCSV(csvText);
      rows.forEach((row) => {
        // Remove messageId if present (camelCase or any variant)
        delete row.messageId;
        delete row.messageid;
        // row is now camelCase and context/properties/traits are objects
        const rawData = JSON.stringify(row);
        const eventData = {
          id: Date.now() + Math.random(),
          timestamp: row.timestamp || new Date().toISOString(),
          rawData,
          formattedData: formatAsJSON(rawData),
          writeKey: selectedSource?.settings?.writeKey || null,
          sourceName: selectedSource?.name || null,
          sourceType: selectedSource?.type || null
        };
        onSave(eventData);
      });
      // Reset file input so same file can be uploaded again if needed
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="event-builder">
      <div className="event-builder__header">
        <h2 className="event-builder__title">Event Builder</h2>
        {/* Source selection buttons */}
        {configuredSources.length > 0 && (
          <div className="event-builder__source-buttons">
            {configuredSources.map((source) => (
              <button
                key={source.id}
                className={`event-builder__source-button ${
                  selectedSource?.id === source.id ? 'event-builder__source-button--active' : ''
                }`}
                onClick={() => handleSourceSelect(source)}
                title={`WriteKey: ${source.settings.writeKey}`}
              >
                {source.type}
              </button>
            ))}
            {selectedSource && (
              <button
                className="event-builder__source-button event-builder__source-button--clear"
                onClick={() => setSelectedSource(null)}
                title="Clear source selection"
              >
                ×
              </button>
            )}
          </div>
        )}
      </div>
      
      <div className="event-builder__content">
        {/* Tip text */}
        <div className="event-builder__tip">
          <p className="event-builder__tip-text">
            <span className="event-builder__tip-title">Tip:</span> Paste any text and it will be formatted as valid JSON. 
            Use the Copy button to copy the formatted version, or Save to add it to your event list.
          </p>
        </div>

        {/* Input and Preview sections side by side */}
        <div className="event-builder__main-section">
          {/* Input textarea */}
          <div className="event-builder__input-group">
            <label htmlFor="event-input" className="event-builder__label">
              Event Data (will be formatted as JSON)
            </label>
            <textarea
              id="event-input"
              ref={textareaRef}
              value={rawText}
              onChange={handleTextChange}
              placeholder='Enter event data... e.g.: {"userId": "123", "action": "login", "timestamp": "2024-01-01"}'
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

          {/* Formatted preview */}
          <div className="event-builder__preview-group">
            <label className="event-builder__label">
              Formatted Preview
            </label>
            <div className="event-builder__preview">
              <pre className="event-builder__preview-content">
                {rawText && isValid ? displayText : (rawText ? 'Fix JSON errors to see preview' : 'Preview will appear here')}
              </pre>
            </div>
          </div>
        </div>

        {/* Action buttons */}
  <div className="event-builder__actions" style={{ position: 'relative' }}>
          <div className="event-builder__buttons-group">
            <button
              onClick={handleCopy}
              disabled={!rawText.trim() || !isValid}
              className={`event-builder__button event-builder__button--copy ${
                copySuccess ? 'event-builder__button--copy-success' : ''
              }`}
            >
              {copySuccess ? 'Copied!' : 'Copy JSON'}
            </button>
            
            <button
              onClick={handleSave}
              disabled={!rawText.trim() || !isValid}
              className="event-builder__button event-builder__button--save"
            >
              Save Event
            </button>

            {/* Upload CSV Button */}
            <div style={{ position: 'absolute', right: 0, bottom: 0 }}>
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
};

export default EventBuilder;