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
      const response = await fetch('/api/config');
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
          const url = `/api/profiles/${encodeURIComponent(identifier)}/${endpoint}${queryString}`;
          const response = await fetch(url);
          const data = await response.json();
          
          if (response.ok) {
            newResults[identifier] = data;
          } else {
            newErrors[identifier] = data.error?.message || 'API request failed';
          }
        } catch (error) {
          newErrors[identifier] = 'Failed to connect to server';
        }
      })
    );

    setResults(newResults);
    setErrors(newErrors);
    setIsLoading(false);
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
          <div className="profile-lookup__param">
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
                profileApiResults={results}
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
