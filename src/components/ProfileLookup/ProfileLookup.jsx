import React, { useState, useEffect } from 'react';
import UniqueProfilesList from '../UniqueProfilesList/UniqueProfilesList.jsx';
import './ProfileLookup.css';

const ProfileLookup = ({ identifierOptions = [], events = [], onHighlightEvents }) => {
  const [selectedIdentifiers, setSelectedIdentifiers] = useState([]);
  const [customIdentifiers, setCustomIdentifiers] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingValue, setEditingValue] = useState('');
  const [endpoint, setEndpoint] = useState('external_ids');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState({});
  const [persistentResults, setPersistentResults] = useState({}); // Accumulate results across queries
  const [errors, setErrors] = useState({});
  const [isConfigured, setIsConfigured] = useState(false);

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

  const handleLookup = async () => {
    // Get all selected identifiers (both predefined and custom)
    const allIdentifiers = [...identifierOptions, ...customIdentifiers];
    const identifiersToProcess = allIdentifiers.filter(id => selectedIdentifiers.includes(id));
    
    if (identifiersToProcess.length === 0) {
      setErrors({ general: 'Please select or enter at least one profile identifier' });
      return;
    }

    setIsLoading(true);
    setErrors({});
    setResults({});

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
    const newResults = {};
    const newErrors = {};

    // Make requests for each identifier
    await Promise.all(
      identifiersToProcess.map(async (identifier) => {
        try {
          // For identifiers with colons (like user_id:12345), we need to encode them properly
          // encodeURIComponent encodes : as %3A, which Express will decode back to : 
          // The server will then re-encode it for the Segment API
          const literalUrl = `http://localhost:8888/api/profiles/${identifier}/${endpoint}${queryString}`;
          const encodedIdentifier = encodeURIComponent(identifier);
          const url = `http://localhost:8888/api/profiles/${encodedIdentifier}/${endpoint}${queryString}`;
          
          console.group(`🔍 [${endpoint.toUpperCase()}] Request for: ${identifier}`);
          console.log(`� Literal endpoint: ${literalUrl}`);
          console.log(`📡 Encoded URL: ${url}`);
          console.log(`🕐 Request Time: ${new Date().toISOString()}`);
          
          // For traits endpoint, implement retry logic with delay
          let response, data;
          let retryCount = 0;
          const maxRetries = endpoint === 'traits' ? 3 : 1;
          const retryDelay = 2000; // 2 seconds
          
          do {
            response = await fetch(url);
            data = await response.json();
            
            console.log(`📥 [${endpoint.toUpperCase()}] Response received for: ${identifier}`);
            console.log(`📊 Status: ${response.status} ${response.statusText}`);
            console.log(`� Response Time: ${new Date().toISOString()}`);
            console.log(`�📋 Response Data:`, data);
            
            // If traits endpoint returns empty data but we know profiles exist from previous calls, retry
            if (endpoint === 'traits' && response.ok && 
                (!data.data || (typeof data.data === 'object' && Object.keys(data.data).length === 0)) &&
                retryCount < maxRetries - 1) {
              console.warn(`🔄 [${endpoint.toUpperCase()}] Empty response, retrying in ${retryDelay}ms... (${retryCount + 1}/${maxRetries})`);
              await new Promise(resolve => setTimeout(resolve, retryDelay));
              retryCount++;
            } else {
              break;
            }
          } while (retryCount < maxRetries);
          
          if (response.ok) {
            newResults[identifier] = data;
            console.log(`✅ [${endpoint.toUpperCase()}] SUCCESS for: ${identifier}`);
            console.log(`📊 Data Summary: ${data.data ? (Array.isArray(data.data) ? `${data.data.length} items` : `${Object.keys(data.data).length} properties`) : 'No data'}`);
            
            // Special logging for traits endpoint
            if (endpoint === 'traits' && data.data) {
              console.log(`🏷️ TRAITS DATA DETAILS for ${identifier}:`);
              console.log(`  - Traits object:`, data.data);
              console.log(`  - Trait keys:`, Object.keys(data.data));
              console.log(`  - Is empty?:`, Object.keys(data.data).length === 0);
            }
          } else {
            newErrors[identifier] = data.error?.message || 'API request failed';
            console.error(`❌ [${endpoint.toUpperCase()}] ERROR for: ${identifier}`);
            console.error(`📋 Error Details:`, data.error?.message || 'API request failed');
          }
          console.groupEnd(); // Close the group for this user/endpoint
        } catch (error) {
          newErrors[identifier] = 'Failed to connect to server';
          console.error(`💥 [${endpoint.toUpperCase()}] CONNECTION ERROR for: ${identifier}`);
          console.error(`📋 Error Details:`, error.message);
          console.groupEnd(); // Close the group for this user/endpoint
        }
      })
    );

    setResults(newResults);
    setErrors(newErrors);
    setIsLoading(false);
    
    // Merge into persistent results for cross-endpoint profile building
    setPersistentResults(prev => {
      const merged = { ...prev };
      
      console.group(`🔄 [CACHE MERGE] Processing ${Object.keys(newResults).length} new results`);
      console.log(`📦 Cache Before: ${Object.keys(prev).length} entries`);
      
      Object.entries(newResults).forEach(([identifier, result]) => {
        // Use identifier as key, not identifier_endpoint, so data for same identifier merges
        if (merged[identifier]) {
          // If we already have data for this identifier, we need to merge carefully
          console.group(`🔗 [MERGE] Combining data for: ${identifier}`);
          console.log(`📊 Existing Endpoints:`, merged[identifier]._endpoints || [merged[identifier]._endpoint]);
          console.log(`➕ Adding Endpoint: ${endpoint}`);
          
          // Special logging for traits merging
          if (endpoint === 'traits') {
            console.log(`🏷️ TRAITS MERGE DETAILS:`);
            console.log(`  - New traits data:`, result.data);
            console.log(`  - Existing combined data:`, merged[identifier]._combinedData);
          }
          
          // Create a composite result that includes both endpoint types
          const existingResult = merged[identifier];
          const mergedResult = {
            ...result,
            // Preserve additional endpoint metadata if needed
            _endpoints: [
              ...(existingResult._endpoints || [existingResult._endpoint || endpoint]), 
              endpoint
            ].filter((ep, index, arr) => arr.indexOf(ep) === index), // dedupe
            _combinedData: {
              ...(existingResult._combinedData || { [existingResult._endpoint || 'unknown']: existingResult.data }),
              [endpoint]: result.data
            }
          };
          merged[identifier] = mergedResult;
          console.log(`✅ Final Endpoints:`, mergedResult._endpoints);
          console.groupEnd(); // Close merge group for this identifier
        } else {
          // First time seeing this identifier
          console.log(`🆕 [NEW] Adding identifier: ${identifier} with ${endpoint} data`);
          merged[identifier] = {
            ...result,
            _endpoint: endpoint,
            _endpoints: [endpoint]
          };
        }
      });
      console.log(`📊 Cache After: ${Object.keys(merged).length} entries`);
      console.groupEnd(); // Close cache merge group
      return merged;
    });
  };

  // Get all available identifiers (predefined + custom)
  const getAllIdentifiers = () => {
    return [...identifierOptions, ...customIdentifiers];
  };

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
    return (
      <div className="profile-lookup__params">
        <h4 className="profile-lookup__params-title">Query Parameters</h4>
        
        {(endpoint === 'traits' || endpoint === 'external_ids' || endpoint === 'events' || endpoint === 'links') && (
          <div className="profile-lookup__param">
            <label>Limit:</label>
            <input
              type="number"
              min="1"
              max={endpoint === 'traits' ? 200 : endpoint === 'links' ? 20 : 100}
              value={queryParams.limit}
              onChange={(e) => updateQueryParam('limit', e.target.value)}
              className="profile-lookup__param-input"
            />
          </div>
        )}

        {(endpoint === 'traits' || endpoint === 'external_ids') && (
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

        {endpoint === 'traits' && (
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

        {(endpoint === 'traits' || endpoint === 'external_ids') && (
          <div className="profile-lookup__param--checkbox">
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

        {(endpoint === 'events' || endpoint === 'links') && (
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
          <h3 className="profile-lookup__title">Profile Lookup</h3>
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
        <h3 className="profile-lookup__title">Profile Lookup</h3>
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
                    <span className="profile-lookup__identifier-text">{opt}</span>
                  </div>
                );
              })}
              
              {/* Custom identifiers */}
              {customIdentifiers.map((opt, index) => {
                const isSelected = selectedIdentifiers.includes(opt);
                const globalIndex = identifierOptions.length + index;
                
                return (
                  <div key={`custom-${opt}`} className="profile-lookup__identifier-option">
                    <button
                      type="button"
                      onClick={() => {
                        if (isSelected) {
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
                    <span className="profile-lookup__identifier-text profile-lookup__identifier-text--custom">
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
              Click the + to add custom identifiers. Use checkmarks to select which ones to look up.
              {selectedIdentifiers.length > 0 && ` (${selectedIdentifiers.length} selected)`}
            </p>
          </div>

          <div className="profile-lookup__field">
            <label className="profile-lookup__label">Endpoint</label>
            <select
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              className="profile-lookup__select"
            >
              <option value="traits">Traits</option>
              <option value="external_ids">External IDs</option>
              <option value="events">Events</option>
              <option value="metadata">Metadata</option>
              <option value="links">Links</option>
            </select>
            {endpoint === 'traits' && (
              <p className="profile-lookup__help">
                💡 <strong>Note:</strong> If you just sent identify events via simulation, traits may take 30-60 seconds to appear in Segment's Profile API. 
                The system will automatically retry up to 3 times with delays if no traits are found initially.
              </p>
            )}
          </div>

          {/* Query Parameters Section - moved above button */}
          {renderQueryParamInputs()}

          <button
            onClick={handleLookup}
            disabled={isLoading || selectedIdentifiers.length === 0}
            className="profile-lookup__button"
          >
            {isLoading ? 'Looking up...' : `Lookup Profile${selectedIdentifiers.length > 1 ? 's' : ''}`}
          </button>

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
          {(Object.keys(results).length > 0 || Object.keys(errors).length > 0) && (
            <div className="profile-lookup__results">
              <UniqueProfilesList 
                profileApiResults={persistentResults}
                events={events}
                onHighlightEvents={onHighlightEvents}
              />
              
              {/* Display errors for each failed identifier */}
              {Object.keys(errors).length > 0 && (
                <div className="profile-lookup__errors">
                  <div className="profile-lookup__errors-header">
                    <h4>Errors</h4>
                    <span className="profile-lookup__errors-summary">
                      {Object.keys(errors).length} failed request{Object.keys(errors).length > 1 ? 's' : ''}
                    </span>
                  </div>
                  {Object.entries(errors).map(([identifier, errorMsg]) => (
                    <div key={identifier} className="profile-lookup__error-item">
                      <div className="profile-lookup__error-header">
                        <h5 className="profile-lookup__error-identifier">{identifier}</h5>
                        <span className="profile-lookup__error-status">
                          ✗ Error
                        </span>
                      </div>
                      <div className="profile-lookup__error-message">
                        {errorMsg}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileLookup;
