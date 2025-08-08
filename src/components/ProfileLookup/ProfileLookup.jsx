import React, { useState, useEffect } from 'react';
import './ProfileLookup.css';

const ProfileLookup = () => {
  const [identifier, setIdentifier] = useState('');
  const [endpoint, setEndpoint] = useState('traits');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
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
    if (!identifier.trim()) {
      setError('Please enter a profile identifier');
      return;
    }

    setIsLoading(true);
    setError('');
    setResults(null);

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

      const url = `/api/profiles/${encodeURIComponent(identifier)}/${endpoint}${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);
      const data = await response.json();

      if (response.ok) {
        setResults(data);
      } else {
        setError(data.error?.message || 'API request failed');
      }
    } catch (error) {
      setError('Failed to connect to server');
    } finally {
      setIsLoading(false);
    }
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

      <div className="profile-lookup__form">
        <div className="profile-lookup__field">
          <label className="profile-lookup__label">Profile Identifier</label>
          <input
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="user_id:12345 or anonymous_id:abc123"
            className="profile-lookup__input"
          />
          <p className="profile-lookup__help">
            Format: id_type:value (e.g., user_id:12345, anonymous_id:abc123, email:user@example.com)
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

        {renderQueryParamInputs()}

        <button
          onClick={handleLookup}
          disabled={isLoading}
          className="profile-lookup__button"
        >
          {isLoading ? 'Looking up...' : 'Lookup Profile'}
        </button>

        {error && (
          <div className="profile-lookup__error">
            {error}
          </div>
        )}
      </div>

      {results && (
        <div className="profile-lookup__results">
          <div className="profile-lookup__results-header">
            <h4>Results</h4>
            {results.has_more && (
              <span className="profile-lookup__pagination-info">
                More results available
              </span>
            )}
          </div>
          <pre className="profile-lookup__results-json">
            {JSON.stringify(results, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default ProfileLookup;
