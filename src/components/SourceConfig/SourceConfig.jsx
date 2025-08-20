import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { saveWriteKey, getStoredWriteKey, validateWriteKey, saveSourceConfig, getStoredSourceConfig } from '../../utils/segmentAPI';
import './SourceConfig.css';

const SourceConfig = ({ isOpen, onClose, unifySpaceSlug }) => {
  const [sources, setSources] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [activeTab, setActiveTab] = useState('sources');
  const [autoSaving, setAutoSaving] = useState(false);

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  // Helper functions for generating Segment URLs
  const processUnifySpaceInput = (input) => {
    if (!input || !input.trim()) return '';
    
    // Check if input contains a Segment URL pattern (handles both unify and engage)
    const urlMatch = input.match(/segment\.com\/[^/]+\/(?:unify|engage)\/spaces\/([^/]+)/);
    if (urlMatch) {
      return urlMatch[1]; // Extract the slug from the URL
    }
    
    // If it's not a URL, assume it's just the slug itself
    return input.trim();
  };

  const extractWorkspaceSlug = (input) => {
    if (!input || !input.trim()) return null;
    
    // Match pattern: https://app.segment.com/workspace-slug/...
    const workspaceMatch = input.match(/https?:\/\/app\.segment\.com\/([^/]+)/);
    if (workspaceMatch) {
      return workspaceMatch[1];
    }
    
    return null;
  };

  const generatePageURL = (page) => {
    const processedSlug = processUnifySpaceInput(unifySpaceSlug);
    const extractedWorkspaceSlug = extractWorkspaceSlug(unifySpaceSlug);
    
    if (!processedSlug) return '';
    
    const basePath = extractedWorkspaceSlug 
      ? `https://app.segment.com/${extractedWorkspaceSlug}/unify/spaces/${processedSlug}`
      : `https://app.segment.com/goto-my-workspace/unify/spaces/${processedSlug}`;
    
    const pagePaths = {
      'profile-sources': '/settings/sources'
    };
    
    return `${basePath}${pagePaths[page] || ''}`;
  };

  const handleClose = async () => {
    // Auto-save configuration before closing
    try {
      await saveSourceConfig(sources);
      console.log('Source configuration saved on modal close');
    } catch (error) {
      console.warn('Failed to save source configuration on modal close:', error);
    }
    onClose();
  };

  // Initialize sources from stored configuration or create default ones from all available types
  useEffect(() => {
    const storedSources = getStoredSourceConfig();
    if (storedSources.length > 0) {
      setSources(storedSources);
    } else {
      // Create default sources for all available source types
      const defaultSources = Object.keys(sourceTypes).map((type, index) => ({
        id: `${type}-source-${index + 1}`,
        name: sourceTypes[type].name,
        type: type,
        enabled: type === 'javascript', // Enable JavaScript by default
        settings: sourceTypes[type].settings.reduce((acc, setting) => {
          if (setting.key === 'writeKey') {
            acc[setting.key] = type === 'javascript' ? (getStoredWriteKey() || '') : '';
          } else if (setting.type === 'boolean') {
            acc[setting.key] = false;
          } else if (setting.type === 'number') {
            acc[setting.key] = setting.key === 'flushAt' ? 20 : 
                              setting.key === 'flushInterval' ? 10000 :
                              setting.key === 'timeout' ? 5000 :
                              setting.key === 'retries' ? 3 : 0;
          } else {
            acc[setting.key] = setting.key === 'endpoint' ? 'https://api.segment.io/v1' : '';
          }
          return acc;
        }, {})
      }));
      setSources(defaultSources);
    }
  }, []);

  // Sample source types with their common settings
  const sourceTypes = {
    'javascript': {
      name: 'Analytics.js (JavaScript)',
      icon: '🌐',
      description: 'Web analytics tracking with JavaScript SDK',
      settings: [
        { key: 'writeKey', label: 'Write Key', type: 'text', required: true }
      ]
    },
    'ios': {
      name: 'Analytics-iOS SDK',
      icon: '📱',
      description: 'Native iOS app analytics tracking',
      settings: [
        { key: 'writeKey', label: 'Write Key', type: 'text', required: true }
      ]
    },
    'android': {
      name: 'Analytics-Android SDK',
      icon: '🤖',
      description: 'Native Android app analytics tracking',
      settings: [
        { key: 'writeKey', label: 'Write Key', type: 'text', required: true }
      ]
    },
    'server': {
      name: 'Server-side Libraries',
      icon: '🖥️',
      description: 'Backend server tracking (Node.js, Python, etc.)',
      settings: [
        { key: 'writeKey', label: 'Write Key', type: 'text', required: true }
      ]
    },
    'http': {
      name: 'HTTP Tracking API',
      icon: '🔗',
      description: 'Direct HTTP API calls to Segment',
      settings: [
        { key: 'writeKey', label: 'Write Key', type: 'text', required: true }
      ]
    },
    'react-native': {
      name: 'React Native SDK',
      icon: '⚛️',
      description: 'Cross-platform mobile app analytics',
      settings: [
        { key: 'writeKey', label: 'Write Key', type: 'text', required: true }
      ]
    },
    'flutter': {
      name: 'Flutter SDK',
      icon: '🐦',
      description: 'Cross-platform mobile app analytics with Flutter',
      settings: [
        { key: 'writeKey', label: 'Write Key', type: 'text', required: true }
      ]
    },
    'unity': {
      name: 'Unity SDK',
      icon: '🎮',
      description: 'Game development analytics tracking',
      settings: [
        { key: 'writeKey', label: 'Write Key', type: 'text', required: true }
      ]
    }
  };

  const destinationTypes = {
    'segment': {
      name: 'Segment Warehouse',
      icon: '🏢',
      description: 'Segment data warehouse destinations',
      settings: [
        { key: 'connectionId', label: 'Connection ID', type: 'text', required: true },
        { key: 'syncMode', label: 'Sync Mode', type: 'select', options: ['append', 'upsert'] },
        { key: 'schema', label: 'Schema Name', type: 'text' },
        { key: 'prefix', label: 'Table Prefix', type: 'text' }
      ]
    },
    'amplitude': {
      name: 'Amplitude',
      icon: '📊',
      description: 'Product analytics platform',
      settings: [
        { key: 'apiKey', label: 'API Key', type: 'text', required: true },
        { key: 'secretKey', label: 'Secret Key', type: 'password', required: true },
        { key: 'trackAllPages', label: 'Track All Pages', type: 'boolean' },
        { key: 'trackUtmProperties', label: 'Track UTM Properties', type: 'boolean' }
      ]
    },
    'mixpanel': {
      name: 'Mixpanel',
      icon: '🎯',
      description: 'Event tracking and analytics',
      settings: [
        { key: 'token', label: 'Project Token', type: 'text', required: true },
        { key: 'apiSecret', label: 'API Secret', type: 'password' },
        { key: 'trackAllPages', label: 'Track All Pages', type: 'boolean' },
        { key: 'people', label: 'Enable People', type: 'boolean' }
      ]
    },
    'google-analytics': {
      name: 'Google Analytics',
      icon: '🔍',
      description: 'Web analytics service',
      settings: [
        { key: 'trackingId', label: 'Tracking ID', type: 'text', required: true },
        { key: 'domain', label: 'Domain', type: 'text' },
        { key: 'enhancedEcommerce', label: 'Enhanced E-commerce', type: 'boolean' },
        { key: 'anonymizeIp', label: 'Anonymize IP', type: 'boolean' }
      ]
    },
    'facebook-pixel': {
      name: 'Facebook Pixel',
      icon: '📘',
      description: 'Facebook advertising pixel',
      settings: [
        { key: 'pixelId', label: 'Pixel ID', type: 'text', required: true },
        { key: 'accessToken', label: 'Access Token', type: 'password' },
        { key: 'advancedMatching', label: 'Advanced Matching', type: 'boolean' },
        { key: 'valueFieldIdentifier', label: 'Value Field', type: 'text' }
      ]
    }
  };

  useEffect(() => {
    // Load stored configuration or initialize with all available source types
    const storedSources = getStoredSourceConfig();
    if (storedSources.length > 0) {
      setSources(storedSources);
    } else {
      // Create default sources for all available source types
      const defaultSources = Object.keys(sourceTypes).map((type, index) => ({
        id: `${type}-source-${index + 1}`,
        name: sourceTypes[type].name,
        type: type,
        enabled: type === 'javascript', // Enable JavaScript by default
        settings: sourceTypes[type].settings.reduce((acc, setting) => {
          if (setting.key === 'writeKey') {
            acc[setting.key] = type === 'javascript' ? (getStoredWriteKey() || '') : '';
          } else if (setting.type === 'boolean') {
            acc[setting.key] = false;
          } else if (setting.type === 'number') {
            acc[setting.key] = setting.key === 'flushAt' ? 20 : 
                              setting.key === 'flushInterval' ? 10000 :
                              setting.key === 'timeout' ? 5000 :
                              setting.key === 'retries' ? 3 : 0;
          } else {
            acc[setting.key] = setting.key === 'endpoint' ? 'https://api.segment.io/v1' : '';
          }
          return acc;
        }, {})
      }));
      setSources(defaultSources);
    }
    loadDestinations();
  }, []);

  const loadDestinations = async () => {
    setIsLoading(true);
    try {
      // Load destinations configuration
      setDestinations([
        {
          id: 'dest-amplitude-1',
          type: 'amplitude',
          name: 'Amplitude Analytics',
          enabled: true,
          settings: {
            apiKey: 'amp_api_key_example',
            secretKey: '••••••••••••••••',
            trackAllPages: true,
            trackUtmProperties: true
          }
        },
        {
          id: 'dest-ga-1',
          type: 'google-analytics',
          name: 'Google Analytics',
          enabled: false,
          settings: {
            trackingId: 'UA-XXXXXXXX-X',
            domain: 'auto',
            enhancedEcommerce: true,
            anonymizeIp: true
          }
        }
      ]);

      setMessage({ type: 'success', text: 'Configuration loaded successfully' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load configuration' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleSource = (sourceId) => {
    setSources(prev => prev.map(source => 
      source.id === sourceId 
        ? { ...source, enabled: !source.enabled }
        : source
    ));
  };

  const handleToggleDestination = (destId) => {
    setDestinations(prev => prev.map(dest => 
      dest.id === destId 
        ? { ...dest, enabled: !dest.enabled }
        : dest
    ));
  };

  // Handle changes to source settings
  const handleSourceSettingChange = (sourceId, settingKey, value) => {
    const updatedSources = sources.map(source => 
      source.id === sourceId 
        ? { 
            ...source, 
            settings: { 
              ...source.settings, 
              [settingKey]: value 
            }
          }
        : source
    );
    
    setSources(updatedSources);
    
    // Auto-save configuration when writeKey is changed
    if (settingKey === 'writeKey') {
      autoSaveSourceConfig(updatedSources);
    }
  };

  // Handle updating source name
  const handleSourceNameChange = (sourceId, newName) => {
    const updatedSources = sources.map(source => 
      source.id === sourceId 
        ? { ...source, name: newName }
        : source
    );
    
    setSources(updatedSources);
    autoSaveSourceConfig(updatedSources);
  };

  // Handle duplicating a source
  const handleDuplicateSource = (sourceId) => {
    const sourceIndex = sources.findIndex(source => source.id === sourceId);
    if (sourceIndex === -1) return;

    const originalSource = sources[sourceIndex];
    const sourceType = sourceTypes[originalSource.type];
    
    // Generate unique ID for the duplicated source
    const timestamp = Date.now();
    const duplicatedSource = {
      ...originalSource,
      id: `${originalSource.type}-source-${timestamp}`,
      name: `${originalSource.name} Copy`,
      settings: {
        ...originalSource.settings,
        writeKey: '' // Clear writeKey for the duplicate
      }
    };

    // Insert the duplicate right after the original source
    const updatedSources = [...sources];
    updatedSources.splice(sourceIndex + 1, 0, duplicatedSource);
    
    setSources(updatedSources);
    autoSaveSourceConfig(updatedSources);
  };

  // Auto-save source configuration (debounced to avoid excessive saves)
  const autoSaveSourceConfig = useCallback(
    useMemo(() => {
      let timeoutId = null;
      return (sources) => {
        if (timeoutId) clearTimeout(timeoutId);
        setAutoSaving(true);
        timeoutId = setTimeout(async () => {
          try {
            await saveSourceConfig(sources);
            console.log('Source configuration auto-saved');
            setMessage({ type: 'success', text: 'Configuration auto-saved' });
            // Clear the message after 2 seconds
            setTimeout(() => setMessage({ type: '', text: '' }), 2000);
          } catch (error) {
            console.warn('Failed to auto-save source configuration:', error);
            setMessage({ type: 'error', text: 'Failed to auto-save configuration' });
          } finally {
            setAutoSaving(false);
          }
        }, 500); // 500ms debounce
      };
    }, []),
    []
  );

  // Save configuration including writeKey to localStorage and .env
  const handleSaveConfiguration = async () => {
    setIsLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // Save sources configuration
      await saveSourceConfig(sources);
      
      // Find and save writeKey from enabled sources
      const enabledSources = sources.filter(source => source.enabled);
      let writeKeySaved = false;

      for (const source of enabledSources) {
        const writeKey = source.settings?.writeKey;
        if (writeKey && validateWriteKey(writeKey)) {
          await saveWriteKey(writeKey);
          writeKeySaved = true;
          break; // Use the first valid writeKey found
        }
      }

      if (writeKeySaved) {
        setMessage({ 
          type: 'success', 
          text: 'Configuration saved successfully to localStorage and .env file. WriteKey is now available for event simulation.' 
        });
      } else {
        setMessage({ 
          type: 'warning', 
          text: 'Configuration saved, but no valid writeKey found. Configure a writeKey in an enabled source to send events to Segment.' 
        });
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: 'Failed to save configuration: ' + error.message 
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Test connection to Segment API for a specific source
  const handleTestConnection = async (sourceId = null) => {
    setIsLoading(true);
    setMessage({ type: '', text: '' });

    let writeKey;
    let sourceName = 'configured source';

    try {
      if (sourceId) {
        // Test specific source
        const source = sources.find(s => s.id === sourceId);
        if (!source) {
          setMessage({ 
            type: 'error', 
            text: 'Source not found for testing.' 
          });
          return;
        }

        writeKey = source.settings?.writeKey;
        sourceName = source.name;

        if (!writeKey) {
          setMessage({ 
            type: 'error', 
            text: `No writeKey configured for ${sourceName}. Please add a writeKey first.` 
          });
          return;
        }
      } else {
        // Test general connection using stored writeKey
        writeKey = getStoredWriteKey();
        if (!writeKey) {
          setMessage({ 
            type: 'error', 
            text: 'No writeKey found. Please configure and save a writeKey first.' 
          });
          return;
        }
      }

      if (!validateWriteKey(writeKey)) {
        setMessage({ 
          type: 'error', 
          text: `Invalid writeKey format for ${sourceName}. Please check your writeKey configuration.` 
        });
        return;
      }

      // Test with a simple identify call
      const testPayload = {
        userId: 'test-user-' + Date.now(),
        traits: {
          name: 'Test User',
          email: 'test@example.com',
          source: sourceName
        }
      };

      // Import the API function here to avoid circular dependencies
      const { sendIdentifyEvent } = await import('../../utils/segmentAPI');
      await sendIdentifyEvent(writeKey, testPayload);

      setMessage({ 
        type: 'success', 
        text: `Connection test successful for ${sourceName}! Events can be sent to Segment.` 
      });
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: `Connection test failed for ${sourceName}: ` + error.message 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderSettingField = (setting, value, onChange) => {
    const commonProps = {
      id: setting.key,
      value: value || '',
      onChange: (e) => onChange(setting.key, e.target.value),
      className: "source-config__setting-input"
    };

    switch (setting.type) {
      case 'boolean':
        return (
          <input
            {...commonProps}
            type="checkbox"
            checked={value || false}
            onChange={(e) => onChange(setting.key, e.target.checked)}
            className="source-config__setting-checkbox"
          />
        );
      case 'number':
        return (
          <input
            {...commonProps}
            type="number"
            placeholder={`Enter ${setting.label.toLowerCase()}`}
          />
        );
      case 'password':
        return (
          <input
            {...commonProps}
            type="password"
            placeholder={`Enter ${setting.label.toLowerCase()}`}
          />
        );
      case 'select':
        return (
          <select {...commonProps}>
            <option value="">Select {setting.label}</option>
            {setting.options?.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        );
      default:
        // Special handling for writeKey fields - placeholder that disappears on focus
        if (setting.key === 'writeKey') {
          return (
            <input
              {...commonProps}
              type="text"
              placeholder="Enter your Segment Write Key"
              required={setting.required}
            />
          );
        }
        return (
          <input
            {...commonProps}
            type="text"
            placeholder={`Enter ${setting.label.toLowerCase()}`}
            required={setting.required}
          />
        );
    }
  };

  const renderSourceCard = (source) => {
    const sourceType = sourceTypes[source.type];
    if (!sourceType) return null;

    return (
      <div key={source.id} className={`source-config__card ${!source.enabled ? 'source-config__card--disabled' : ''}`}>
        <div className="source-config__card-header">
          <div className="source-config__card-icon">{sourceType.icon}</div>
          <div className="source-config__card-info">
            <div className="source-config__card-name-section">
              <input
                type="text"
                value={source.name}
                onChange={(e) => handleSourceNameChange(source.id, e.target.value)}
                className="source-config__card-title-input"
                placeholder="Enter source name"
              />
              <p className="source-config__card-type">{sourceType.name}</p>
            </div>
            <p className="source-config__card-description">{sourceType.description}</p>
          </div>
          <div className="source-config__card-actions">
            <button
              onClick={() => handleDuplicateSource(source.id)}
              className="source-config__duplicate-button"
              title="Duplicate source"
            >
              ⧉
            </button>
            <button
              onClick={() => handleToggleSource(source.id)}
              className={`source-config__toggle-button ${source.enabled ? 'source-config__toggle-button--enabled' : 'source-config__toggle-button--disabled'}`}
              title={source.enabled ? 'Disable source' : 'Enable source'}
            >
              {source.enabled ? '✓' : '✗'}
            </button>
          </div>
        </div>

        {source.enabled && (
          <div className="source-config__card-settings">
            <div className="source-config__settings-header">
              <h5 className="source-config__settings-title">Configuration</h5>
              {source.settings?.writeKey && (
                <button
                  onClick={() => handleTestConnection(source.id)}
                  disabled={isLoading}
                  className="source-config__test-button source-config__test-button--small"
                  title={`Test connection for ${source.name}`}
                >
                  {isLoading ? 'Testing...' : 'Test Connection'}
                </button>
              )}
            </div>
            <div className="source-config__settings-grid">
              {sourceType.settings.map(setting => (
                <div key={setting.key} className="source-config__setting">
                  <label className="source-config__setting-label" htmlFor={setting.key}>
                    {setting.label}
                    {setting.required && <span className="source-config__required">*</span>}
                  </label>
                  {renderSettingField(
                    setting,
                    source.settings[setting.key],
                    (key, value) => handleSourceSettingChange(source.id, key, value)
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderDestinationCard = (destination) => {
    const destType = destinationTypes[destination.type];
    if (!destType) return null;

    return (
      <div key={destination.id} className={`source-config__card ${!destination.enabled ? 'source-config__card--disabled' : ''}`}>
        <div className="source-config__card-header">
          <div className="source-config__card-icon">{destType.icon}</div>
          <div className="source-config__card-info">
            <h4 className="source-config__card-title">{destination.name}</h4>
            <p className="source-config__card-type">{destType.name}</p>
            <p className="source-config__card-description">{destType.description}</p>
          </div>
          <div className="source-config__card-toggle">
            <button
              onClick={() => handleToggleDestination(destination.id)}
              className={`source-config__toggle-button ${destination.enabled ? 'source-config__toggle-button--enabled' : 'source-config__toggle-button--disabled'}`}
              title={destination.enabled ? 'Disable destination' : 'Enable destination'}
            >
              {destination.enabled ? '✓' : '✗'}
            </button>
          </div>
        </div>

        {destination.enabled && (
          <div className="source-config__card-settings">
            <h5 className="source-config__settings-title">Configuration</h5>
            <div className="source-config__settings-grid">
              {destType.settings.map(setting => (
                <div key={setting.key} className="source-config__setting">
                  <label className="source-config__setting-label" htmlFor={setting.key}>
                    {setting.label}
                    {setting.required && <span className="source-config__required">*</span>}
                  </label>
                  {renderSettingField(
                    setting,
                    destination.settings[setting.key],
                    (key, value) => {
                      setDestinations(prev => prev.map(d =>
                        d.id === destination.id
                          ? { ...d, settings: { ...d.settings, [key]: value } }
                          : d
                      ));
                    }
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="source-config__overlay" onClick={handleOverlayClick}>
      <div className="source-config__modal">
        <div className="source-config__modal-header">
          <h2 className="source-config__title">Source Configuration</h2>
          <div className="source-config__header-actions">
            <button 
              onClick={handleSaveConfiguration}
              disabled={isLoading}
              className="source-config__save-button source-config__save-button--header"
            >
              {isLoading ? 'Saving...' : 'Save Configuration'}
            </button>
            <button
              onClick={handleClose}
              className="source-config__close"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="source-config__modal-content">
          <div className="source-config">
            <div className="source-config__header">
              <p className="source-config__description">
                Configure your Profile Sources and destinations to track events and send data to various platforms.
              </p>
            </div>

            {message.text && (
              <div className={`source-config__message source-config__message--${message.type}`}>
                {message.text}
              </div>
            )}

            {autoSaving && (
              <div className="source-config__message source-config__message--info">
                Auto-saving configuration...
              </div>
            )}

  {/* Tabs removed: Only sources are shown, so no tab UI needed */}

      <div className="source-config__content">
        {isLoading ? (
          <div className="source-config__loading">
            <p>Loading configuration...</p>
          </div>
        ) : (
          <>
            {/* Only show sources section, Destinations tab and content commented out */}
            <div className="source-config__sources">
              <div className="source-config__section-header">
                <h3 className="source-config__section-title">
                  Profile Sources
                  {unifySpaceSlug && processUnifySpaceInput(unifySpaceSlug) && (
                    <span style={{ fontSize: '0.6em', fontWeight: 'normal', marginLeft: '12px', display: 'block', marginTop: '4px' }}>
                      <a 
                        href={generatePageURL('profile-sources')} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ color: '#0066cc', textDecoration: 'underline' }}
                      >
                        Check that each of these sources are added in your Unify Space as Profile Sources, which forward their data to Unify.
                      </a>
                    </span>
                  )}
                </h3>
                <p className="source-config__section-description">
                  Configure where your event data is coming from. Sources collect and send data to Segment.
                </p>
              </div>
              <div className="source-config__cards">
                {sources
                  .sort((a, b) => {
                    // Sort enabled sources first, then by name
                    if (a.enabled && !b.enabled) return -1;
                    if (!a.enabled && b.enabled) return 1;
                    return a.name.localeCompare(b.name);
                  })
                  .map(renderSourceCard)}
              </div>
              {sources.length === 0 && (
                <div className="source-config__empty">
                  <p>No sources configured. Add sources to start collecting data.</p>
                </div>
              )}
            </div>
            {/*
            <div className="source-config__destinations">
              <div className="source-config__section-header">
                <h3 className="source-config__section-title">Destinations</h3>
                <p className="source-config__section-description">
                  Configure where your event data is sent. Destinations receive data from your sources.
                </p>
              </div>
              <div className="source-config__cards">
                {destinations.map(renderDestinationCard)}
              </div>
              {destinations.length === 0 && (
                <div className="source-config__empty">
                  <p>No destinations configured. Add destinations to send data to external platforms.</p>
                </div>
              )}
            </div>
            */}
          </>
        )}
      </div>

      <div className="source-config__actions">
        <button 
          onClick={() => handleTestConnection()}
          disabled={isLoading}
          className="source-config__test-button"
        >
          {isLoading ? 'Testing...' : 'Test General Connection'}
        </button>
      </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SourceConfig;
