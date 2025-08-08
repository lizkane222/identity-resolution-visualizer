/**
 * Event simulation utilities for processing events in sequence
 */

/**
 * Simulates processing events in sequence with configurable timeout
 * @param {Array} events - Array of event objects
 * @param {number} timeoutMs - Timeout between events in milliseconds
 * @param {Function} onProgress - Callback for each successful event (eventIndex, event, result)
 * @param {Function} onError - Callback for errors (eventIndex, event, error)
 * @returns {Promise<Array>} - Array of results from all events
 */
export const simulateEvents = async (events, timeoutMs = 1000, onProgress, onError) => {
  const results = [];
  
  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    
    try {
      // Simulate processing the event
      const result = await processEvent(event, i);
      
      results.push(result);
      
      // Call progress callback if provided
      if (onProgress) {
        onProgress(i, event, result);
      }
      
      // Wait before processing next event (except for the last one)
      if (i < events.length - 1) {
        await sleep(timeoutMs);
      }
      
    } catch (error) {
      // Call error callback if provided
      if (onError) {
        onError(i, event, error);
      }
      
      // Continue with next event even if current one fails
      results.push({ error: error.message, eventIndex: i });
    }
  }
  
  return results;
};

/**
 * Processes a single event (simulates actual event processing)
 * @param {Object} event - Event object to process
 * @param {number} index - Index of the event in the sequence
 * @returns {Promise<Object>} - Processing result
 */
const processEvent = async (event, index) => {
  // Simulate processing time (random between 100-500ms)
  const processingTime = Math.random() * 400 + 100;
  await sleep(processingTime);
  
  // Parse the event data
  let parsedEventData;
  try {
    parsedEventData = JSON.parse(event.rawData);
  } catch (error) {
    throw new Error(`Invalid JSON in event ${index + 1}: ${error.message}`);
  }
  
  // Simulate different types of event processing based on event content
  const result = await simulateEventProcessing(parsedEventData, index);
  
  return {
    eventId: event.id,
    eventIndex: index,
    processedAt: new Date().toISOString(),
    processingTime: Math.round(processingTime),
    originalData: parsedEventData,
    result: result,
    status: 'completed'
  };
};

/**
 * Simulates actual event processing logic based on event content
 * @param {Object} eventData - Parsed event data
 * @param {number} index - Event index
 * @returns {Promise<Object>} - Processing result
 */
const simulateEventProcessing = async (eventData, index) => {
  // Simulate different processing scenarios based on event type or content
  
  // Check if this is a user-related event
  if (eventData.userId || eventData.user_id || eventData.userID) {
    return simulateUserEvent(eventData);
  }
  
  // Check if this is a transaction event
  if (eventData.transactionId || eventData.transaction_id || eventData.amount) {
    return simulateTransactionEvent(eventData);
  }
  
  // Check if this is a system event
  if (eventData.system || eventData.service || eventData.application) {
    return simulateSystemEvent(eventData);
  }
  
  // Check if this is an error event
  if (eventData.error || eventData.exception || eventData.level === 'error') {
    return simulateErrorEvent(eventData);
  }
  
  // Default generic processing
  return simulateGenericEvent(eventData, index);
};

/**
 * Simulates processing a user-related event
 * @param {Object} eventData - Event data
 * @returns {Object} - Processing result
 */
const simulateUserEvent = (eventData) => {
  const userId = eventData.userId || eventData.user_id || eventData.userID;
  const action = eventData.action || eventData.event_type || 'unknown';
  
  return {
    type: 'user_event',
    userId: userId,
    action: action,
    processed: true,
    identityResolved: true,
    matchConfidence: Math.random() * 0.3 + 0.7, // 70-100% confidence
    attributes: {
      lastSeen: new Date().toISOString(),
      eventCount: Math.floor(Math.random() * 100) + 1,
      riskScore: Math.random() * 0.4 + 0.1 // Low to medium risk
    }
  };
};

/**
 * Simulates processing a transaction event
 * @param {Object} eventData - Event data
 * @returns {Object} - Processing result
 */
