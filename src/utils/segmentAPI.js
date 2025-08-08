/**
 * Segment HTTP Tracking API Integration
 * 
 * This module provides functions to send events to Segment's HTTP Tracking API
 * using writeKey authentication as specified in the Segment documentation.
 */

const SEGMENT_API_BASE_URL = 'https://api.segment.io/v1';

/**
 * Send a track event to Segment
 * @param {string} writeKey - The Segment writeKey for authentication
 * @param {object} payload - The event payload
 * @returns {Promise<object>} - API response
 */
export const sendTrackEvent = async (writeKey, payload) => {
  return await sendToSegment(writeKey, 'track', payload);
};

/**
 * Send an identify event to Segment
 * @param {string} writeKey - The Segment writeKey for authentication
 * @param {object} payload - The event payload
 * @returns {Promise<object>} - API response
 */
export const sendIdentifyEvent = async (writeKey, payload) => {
  return await sendToSegment(writeKey, 'identify', payload);
};

/**
 * Send a page event to Segment
 * @param {string} writeKey - The Segment writeKey for authentication
 * @param {object} payload - The event payload
 * @returns {Promise<object>} - API response
 */
export const sendPageEvent = async (writeKey, payload) => {
  return await sendToSegment(writeKey, 'page', payload);
};

/**
 * Send a screen event to Segment
 * @param {string} writeKey - The Segment writeKey for authentication
 * @param {object} payload - The event payload
 * @returns {Promise<object>} - API response
 */
export const sendScreenEvent = async (writeKey, payload) => {
  return await sendToSegment(writeKey, 'screen', payload);
};

/**
 * Send a group event to Segment
 * @param {string} writeKey - The Segment writeKey for authentication
 * @param {object} payload - The event payload
 * @returns {Promise<object>} - API response
 */
export const sendGroupEvent = async (writeKey, payload) => {
  return await sendToSegment(writeKey, 'group', payload);
};

/**
 * Send an alias event to Segment
 * @param {string} writeKey - The Segment writeKey for authentication
 * @param {object} payload - The event payload
 * @returns {Promise<object>} - API response
 */
export const sendAliasEvent = async (writeKey, payload) => {
  return await sendToSegment(writeKey, 'alias', payload);
};

/**
 * Send a batch of events to Segment
 * @param {string} writeKey - The Segment writeKey for authentication
 * @param {Array} batch - Array of event objects
 * @returns {Promise<object>} - API response
 */
export const sendBatchEvents = async (writeKey, batch) => {
  const url = `${SEGMENT_API_BASE_URL}/batch`;
  
  const requestBody = {
    batch: batch
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${btoa(writeKey + ':')}`
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Segment API error: ${response.status} - ${errorText}`);
  }

  return await response.json();
};

/**
 * Core function to send individual events to Segment
 * @private
 * @param {string} writeKey - The Segment writeKey for authentication
 * @param {string} endpoint - The API endpoint (track, identify, page, etc.)
 * @param {object} payload - The event payload
 * @returns {Promise<object>} - API response
 */
