import React, { useState, useEffect } from 'react';
import './SpaceConfig.css';

const SpaceConfig = () => {
  const [spaceId, setSpaceId] = useState('');
  const [profileApiToken, setProfileApiToken] = useState('');
  const [unifySpaceSlug, setUnifySpaceSlug] = useState('');
  const [unifyWorkspaceSlug, setUnifyWorkspaceSlug] = useState('');
  const [personasEnabled, setPersonasEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [hasExistingToken, setHasExistingToken] = useState(false);
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

  // Helper function to extract slug from Segment URL or validate/format slug
  const processUnifySpaceInput = (input) => {
    if (!input.trim()) return '';
    
    // Check if input contains a Segment URL pattern (handles both unify and engage)
    const urlMatch = input.match(/segment\.com\/[^/]+\/(?:unify|engage)\/spaces\/([^/]+)/);
    if (urlMatch) {
      return urlMatch[1]; // Extract the slug from the URL
    }
    
    // If it's not a URL, assume it's just the slug itself
    return input.trim();
  };

  // Helper function to extract workspace slug from full Segment URL
  const extractWorkspaceSlug = (input) => {
    if (!input.trim()) return null;
    
    // Match pattern: https://app.segment.com/workspace-slug/...
    const workspaceMatch = input.match(/https?:\/\/app\.segment\.com\/([^/]+)/);
    if (workspaceMatch) {
      return workspaceMatch[1];
    }
    
    return null;
  };

  // Helper function to generate the full Segment workspace URL
  const generateSegmentURL = (slug, workspaceSlug = null) => {
    if (!slug) return '';
    
    // Use the stored workspace slug or the provided one
    const finalWorkspaceSlug = workspaceSlug || unifyWorkspaceSlug;
    
    // If we have a workspace slug, use it with unify and default to explorer
    if (finalWorkspaceSlug) {
      return `https://app.segment.com/${finalWorkspaceSlug}/unify/spaces/${slug}/explorer`;
    }
    
    // Otherwise use the generic format with unify and default to explorer
    return `https://app.segment.com/goto-my-workspace/unify/spaces/${slug}/explorer`;
  };

  // Helper function to generate specific page URLs
  const generatePageURL = (page, slug = null, workspaceSlug = null) => {
    const processedSlug = slug || processUnifySpaceInput(unifySpaceSlug);
    const finalWorkspaceSlug = workspaceSlug || unifyWorkspaceSlug || extractWorkspaceSlug(unifySpaceSlug);
    
    if (!processedSlug) return '';
    
    const basePath = finalWorkspaceSlug 
      ? `https://app.segment.com/${finalWorkspaceSlug}/unify/spaces/${processedSlug}`
      : `https://app.segment.com/goto-my-workspace/unify/spaces/${processedSlug}`;
    
    const pagePaths = {
      'identity-resolution': '/settings/identity-resolution',
      'profile-sources': '/settings/sources', 
      'profile-api-access': '/settings/api-access',
      'explorer': '/explorer'
    };
    
    return `${basePath}${pagePaths[page] || ''}`;
  };

  useEffect(() => {
    loadCurrentConfig();
  }, []);

  const loadCurrentConfig = async () => {
    try {
      const response = await fetch('http://localhost:8888/api/config');
      const config = await response.json();
      
      if (config.spaceId) {
        setSpaceId(config.spaceId);
      }
      if (config.unifySpaceSlug) {
        setUnifySpaceSlug(config.unifySpaceSlug);
      }
      // Prioritize full URL if it exists, otherwise use slug
      if (config.unifySpaceFullUrl) {
        setUnifySpaceSlug(config.unifySpaceFullUrl);
      } else if (config.unifySpaceSlug) {
        setUnifySpaceSlug(config.unifySpaceSlug);
      }
      if (config.unifyWorkspaceSlug) {
        setUnifyWorkspaceSlug(config.unifyWorkspaceSlug);
      }
      if (config.hasToken) {
        setProfileApiToken('••••••••••••••••');
        setHasExistingToken(true);
      } else {
        setHasExistingToken(false);
      }
      if (config.integrations && typeof config.integrations.personas === 'boolean') {
        setPersonasEnabled(config.integrations.personas);
      }
    } catch (error) {
      console.error('Error loading configuration:', error);
    }
  };

  const handleSave = async () => {
    if (!spaceId.trim()) {
      setMessage({ type: 'error', text: 'Space ID is required' });
      return;
    }

    // Check if we have a valid token - either a new one entered or existing one in .env
    const isTokenMasked = profileApiToken === '••••••••••••••••';
    const hasValidToken = (isTokenMasked && hasExistingToken) || (!isTokenMasked && profileApiToken.trim());
    
    if (!hasValidToken) {
      setMessage({ type: 'error', text: 'Please enter a valid Profile API Token' });
      return;
    }

    // Process the Unify Space input to extract both the space slug and workspace slug
    const processedSlug = processUnifySpaceInput(unifySpaceSlug);
    const extractedWorkspaceSlug = extractWorkspaceSlug(unifySpaceSlug);

    setIsLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // Prepare the request body
      const requestBody = {
        spaceId: spaceId.trim(),
        unifySpaceSlug: processedSlug,
        unifySpaceFullUrl: unifySpaceSlug.trim(), // Store the original input for persistence
        unifyWorkspaceSlug: extractedWorkspaceSlug,
        integrations: {
          personas: personasEnabled
        }
      };

      // Only include accessToken if it's not the masked version (meaning user entered a new token)
      if (!isTokenMasked) {
        requestBody.accessToken = profileApiToken.trim();
      }

      const response = await fetch('http://localhost:8888/api/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Configuration saved successfully!' });
        // Obfuscate the token after successful save only if a new token was provided
        if (!isTokenMasked) {
          setProfileApiToken('••••••••••••••••');
          setHasExistingToken(true);
        }
        // Keep the original unify space input (full URL or slug) for user display
        // The processed slug and workspace slug are handled internally
        if (extractedWorkspaceSlug) {
          setUnifyWorkspaceSlug(extractedWorkspaceSlug);
        }
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
    setProfileApiToken(value);
    // If user starts typing and it's not the masked version, we no longer have the existing token
    if (value !== '••••••••••••••••') {
      setHasExistingToken(false);
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

        <div className="space-config__field">
          <label className="space-config__label">
            Unify Space Slug / URL
          </label>
          <input
            type="text"
            value={unifySpaceSlug}
            onChange={(e) => setUnifySpaceSlug(e.target.value)}
            placeholder="Enter space slug (e.g., 'dev-unify') or full URL"
            className="space-config__input"
          />
          <p className="space-config__help">
            Enter your Unify space slug or the full Segment URL. This will be used to create links to your workspace.
            {unifySpaceSlug && processUnifySpaceInput(unifySpaceSlug) && (
              <>
                <br />
                <strong>Generated URL:</strong>{' '}
                <a 
                  href={generateSegmentURL(processUnifySpaceInput(unifySpaceSlug))} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ color: '#0066cc', textDecoration: 'underline' }}
                >
                  {generateSegmentURL(processUnifySpaceInput(unifySpaceSlug))}
                </a>
              </>
            )}
          </p>
        </div>

        <div className="space-config__form">
          <div className="space-config__field">
            <label className="space-config__label">
              Space ID <span className="space-config__required">*</span>
              {unifySpaceSlug && processUnifySpaceInput(unifySpaceSlug) && (
                <span style={{ fontSize: '0.75em', fontWeight: 'normal', marginLeft: '8px' }}>
                  <a 
                    href={generatePageURL('profile-api-access')} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ color: '#0066cc', textDecoration: 'underline' }}
                  >
                    Locate Space ID
                  </a>
                </span>
              )}
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
              {unifySpaceSlug && processUnifySpaceInput(unifySpaceSlug) && (
                <span style={{ fontSize: '0.75em', fontWeight: 'normal', marginLeft: '8px' }}>
                  <a 
                    href={generatePageURL('profile-api-access')} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ color: '#0066cc', textDecoration: 'underline' }}
                  >
                    Locate Profile API Token
                  </a>
                  {' → + Generate Token button'}
                </span>
              )}
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

          {/* <div className="space-config__field">
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
          </div> */}

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

      {/* <div className="space-config__section">
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
                    These parameters will be available when using the Profile API Lookup tool
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div> */}
    </div>
  );
};

export default SpaceConfig;