const simulateTransactionEvent = (eventData) => {
  const amount = eventData.amount || Math.random() * 1000;
  const transactionId = eventData.transactionId || eventData.transaction_id || `txn_${Date.now()}`;
  
  return {
    type: 'transaction_event',
    transactionId: transactionId,
    amount: amount,
    processed: true,
    fraudCheck: {
      riskLevel: amount > 500 ? 'medium' : 'low',
      score: Math.random(),
      flags: amount > 1000 ? ['high_amount'] : []
    },
    identityVerification: {
      verified: Math.random() > 0.1, // 90% success rate
      method: 'biometric'
    }
  };
};

/**
 * Simulates processing a system event
 * @param {Object} eventData - Event data
 * @returns {Object} - Processing result
 */
const simulateSystemEvent = (eventData) => {
  const service = eventData.service || eventData.system || eventData.application || 'unknown';
  
  return {
    type: 'system_event',
    service: service,
    processed: true,
    healthCheck: {
      status: 'healthy',
      responseTime: Math.floor(Math.random() * 100) + 50,
      memoryUsage: Math.random() * 0.8 + 0.1 // 10-90%
    },
    metrics: {
      cpu: Math.random() * 0.6 + 0.2, // 20-80%
      disk: Math.random() * 0.4 + 0.1  // 10-50%
    }
  };
};

/**
 * Simulates processing an error event
 * @param {Object} eventData - Event data
 * @returns {Object} - Processing result
 */
const simulateErrorEvent = (eventData) => {
  // Simulate occasional processing failures for error events
  if (Math.random() < 0.15) { // 15% chance of processing failure
    throw new Error(`Failed to process error event: ${eventData.error || 'Unknown error'}`);
  }
  
  return {
    type: 'error_event',
    processed: true,
    severity: eventData.level || 'error',
    acknowledged: true,
    resolution: {
      status: 'investigating',
      assignedTo: 'on-call-engineer',
      estimatedResolution: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 min from now
    }
  };
};

/**
 * Simulates processing a generic event
 * @param {Object} eventData - Event data
 * @param {number} index - Event index
 * @returns {Object} - Processing result
 */
const simulateGenericEvent = (eventData, index) => {
  return {
    type: 'generic_event',
    processed: true,
    eventIndex: index,
    dataPoints: Object.keys(eventData).length,
    classification: {
      category: 'general',
      confidence: Math.random() * 0.5 + 0.5, // 50-100%
      tags: ['processed', 'categorized']
    },
    enrichment: {
      timestamp: new Date().toISOString(),
      source: 'event_processor',
      version: '1.0.0'
    }
  };
};

/**
 * Utility function to create a delay
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} - Resolves after the specified time
 */
const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Cancellable event simulation for cases where you need to stop mid-process
 * @param {Array} events - Array of event objects
 * @param {number} timeoutMs - Timeout between events
 * @param {Function} onProgress - Progress callback
 * @param {Function} onError - Error callback
 * @param {Object} cancelToken - Object with cancelled property to check
 * @returns {Promise<Array>} - Results array
 */
export const simulateEventsWithCancellation = async (
  events, 
  timeoutMs, 
  onProgress, 
  onError, 
  cancelToken = { cancelled: false }
) => {
  const results = [];
  
  for (let i = 0; i < events.length; i++) {
    // Check for cancellation before processing each event
    if (cancelToken.cancelled) {
      throw new Error('Event simulation was cancelled');
    }
    
    const event = events[i];
    
    try {
      const result = await processEvent(event, i);
      results.push(result);
      
      if (onProgress) {
        onProgress(i, event, result);
      }
      
      // Check for cancellation before sleeping
      if (i < events.length - 1 && !cancelToken.cancelled) {
        await sleep(timeoutMs);
      }
      
    } catch (error) {
      if (onError) {
        onError(i, event, error);
      }
      results.push({ error: error.message, eventIndex: i });
    }
  }
  
  return results;
};