const sendToSegment = async (writeKey, endpoint, payload) => {
  const url = `${SEGMENT_API_BASE_URL}/${endpoint}`;

  // Add timestamp if not provided
  if (!payload.timestamp) {
    payload.timestamp = new Date().toISOString();
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${btoa(writeKey + ':')}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Segment API error: ${response.status} - ${errorText}`);
  }

  return await response.json();
};

/**
 * Validate a Segment writeKey format
 * @param {string} writeKey - The writeKey to validate
 * @returns {boolean} - Whether the writeKey format is valid
 */
export const validateWriteKey = (writeKey) => {
  // Segment writeKeys are typically alphanumeric strings
  return typeof writeKey === 'string' && 
         writeKey.length > 0 && 
         /^[a-zA-Z0-9]+$/.test(writeKey);
};

/**
 * Get writeKey from environment or local storage
 * @returns {string|null} - The stored writeKey or null if not found
 */
export const getStoredWriteKey = () => {
  // Try to get from environment variables first
  if (process.env.REACT_APP_SEGMENT_WRITE_KEY) {
    return process.env.REACT_APP_SEGMENT_WRITE_KEY;
  }
  
  // Fall back to localStorage for development
  return localStorage.getItem('segment_write_key');
};

/**
 * Save writeKey to localStorage and .env file (for development purposes)
 * @param {string} writeKey - The writeKey to store
 */
export const saveWriteKey = async (writeKey) => {
  localStorage.setItem('segment_write_key', writeKey);
  
  // Also save to server .env file
  try {
    await fetch('/api/config/writekey', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ writeKey })
    });
  } catch (error) {
    console.warn('Failed to save writeKey to server:', error);
  }
};

/**
 * Convert an event from the app format to Segment format
 * @param {object} event - Event in app format
 * @returns {object} - Event in Segment format
 */
export const convertToSegmentFormat = (event) => {
  // The event from EventBuilder has rawData as JSON string
  let segmentEvent;
  
  try {
    // Parse the rawData JSON string to get the actual event payload
    segmentEvent = JSON.parse(event.rawData);
    
    // Add timestamp if not already present
    if (!segmentEvent.timestamp) {
      segmentEvent.timestamp = event.timestamp || new Date().toISOString();
    }
    
    return segmentEvent;
  } catch (error) {
    // Fallback if rawData is not valid JSON
    throw new Error(`Invalid event data format: ${error.message}`);
  }
};

/**
 * Send events from the app's event list to Segment
 * @param {Array} events - Array of events from the app
 * @param {string} writeKey - The Segment writeKey
 * @param {boolean} useBatch - Whether to send as batch or individual events
 * @returns {Promise<Array>} - Array of API responses
 */
export const sendAppEventsToSegment = async (events, writeKey, useBatch = true) => {
  if (!validateWriteKey(writeKey)) {
    throw new Error('Invalid writeKey provided');
  }

  if (!events || events.length === 0) {
    throw new Error('No events to send');
  }

  if (useBatch) {
    // Convert all events and send as batch
    const batch = events.map(convertToSegmentFormat);
    return [await sendBatchEvents(writeKey, batch)];
  } else {
    // Send individual events
    const results = [];
    for (const event of events) {
      const segmentEvent = convertToSegmentFormat(event);
      let result;
      
      // Use the type from the converted segmentEvent
      const eventType = segmentEvent.type;
      
      switch (eventType) {
        case 'track':
          result = await sendTrackEvent(writeKey, segmentEvent);
          break;
        case 'identify':
          result = await sendIdentifyEvent(writeKey, segmentEvent);
          break;
        case 'page':
          result = await sendPageEvent(writeKey, segmentEvent);
          break;
        case 'screen':
          result = await sendScreenEvent(writeKey, segmentEvent);
          break;
        case 'group':
          result = await sendGroupEvent(writeKey, segmentEvent);
          break;
        case 'alias':
          result = await sendAliasEvent(writeKey, segmentEvent);
          break;
        default:
          throw new Error(`Unsupported event type: ${eventType}`);
      }
      
      results.push(result);
    }
    
    return results;
  }
};

/**
 * Save source configuration to localStorage and server
 * @param {object} sources - Array of source configurations
 */
export const saveSourceConfig = async (sources) => {
  // Save to localStorage
  localStorage.setItem('segment_sources_config', JSON.stringify(sources));
  
  // Send to server
  try {
    await fetch('/api/config/sources', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sources })
    });
  } catch (error) {
    console.warn('Failed to save source config to server:', error);
  }
};

/**
 * Get stored source configuration
 * @returns {array} - Array of source configurations
 */
export const getStoredSourceConfig = () => {
  const stored = localStorage.getItem('segment_sources_config');
  return stored ? JSON.parse(stored) : [];
};
