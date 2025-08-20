import React, { useState, useEffect } from 'react';
import UniqueProfilesList from '../UniqueProfilesList/UniqueProfilesList.jsx';
import './ProfileLookup.css';

const ProfileLookup = ({ 
  identifierOptions = [], 
  events = [], 
  onHighlightEvents,
  profileApiResults = {},
  onProfileApiResultsUpdate,
  onClearProfiles,
  onAddEventToList
}) => {
  const [selectedIdentifiers, setSelectedIdentifiers] = useState([]);
  const [customIdentifiers, setCustomIdentifiers] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingValue, setEditingValue] = useState('');
  const [selectedEndpoints, setSelectedEndpoints] = useState(['external_ids']);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState({});
  const [errors, setErrors] = useState({});
  const [isConfigured, setIsConfigured] = useState(false);
  const [activeRequests, setActiveRequests] = useState(new Map()); // Track active requests per identifier
  const [copyAnimation, setCopyAnimation] = useState({ show: false, x: 0, y: 0 }); // Copy animation state

  // Query parameters for different endpoints
  const [queryParams, setQueryParams] = useState({
    limit: 10,
    include: '',
    class: '',
    verbose: false,
    next: ''
  });

  useEffect(() => {
    checkConfiguration();
  }, []);

  const checkConfiguration = async () => {
    try {
      const response = await fetch('http://localhost:8888/api/config');
      const config = await response.json();
      setIsConfigured(config.hasToken && config.spaceId);
    } catch (error) {
      console.error('Error checking configuration:', error);
      setIsConfigured(false);
    }
  };

  // Cancel all requests for a specific identifier
  const cancelRequestsForIdentifier = (identifier) => {
    const requestsToCancel = [];
    activeRequests.forEach((controller, key) => {
      if (key.startsWith(identifier + '_')) {
        controller.abort();
        requestsToCancel.push(key);
      }
    });
    
    // Remove cancelled requests from activeRequests
    setActiveRequests(prev => {
      const updated = new Map(prev);
      requestsToCancel.forEach(key => updated.delete(key));
      return updated;
    });

    // Clear errors for cancelled requests
    setErrors(prev => {
      const updated = { ...prev };
      requestsToCancel.forEach(key => {
        delete updated[key];
      });
      return updated;
    });

    console.log(`🚫 [Profile API] Cancelled ${requestsToCancel.length} requests for identifier: ${identifier}`);
  };

  // Cancel all active requests
  const cancelAllRequests = () => {
    activeRequests.forEach((controller) => {
      controller.abort();
    });
    
    setActiveRequests(new Map());
    setIsLoading(false);
    setErrors({});
    
    console.log(`🚫 [Profile API] Cancelled all ${activeRequests.size} active requests`);
  };

  const handleLookup = async () => {
    // Get all selected identifiers (both predefined and custom)
    const allIdentifiers = [...identifierOptions, ...customIdentifiers];
    const identifiersToProcess = allIdentifiers.filter(id => selectedIdentifiers.includes(id));
    
    if (identifiersToProcess.length === 0) {
      setErrors({ general: 'Please select or enter at least one profile identifier' });
      return;
    }

    if (selectedEndpoints.length === 0) {
      setErrors({ general: 'Please select at least one endpoint' });
      return;
    }

    setIsLoading(true);
    setErrors({});
    setResults({});

    const newResults = {};
    const newErrors = {};

    // Make requests for each identifier and each selected endpoint
    // Also automatically include metadata endpoint in background
    await Promise.all(
      identifiersToProcess.flatMap(identifier => {
        const endpointsToFetch = [...selectedEndpoints];
        
        // Always include metadata endpoint in background (if not already selected)
        if (!endpointsToFetch.includes('metadata')) {
          endpointsToFetch.push('metadata');
        }
        
        return endpointsToFetch.map(async (endpoint) => {
          try {
            const params = new URLSearchParams();
            // Add relevant query parameters based on endpoint
            if (endpoint === 'traits' || endpoint === 'external_ids') {
              if (queryParams.limit) params.append('limit', queryParams.limit);
              if (queryParams.include) params.append('include', queryParams.include);
              if (queryParams.verbose) params.append('verbose', 'true');
              if (endpoint === 'traits' && queryParams.class) {
                params.append('class', queryParams.class);
              }
            }
            if (endpoint === 'events' || endpoint === 'links') {
              if (queryParams.limit) params.append('limit', queryParams.limit);
              if (queryParams.next) params.append('next', queryParams.next);
            }

            const queryString = params.toString() ? `?${params.toString()}` : '';
            
            // For identifiers with colons (like user_id:12345), we need to encode them properly
            // encodeURIComponent encodes : as %3A, which Express will decode back to : 
            // The server will then re-encode it for the Segment API
            const encodedIdentifier = encodeURIComponent(identifier);
            const url = `http://localhost:8888/api/profiles/${encodedIdentifier}/${endpoint}${queryString}`;
            
            // Create AbortController for this specific request
            const controller = new AbortController();
            const requestKey = `${identifier}_${endpoint}`;
            
            // Track this request
            setActiveRequests(prev => new Map(prev).set(requestKey, controller));
            
            // Enhanced retry logic for both 404 (profile doesn't exist) and empty traits
            let response, data;
            let retryCount = 0;
            let maxRetries, retryDelay;
            
            // Set retry parameters based on conditions
            if (endpoint === 'traits') {
              maxRetries = 3; // For empty traits response
              retryDelay = 2000; // 2 seconds
            } else {
              maxRetries = 1; // Default for other endpoints
              retryDelay = 0;
            }
            
            // Special handling for 404 errors - retry every 15 seconds
            let is404Retry = false;
            let profileNotFoundStartTime = null;
            const maxProfileWaitTime = 5 * 60 * 1000; // 5 minutes max wait for profile creation
            const profileRetryDelay = 15000; // 15 seconds for 404 retries
            
            // For events endpoint pagination - collect all pages
            let allData = null;
            let currentCursor = queryParams.next || '';
            let paginationCount = 0;
            const maxPaginationPages = 50; // Safety limit to prevent infinite loops
            
            do {
              // Update URL with current cursor for pagination
              let currentUrl = url;
              if (endpoint === 'events' && currentCursor && paginationCount > 0) {
                const urlObj = new URL(url);
                urlObj.searchParams.set('next', currentCursor);
                currentUrl = urlObj.toString();
              }
              
              response = await fetch(currentUrl, { signal: controller.signal });
              data = await response.json();
              
              // Get the actual Segment API endpoint from the server response
              const segmentEndpoint = data._segmentApiEndpoint || `https://profiles.segment.com/v1/spaces/{space_id}/collections/users/profiles/${identifier}/${endpoint}${queryString}`;
              
              // Single comprehensive log per request
              console.log(`📡 [Profile API] ${endpoint.toUpperCase()} Request${paginationCount > 0 ? ` (Page ${paginationCount + 1})` : ''}:`, {
                identifier: identifier,
                segmentEndpoint: segmentEndpoint,
                status: `${response.status} ${response.statusText}`,
                responseBody: data,
                cursor: data.cursor || null,
                timestamp: new Date().toISOString()
              });
              
              // Handle 404 errors - profile doesn't exist yet
              if (response.status === 404) {
                const errorKey = `${identifier}_${endpoint}`;
                if (!profileNotFoundStartTime) {
                  profileNotFoundStartTime = Date.now();
                  console.warn(`⏳ [Profile API] Profile not found for: ${identifier}/${endpoint}. Starting 15-second retry cycle...`);
                  // Set error message immediately for user feedback - this will show in UI
                  newErrors[errorKey] = {
                    type: 'profile_not_found',
                    message: 'The profile does not yet exist. Unify can take time to create and resolve profiles. Please wait while we keep sending this request until the profile\'s data is received.',
                    startTime: profileNotFoundStartTime,
                    retryCount: 0,
                    identifier: identifier,
                    endpoint: endpoint
                  };
                  // Update the state immediately so user sees the message
                  setErrors(prev => ({ ...prev, [errorKey]: newErrors[errorKey] }));
                }
                
                const elapsedTime = Date.now() - profileNotFoundStartTime;
                if (elapsedTime < maxProfileWaitTime) {
                  // Update error message with retry count and show in UI
                  const updatedError = {
                    type: 'profile_not_found',
                    message: 'The profile does not yet exist. Unify can take time to create and resolve profiles. Please wait while we keep sending this request until the profile\'s data is received.',
                    startTime: profileNotFoundStartTime,
                    retryCount: Math.floor(elapsedTime / profileRetryDelay) + 1,
                    nextRetryIn: profileRetryDelay,
                    identifier: identifier,
                    endpoint: endpoint
                  };
                  newErrors[errorKey] = updatedError;
                  setErrors(prev => ({ ...prev, [errorKey]: updatedError }));
                  
                  await new Promise(resolve => setTimeout(resolve, profileRetryDelay));
                  is404Retry = true;
                  continue;
                } else {
                  console.error(`⏰ [Profile API] Profile creation timeout for: ${identifier}/${endpoint} after ${Math.floor(maxProfileWaitTime/1000)} seconds`);
                  newErrors[errorKey] = {
                    type: 'profile_timeout',
                    message: `Profile was not found after waiting ${Math.floor(maxProfileWaitTime/60000)} minutes. The profile may not exist or Unify may be experiencing delays.`,
                    totalWaitTime: elapsedTime,
                    identifier: identifier,
                    endpoint: endpoint
                  };
                  break;
                }
              }
              // Handle successful response
              else if (response.ok) {
                const errorKey = `${identifier}_${endpoint}`;
                // Clear any previous 404 error for this identifier/endpoint immediately in UI
                if (newErrors[errorKey]?.type === 'profile_not_found') {
                  delete newErrors[errorKey];
                  setErrors(prev => {
                    const updated = { ...prev };
                    delete updated[errorKey];
                    return updated;
                  });
                }
                
                // Handle pagination for events endpoint
                if (endpoint === 'events' && data.cursor?.has_more && paginationCount < maxPaginationPages) {
                  // First page - initialize allData
                  if (allData === null) {
                    allData = { ...data };
                    // Ensure data property exists and is an array
                    if (!allData.data) {
                      allData.data = [];
                    }
                    // Convert to array if it's not already
                    if (!Array.isArray(allData.data)) {
                      allData.data = [allData.data];
                    }
                  } else {
                    // Subsequent pages - merge data
                    if (data.data) {
                      const newEvents = Array.isArray(data.data) ? data.data : [data.data];
                      allData.data = allData.data.concat(newEvents);
                    }
                    // Update cursor info
                    allData.cursor = data.cursor;
                  }
                  
                  // Check if we need to fetch more pages
                  if (data.cursor?.has_more && data.cursor?.next) {
                    currentCursor = data.cursor.next;
                    paginationCount++;
                    console.log(`📄 [Profile API] Fetching next page for ${identifier}/events (Page ${paginationCount + 1}, Cursor: ${currentCursor.substring(0, 20)}...)`);
                    continue; // Continue the do-while loop to fetch next page
                  } else {
                    // No more pages or missing cursor data
                    data = allData; // Use the combined data
                    console.log(`✅ [Profile API] Completed pagination for ${identifier}/events (${paginationCount + 1} total pages, ${allData.data.length} total events)`);
                  }
                } else if (endpoint === 'events' && paginationCount >= maxPaginationPages) {
                  // Hit pagination limit - use what we have and warn user
                  data = allData || data;
                  console.warn(`⚠️ [Profile API] Pagination limit reached for ${identifier}/events (${maxPaginationPages} pages). Some events may not be included.`);
                  // Add a warning to the data object
                  data._paginationWarning = `Reached maximum pagination limit of ${maxPaginationPages} pages. Some events may not be included.`;
                } else if (endpoint === 'events' && paginationCount === 0) {
                  // Single page response for events endpoint
                  allData = data;
                }
                
                // If traits endpoint returns empty data but we know profiles exist from previous calls, retry
                if (endpoint === 'traits' && 
                    (!data.traits || (typeof data.traits === 'object' && Object.keys(data.traits).length === 0)) &&
                    retryCount < maxRetries - 1 && !is404Retry) {
                  console.warn(`🔄 [Profile API] Empty traits response for: ${identifier}, retrying in ${retryDelay}ms... (${retryCount + 1}/${maxRetries})`);
                  await new Promise(resolve => setTimeout(resolve, retryDelay));
                  retryCount++;
                } else {
                  // Structure the data in the format expected by UniqueProfilesList
                  const resultKey = identifier; // Use identifier as key for merging
                  if (!newResults[resultKey]) {
                    newResults[resultKey] = {
                      data: data,
                      _endpoint: endpoint,
                      _segmentApiEndpoint: data._segmentApiEndpoint,
                      _endpoints: endpoint === 'metadata' ? [] : [endpoint], // Don't include metadata in visible endpoints
                      _combinedData: { [endpoint]: data }
                    };
                  } else {
                    // Merge multiple endpoints for the same identifier
                    if (endpoint !== 'metadata') {
                      newResults[resultKey]._endpoints.push(endpoint);
                    }
                    newResults[resultKey]._combinedData[endpoint] = data;
                  }
                  break;
                }
              }
              // Handle other HTTP errors (not 404)
              else {
                const errorKey = `${identifier}_${endpoint}`;
                newErrors[errorKey] = {
                  type: 'api_error',
                  message: data.error?.message || `HTTP ${response.status}: ${response.statusText}`,
                  status: response.status,
                  statusText: response.statusText,
                  identifier: identifier,
                  endpoint: endpoint
                };
                break;
              }
              
              is404Retry = false;
            } while (retryCount < maxRetries || is404Retry);
            
            // Clean up this request from activeRequests when it completes
            setActiveRequests(prev => {
              const updated = new Map(prev);
              updated.delete(requestKey);
              return updated;
            });
            
          } catch (error) {
            const errorKey = `${identifier}_${endpoint}`;
            
            // Clean up this request from activeRequests
            setActiveRequests(prev => {
              const updated = new Map(prev);
              updated.delete(errorKey);
              return updated;
            });
            
            // Handle AbortError (request was cancelled)
            if (error.name === 'AbortError') {
              console.log(`🚫 [Profile API] Request cancelled for: ${identifier}/${endpoint}`);
              return; // Don't set error for cancelled requests
            }
            
            newErrors[errorKey] = {
              type: 'connection_error',
              message: `Failed to connect to server: ${error.message}`,
              error: error.message,
              identifier: identifier,
              endpoint: endpoint
            };
            console.error(`💥 [Profile API] CONNECTION ERROR for: ${identifier}/${endpoint} - ${error.message}`);
          }
        });
      })
    );

    setResults(newResults);
    setErrors(newErrors);
    setIsLoading(false);
    
    // Clear all active requests since batch is complete
    setActiveRequests(new Map());
    
    // Update persistent results via parent callback
    if (onProfileApiResultsUpdate && Object.keys(newResults).length > 0) {
      onProfileApiResultsUpdate(newResults);
    }
  };

  // Copy identifier to clipboard
  const handleCopyIdentifier = async (identifier, event) => {
    try {
      await navigator.clipboard.writeText(identifier);
      
      // Show copy animation at cursor position
      const rect = event.target.getBoundingClientRect();
      setCopyAnimation({
        show: true,
        x: rect.left + rect.width / 2,
        y: rect.top - 10
      });
      
      // Hide animation after 1.5 seconds
      setTimeout(() => {
        setCopyAnimation({ show: false, x: 0, y: 0 });
      }, 1500);
      
      console.log(`Copied "${identifier}" to clipboard`);
    } catch (err) {
      console.error('Failed to copy identifier to clipboard:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = identifier;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        
        // Show copy animation for fallback too
        const rect = event.target.getBoundingClientRect();
        setCopyAnimation({
          show: true,
          x: rect.left + rect.width / 2,
          y: rect.top - 10
        });
        
        setTimeout(() => {
          setCopyAnimation({ show: false, x: 0, y: 0 });
        }, 1500);
        
        console.log(`Copied "${identifier}" to clipboard (fallback)`);
      } catch (fallbackErr) {
        console.error('Fallback copy also failed:', fallbackErr);
      }
      document.body.removeChild(textArea);
    }
  };

  // Get all available identifiers (predefined + custom)
  // const getAllIdentifiers = () => {
  //   return [...identifierOptions, ...customIdentifiers];
  // };

  const handleAddNewIdentifier = () => {
    const newIndex = identifierOptions.length + customIdentifiers.length;
    setEditingIndex(newIndex);
    setEditingValue('');
  };

  const handleSaveIdentifier = () => {
    if (editingValue.trim()) {
      const newIdentifier = editingValue.trim();
      if (!identifierOptions.includes(newIdentifier) && !customIdentifiers.includes(newIdentifier)) {
        setCustomIdentifiers(prev => [...prev, newIdentifier]);
        setSelectedIdentifiers(prev => [...prev, newIdentifier]); // Auto-select new identifier
      }
    }
    setEditingIndex(null);
    setEditingValue('');
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditingValue('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveIdentifier();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelEdit();
    }
  };

  const handleRemoveCustomIdentifier = (identifier) => {
    setCustomIdentifiers(prev => prev.filter(id => id !== identifier));
    setSelectedIdentifiers(prev => prev.filter(id => id !== identifier));
  };

  const updateQueryParam = (key, value) => {
    setQueryParams(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const renderQueryParamInputs = () => {
    const hasTraitsOrExternalIds = selectedEndpoints.includes('traits') || selectedEndpoints.includes('external_ids');
    const hasEventsOrLinks = selectedEndpoints.includes('events') || selectedEndpoints.includes('links');
    const hasTraits = selectedEndpoints.includes('traits');
    
    return (
      <div className="profile-lookup__params">
        <h4 className="profile-lookup__params-title">Query Parameters</h4>
        
        {(hasTraitsOrExternalIds || hasEventsOrLinks) && (
          <div className="profile-lookup__param profile-lookup__param--inline">
            <div className="profile-lookup__param-group">
              <label>Limit:</label>
              <input
                type="number"
                min="1"
                max={hasTraits ? 200 : selectedEndpoints.includes('links') ? 20 : 100}
                value={queryParams.limit}
                onChange={(e) => updateQueryParam('limit', e.target.value)}
                className="profile-lookup__param-input"
              />
            </div>
            {hasTraitsOrExternalIds && (
              <div className="profile-lookup__param-group profile-lookup__param-group--checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={queryParams.verbose}
                    onChange={(e) => updateQueryParam('verbose', e.target.checked)}
                  />
                  Verbose output
                </label>
              </div>
            )}
          </div>
        )}

        {hasTraitsOrExternalIds && (
          <div className="profile-lookup__param">
            <label>Include (comma-separated):</label>
            <input
              type="text"
              value={queryParams.include}
              onChange={(e) => updateQueryParam('include', e.target.value)}
              placeholder="first_name,city"
              className="profile-lookup__param-input"
            />
          </div>
        )}

        {hasTraits && (
          <div className="profile-lookup__param">
            <label>Class:</label>
            <select
              value={queryParams.class}
              onChange={(e) => updateQueryParam('class', e.target.value)}
              className="profile-lookup__param-select"
            >
              <option value="">All</option>
              <option value="audience">Audience</option>
              <option value="computed_trait">Computed Trait</option>
            </select>
          </div>
        )}

        {hasEventsOrLinks && (
          <div className="profile-lookup__param">
            <label>Next cursor (pagination):</label>
            <input
              type="text"
              value={queryParams.next}
              onChange={(e) => updateQueryParam('next', e.target.value)}
              placeholder="Next page cursor"
              className="profile-lookup__param-input"
            />
          </div>
        )}
      </div>
    );
  };

  if (!isConfigured) {
    return (
      <div className="profile-lookup profile-lookup--not-configured">
        <div className="profile-lookup__header">
          <h3 className="profile-lookup__title">Profile API Lookup</h3>
        </div>
        <div className="profile-lookup__not-configured">
          <p>Segment Profile API is not configured.</p>
          <p>Please configure your Space ID and Access Token first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-lookup">
      <div className="profile-lookup__header">
        <h3 className="profile-lookup__title">
          <img src="/assets/compass.svg" alt="Profile API Lookup" className="profile-lookup__header-icon" />
          Profile API Lookup
        </h3>
        <p className="profile-lookup__subtitle">
          Query Segment Profile API endpoints
        </p>
      </div>

      <div className="profile-lookup__content">
        <div className="profile-lookup__form-section">
          <div className="profile-lookup__field">
            <label className="profile-lookup__label">Profile Identifiers</label>
            
            <div className="profile-lookup__identifier-list">
              {/* Predefined identifiers */}
              {identifierOptions.map(opt => {
                const isSelected = selectedIdentifiers.includes(opt);
                return (
                  <div key={opt} className="profile-lookup__identifier-option">
                    <button
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          // Cancel any active requests for this identifier before deselecting
                          cancelRequestsForIdentifier(opt);
                          setSelectedIdentifiers(prev => prev.filter(id => id !== opt));
                        } else {
                          setSelectedIdentifiers(prev => [...prev, opt]);
                        }
                      }}
                      className={`profile-lookup__identifier-toggle ${isSelected ? 'profile-lookup__identifier-toggle--selected' : 'profile-lookup__identifier-toggle--unselected'}`}
                      title={`${isSelected ? 'Deselect' : 'Select'} ${opt}`}
                    >
                      {isSelected ? '✓' : '✗'}
                    </button>
                    <span 
                      className="profile-lookup__identifier-text"
                      onClick={(e) => handleCopyIdentifier(opt, e)}
                      title={`Click to copy "${opt}" to clipboard`}
                      style={{ cursor: 'pointer' }}
                    >
                      {opt}
                    </span>
                  </div>
                );
              })}
              
              {/* Custom identifiers */}
              {customIdentifiers.map((opt, index) => {
                const isSelected = selectedIdentifiers.includes(opt);
                
                return (
                  <div key={`custom-${opt}`} className="profile-lookup__identifier-option">
                    <button
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          // Cancel any active requests for this identifier before deselecting
                          cancelRequestsForIdentifier(opt);
                          setSelectedIdentifiers(prev => prev.filter(id => id !== opt));
                        } else {
                          setSelectedIdentifiers(prev => [...prev, opt]);
                        }
                      }}
                      className={`profile-lookup__identifier-toggle ${isSelected ? 'profile-lookup__identifier-toggle--selected' : 'profile-lookup__identifier-toggle--unselected'}`}
                      title={`${isSelected ? 'Deselect' : 'Select'} ${opt}`}
                    >
                      {isSelected ? '✓' : '✗'}
                    </button>
                    <span 
                      className="profile-lookup__identifier-text profile-lookup__identifier-text--custom"
                      onClick={(e) => handleCopyIdentifier(opt, e)}
                      title={`Click to copy "${opt}" to clipboard`}
                      style={{ cursor: 'pointer' }}
                    >
                      {opt}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveCustomIdentifier(opt)}
                      className="profile-lookup__identifier-remove"
                      title={`Remove ${opt}`}
                    >
                      ×
                    </button>
                  </div>
                );
              })}
              
              {/* Editing input line */}
              {editingIndex !== null && (
                <div className="profile-lookup__identifier-option profile-lookup__identifier-option--editing">
                  <div className="profile-lookup__identifier-toggle profile-lookup__identifier-toggle--editing">
                    +
                  </div>
                  <input
                    type="text"
                    value={editingValue}
                    onChange={e => setEditingValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={handleSaveIdentifier}
                    className="profile-lookup__identifier-input"
                    placeholder="Enter identifier (e.g., user_id:12345)"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="profile-lookup__identifier-cancel"
                    title="Cancel"
                  >
                    ✕
                  </button>
                </div>
              )}
              
              {/* Add new identifier button */}
              {editingIndex === null && (
                <div 
                  className="profile-lookup__identifier-option profile-lookup__identifier-option--add"
                  onClick={handleAddNewIdentifier}
                >
                  <div className="profile-lookup__identifier-toggle profile-lookup__identifier-toggle--add">
                    +
                  </div>
                  <span className="profile-lookup__identifier-add-text">
                    Click to add identifier...
                  </span>
                </div>
              )}
            </div>
            
            <p className="profile-lookup__help">
              Select the identifier(s) for the Profile API to look up.
              <br />
              Click the + to add custom identifiers. 
              {selectedIdentifiers.length > 0 && ` (${selectedIdentifiers.length} selected)`}
            </p>
          </div>

          {/* Endpoints and Query Parameters Side by Side */}
          <div className="profile-lookup__endpoints-params-container">
            <div className="profile-lookup__field profile-lookup__field--endpoints">
              <label className="profile-lookup__label">Endpoints</label>
              <div className="profile-lookup__endpoint-list">
                {['traits', 'external_ids', 'events', 'metadata', 'links'].map(endpoint => {
                  const isSelected = selectedEndpoints.includes(endpoint);
                  return (
                    <div key={endpoint} className="profile-lookup__endpoint-option">
                      <button
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setSelectedEndpoints(prev => prev.filter(e => e !== endpoint));
                          } else {
                            setSelectedEndpoints(prev => [...prev, endpoint]);
                          }
                        }}
                        className={`profile-lookup__endpoint-toggle ${isSelected ? 'profile-lookup__endpoint-toggle--selected' : 'profile-lookup__endpoint-toggle--unselected'}`}
                        title={`${isSelected ? 'Deselect' : 'Select'} ${endpoint}`}
                      >
                        {isSelected ? '✓' : '✗'}
                      </button>
                      <span className="profile-lookup__endpoint-text">{endpoint}</span>
                    </div>
                  );
                })}
              </div>
              <p className="profile-lookup__help">
                Select which endpoints to query for each identifier.
                <br /> Multiple endpoints may be selected.
                {selectedEndpoints.length > 0 && ` (${selectedEndpoints.length} selected)`}
              </p>
              {selectedEndpoints.includes('traits') && (
                <p className="profile-lookup__help">
                  💡 <strong>Note:</strong> If you just sent identify events via simulation, traits may take 30-60 seconds (sometimes longer) to appear in Segment's Profile API. 
                  The system will automatically retry up to 3 times with delays if no traits are found initially.
                </p>
              )}
            </div>

            {/* Query Parameters Section */}
            <div className="profile-lookup__field profile-lookup__field--params">
              {renderQueryParamInputs()}
            </div>
          </div>

          <button
            onClick={handleLookup}
            disabled={isLoading || selectedIdentifiers.length === 0 || selectedEndpoints.length === 0}
            className="profile-lookup__button"
          >
            {isLoading ? 'Looking up...' : 
             `Lookup ${selectedEndpoints.length > 1 ? `${selectedEndpoints.length} Endpoints` : selectedEndpoints[0] || 'Endpoints'} by ${selectedIdentifiers.length} Identifier${selectedIdentifiers.length > 1 ? 's' : ''}`
            }
          </button>

          {/* Stop Lookup button - only show when actively loading */}
          {isLoading && (
            <button
              onClick={cancelAllRequests}
              className="profile-lookup__button profile-lookup__button--stop"
              style={{ marginTop: '10px', width: '100%' }}
            >
              Stop Lookup
            </button>
          )}

          {/* {Object.keys(persistentResults).length > 0 && (
            <button
              onClick={() => {
                setPersistentResults({});
                setResults({});
              }}
              className="profile-lookup__button profile-lookup__button--secondary"
              style={{ marginLeft: '10px' }}
            >
              Clear Persistent Results
            </button>
          )} */}
          
          {errors.general && (
            <div className="profile-lookup__error">
              {errors.general}
            </div>
          )}
        </div>

        <div className="profile-lookup__results-section">
          {(Object.keys(results).length > 0 || Object.keys(errors).length > 0 || Object.keys(profileApiResults).length > 0 || isLoading) && (
            <div className="profile-lookup__results">
              <div className="profile-lookup__results-header">
                {isLoading ? (
                  <div className="unique-profiles-list">
                    <div className="unique-profiles-list__header">
                      <div className="unique-profiles-list__title-skeleton skeleton-loader"></div>
                      <div className="unique-profiles-list__subtitle-skeleton skeleton-loader"></div>
                    </div>
                    <div className="unique-profiles-list__content">
                      <div className="unique-profiles-list__users">
                        <div className="unique-user-skeleton skeleton-loader"></div>
                        <div className="unique-user-skeleton skeleton-loader"></div>
                        <div className="unique-user-skeleton skeleton-loader"></div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <UniqueProfilesList 
                    profileApiResults={profileApiResults}
                    events={events}
                    onHighlightEvents={onHighlightEvents}
                    onAddEventToList={onAddEventToList}
                  />
                )}
                {Object.keys(profileApiResults).length > 0 && onClearProfiles && (
                  <div className="profile-lookup__clear-profiles-container">
                    <button 
                      onClick={onClearProfiles}
                      className="profile-lookup__clear-profiles-button"
                      title="Clear all saved profile api lookup results"
                    >
                      <img src="/assets/compass.svg" alt="Clear" className="profile-lookup__button-icon" />
                      Clear Profiles
                    </button>
                  </div>
                )}
              </div>
              
              {/* Display errors for each failed identifier */}
              {Object.keys(errors).length > 0 && (
                <div className="profile-lookup__errors">
                  <div className="profile-lookup__errors-header">
                    <h4>Errors</h4>
                    <span className="profile-lookup__errors-summary">
                      {Object.keys(errors).length} failed request{Object.keys(errors).length > 1 ? 's' : ''}
                    </span>
                  </div>
                  {Object.entries(errors).map(([errorKey, error]) => {
                    const errorObj = typeof error === 'object' ? error : { type: 'unknown', message: error };
                    const isProfileNotFound = errorObj.type === 'profile_not_found';
                    const isProfileTimeout = errorObj.type === 'profile_timeout';
                    
                    // For errors with identifier_endpoint format, display both
                    const displayTitle = errorObj.identifier && errorObj.endpoint 
                      ? `${errorObj.identifier} (${errorObj.endpoint})`
                      : errorKey;
                    
                    return (
                      <div key={errorKey} className={`profile-lookup__error-item ${isProfileNotFound ? 'profile-lookup__error-item--waiting' : ''}`}>
                        <div className="profile-lookup__error-header">
                          <h5 className="profile-lookup__error-identifier">{displayTitle}</h5>
                          <span className={`profile-lookup__error-status ${isProfileNotFound ? 'profile-lookup__error-status--waiting' : isProfileTimeout ? 'profile-lookup__error-status--timeout' : ''}`}>
                            {isProfileNotFound ? '⏳ Waiting' : isProfileTimeout ? '⏰ Timeout' : '✗ Error'}
                          </span>
                        </div>
                        <div className="profile-lookup__error-message">
                          {errorObj.message}
                          {isProfileNotFound && errorObj.retryCount && (
                            <div className="profile-lookup__error-details">
                              <small>
                                Retry #{errorObj.retryCount} • Started {Math.floor((Date.now() - errorObj.startTime) / 1000)}s ago
                              </small>
                            </div>
                          )}
                          {isProfileTimeout && errorObj.totalWaitTime && (
                            <div className="profile-lookup__error-details">
                              <small>
                                Waited {Math.floor(errorObj.totalWaitTime / 1000)} seconds total
                              </small>
                            </div>
                          )}
                          {errorObj.type === 'api_error' && errorObj.status && (
                            <div className="profile-lookup__error-details">
                              <small>HTTP {errorObj.status}: {errorObj.statusText}</small>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Copy Animation */}
      {copyAnimation.show && (
        <div 
          className="profile-lookup__copy-animation"
          style={{
            position: 'fixed',
            left: `${copyAnimation.x}px`,
            top: `${copyAnimation.y}px`,
            transform: 'translateX(-50%)',
            zIndex: 9999,
            pointerEvents: 'none'
          }}
        >
          <div className="profile-lookup__copy-message">
            <span className="profile-lookup__copy-icon">📋</span>
            Copied!
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileLookup;
