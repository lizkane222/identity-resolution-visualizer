import React, { useState, useEffect } from 'react';
import './SpaceConfig.css';

const SpaceConfig = () => {
  const [spaceId, setSpaceId] = useState('');
  const [profileApiToken, setProfileApiToken] = useState('');
  const [personasEnabled, setPersonasEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [selectedEndpoint, setSelectedEndpoint] = useState('traits');
  const [selectedParams, setSelectedParams] = useState([]);

  // Profile API endpoints and their parameters
  const endpoints = {
    'traits': {
      label: 'Traits',
      params: ['limit', 'include', 'class', 'verbose']
    },
    'external_ids': {
      label: 'External IDs',
      params: ['limit', 'include', 'verbose']
    },
    'events': {
      label: 'Events',
      params: ['limit', 'next']
    },
    'metadata': {
      label: 'Metadata',
      params: []
    },
    'links': {
      label: 'Links',
      params: ['limit', 'next']
    },
    'accounts/traits': {
      label: 'Account Traits',
      params: ['limit', 'include', 'class', 'verbose']
    },
    'accounts/links': {
      label: 'Account Links',
      params: ['limit', 'next']
    }
  };

  const paramDescriptions = {
    'limit': 'Maximum number of results (1-200 for traits, 1-100 for events)',
    'include': 'Comma-separated list of trait keys to include',
    'class': 'Filter by trait class (audience, computed_trait)',
    'verbose': 'Include additional metadata in response',
    'next': 'Pagination cursor for next page of results'
  };

  useEffect(() => {
    loadCurrentConfig();
  }, []);

  const loadCurrentConfig = async () => {
    try {
      const response = await fetch('/api/config');
      const config = await response.json();
      
      if (config.spaceId) {
        setSpaceId(config.spaceId);
      }
      if (config.hasToken) {
        setProfileApiToken('••••••••••••••••');
      }
      if (config.integrations && typeof config.integrations.personas === 'boolean') {
        setPersonasEnabled(config.integrations.personas);
      }
    } catch (error) {
      console.error('Error loading configuration:', error);
    }
  };

  const handleSave = async () => {
    if (!spaceId.trim() || !profileApiToken.trim()) {
      setMessage({ type: 'error', text: 'Both Space ID and Profile API Token are required' });
      return;
    }

    if (profileApiToken === '••••••••••••••••') {
      setMessage({ type: 'error', text: 'Please enter a valid Profile API Token' });
      return;
    }

    setIsLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          spaceId: spaceId.trim(),
          accessToken: profileApiToken.trim(),
          integrations: {
            personas: personasEnabled
          }
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Configuration saved successfully!' });
        // Obfuscate the token after successful save
        setProfileApiToken('••••••••••••••••');
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to save configuration' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to connect to server' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTokenChange = (value) => {
    // Don't update if the user is trying to edit the obfuscated value
    if (value === '••••••••••••••••' || profileApiToken === '••••••••••••••••') {
      if (value !== '••••••••••••••••') {
        setProfileApiToken(value);
      }
    } else {
      setProfileApiToken(value);
    }
  };

  const handleTokenFocus = () => {
    if (profileApiToken === '••••••••••••••••') {
      setProfileApiToken('');
    }
  };

  const toggleParam = (param) => {
    setSelectedParams(prev => 
      prev.includes(param)
        ? prev.filter(p => p !== param)
        : [...prev, param]
    );
  };

  return (
    <div className="space-config">
      <div className="space-config__section">
        <h3 className="space-config__section-title">Segment Profile API Configuration</h3>
        <p className="space-config__section-description">
          Configure your Segment workspace credentials to enable Profile API queries
        </p>

        <div className="space-config__form">
          <div className="space-config__field">
            <label className="space-config__label">
              Space ID <span className="space-config__required">*</span>
            </label>
            <input
              type="text"
              value={spaceId}
              onChange={(e) => setSpaceId(e.target.value)}
              placeholder="Enter your Segment Space ID"
              className="space-config__input"
            />
            <p className="space-config__help">
              Found in your Segment workspace settings under "General"
            </p>
          </div>

          <div className="space-config__field">
            <label className="space-config__label">
              Profile API Token <span className="space-config__required">*</span>
            </label>
            <input
              type="password"
              value={profileApiToken}
              onChange={(e) => handleTokenChange(e.target.value)}
              onFocus={handleTokenFocus}
              placeholder="Enter your Profile API Token"
              className="space-config__input"
            />
            <p className="space-config__help">
              Create a token with "Profile API Read" permissions in your Segment workspace
            </p>
          </div>

          <div className="space-config__field">
            <label className="space-config__label space-config__label--checkbox">
              <input
                type="checkbox"
                checked={personasEnabled}
                onChange={(e) => setPersonasEnabled(e.target.checked)}
                className="space-config__checkbox"
              />
              Enable Personas Integration
            </label>
            <p className="space-config__help">
              Controls whether the Unify space includes Personas functionality for audience management and computed traits
            </p>
          </div>

          <button
            onClick={handleSave}
            disabled={isLoading}
            className="space-config__save-button"
          >
            {isLoading ? 'Saving...' : 'Save Configuration'}
          </button>

          {message.text && (
            <div className={`space-config__message space-config__message--${message.type}`}>
              {message.text}
            </div>
          )}
        </div>
      </div>

      <div className="space-config__section">
        <h3 className="space-config__section-title">Profile API Endpoints</h3>
        <p className="space-config__section-description">
          Select an endpoint and configure query parameters for Profile API requests
        </p>

        <div className="space-config__endpoints">
          {Object.entries(endpoints).map(([endpoint, config]) => (
            <button
              key={endpoint}
              onClick={() => setSelectedEndpoint(endpoint)}
              className={`space-config__endpoint-button ${
                selectedEndpoint === endpoint ? 'space-config__endpoint-button--active' : ''
              }`}
            >
              {config.label}
            </button>
          ))}
        </div>

        <div className="space-config__selected-endpoint">
          <h4 className="space-config__endpoint-title">
            Selected: {endpoints[selectedEndpoint].label}
          </h4>
          <div className="space-config__endpoint-path">
            <code>/profiles/:identifier/{selectedEndpoint}</code>
          </div>

          {endpoints[selectedEndpoint].params.length > 0 && (
            <div className="space-config__params">
              <h5 className="space-config__params-title">Available Query Parameters</h5>
              <div className="space-config__param-buttons">
                {endpoints[selectedEndpoint].params.map(param => (
                  <button
                    key={param}
                    onClick={() => toggleParam(param)}
                    className={`space-config__param-button ${
                      selectedParams.includes(param) ? 'space-config__param-button--active' : ''
                    }`}
                    title={paramDescriptions[param]}
                  >
                    {param}
                  </button>
                ))}
              </div>

              {selectedParams.length > 0 && (
                <div className="space-config__selected-params">
                  <h6 className="space-config__selected-params-title">Selected Parameters:</h6>
                  <div className="space-config__selected-params-list">
                    {selectedParams.map(param => (
                      <span key={param} className="space-config__selected-param">
                        {param}
                        <button
                          onClick={() => toggleParam(param)}
                          className="space-config__remove-param"
                          title={`Remove ${param}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <p className="space-config__params-help">
                    These parameters will be available when using the Profile Lookup tool
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SpaceConfig;
