import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import './IdResConfig.css';

const IdResConfig = forwardRef((props, ref) => {
  const { unifySpaceSlug } = props;
  const defaultIdentifiers = [
    { id: 'user_id', name: 'User ID', enabled: true, isCustom: false, limit: 1, frequency: 'Ever' },
    { id: 'email', name: 'Email', enabled: true, isCustom: false, limit: 3, frequency: 'Ever' },
    { id: 'phone', name: 'Phone', enabled: true, isCustom: false, limit: 2, frequency: 'Ever' },
    { id: 'android.id', name: 'Android ID', enabled: true, isCustom: false, limit: 1, frequency: 'Ever' },
    { id: 'android.idfa', name: 'Android IDFA', enabled: true, isCustom: false, limit: 1, frequency: 'Monthly' },
    { id: 'android.push_token', name: 'Android Push Token', enabled: true, isCustom: false, limit: 5, frequency: 'Monthly' },
    { id: 'anonymous_id', name: 'Anonymous ID', enabled: true, isCustom: false, limit: 10, frequency: 'Ever' },
    { id: 'ga_client_id', name: 'GA Client ID', enabled: true, isCustom: false, limit: 3, frequency: 'Monthly' },
    { id: 'ios.id', name: 'iOS ID', enabled: true, isCustom: false, limit: 1, frequency: 'Ever' },
    { id: 'ios.idfa', name: 'iOS IDFA', enabled: true, isCustom: false, limit: 1, frequency: 'Monthly' },
    { id: 'ios.push_token', name: 'iOS Push Token', enabled: true, isCustom: false, limit: 5, frequency: 'Monthly' },
  ];

  const [identifiers, setIdentifiers] = useState(() => {
    const saved = localStorage.getItem('idres_config_identifiers');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return [...defaultIdentifiers];
  });

  // Track deleted identifiers for restoration
  const [deletedIdentifiers, setDeletedIdentifiers] = useState([]);
  // Expose saveConfig method to parent
  useImperativeHandle(ref, () => ({
    saveConfig: () => {
      localStorage.setItem('idres_config_identifiers', JSON.stringify(identifiers));
    }
  }), [identifiers]);
  const [newCustomId, setNewCustomId] = useState('');
  const [draggedItem, setDraggedItem] = useState(null);
  const [expandedIdentifier, setExpandedIdentifier] = useState(null);

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
      'identity-resolution': '/settings/identity-resolution'
    };
    
    return `${basePath}${pagePaths[page] || ''}`;
  };

  // Event payload locations for each identifier type
  const identifierLocations = {
    'user_id': [
      'Root level: { "userId": "value" }'
    ],
    'email': [
      'Identify/Group traits: { "traits": { "email": "value" } }',
      'Track/Page/Screen properties: { "properties": { "email": "value" } }',
      'Context externalIds: { "context": { "externalIds": [{ "type": "email", "id": "value" }] } }',
      'Context traits: { "context": { "traits": { "email": "value" } } }'
    ],
    'phone': [
      'Identify/Group traits: { "traits": { "phone": "value" } }',
      'Track/Page/Screen properties: { "properties": { "phone": "value" } }',
      'Context externalIds: { "context": { "externalIds": [{ "type": "phone", "id": "value" }] } }',
      'Context traits: { "context": { "traits": { "phone": "value" } } }'
    ],
    'android.id': [
      'Context device: { "context": { "device": { "type": "android", "id": "value" } } }'
    ],
    'android.idfa': [
      'Context device: { "context": { "device": { "type": "android", "adTrackingEnabled": true, "advertisingId": "value" } } }'
    ],
    'android.push_token': [
      'Context device: { "context": { "device": { "type": "android", "token": "value" } } }'
    ],
    'anonymous_id': [
      'Root level: { "anonymousId": "value" }'
    ],
    'ga_client_id': [
      'Context integrations: { "context": { "integrations": { "Google Analytics": { "clientId": "value" } } } }'
    ],
    'ios.id': [
      'Context device: { "context": { "device": { "type": "ios", "id": "value" } } }'
    ],
    'ios.idfa': [
      'Context device: { "context": { "device": { "type": "ios", "advertisingId": "value" } } }'
    ],
    'ios.push_token': [
      'Context device: { "context": { "device": { "type": "ios", "token": "value" } } }'
    ]
  };

  const handleDragStart = (e, index) => {
    setDraggedItem({ index });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    if (!draggedItem) return;
    const { index: sourceIndex } = draggedItem;
    if (sourceIndex === targetIndex) return;
    const newIdentifiers = [...identifiers];
    const [movedItem] = newIdentifiers.splice(sourceIndex, 1);
    newIdentifiers.splice(targetIndex, 0, movedItem);
    setIdentifiers(newIdentifiers);
    setDraggedItem(null);
  };

  const toggleIdentifier = (index) => {
    setIdentifiers(prev =>
      prev.map((item, i) =>
        i === index ? { ...item, enabled: !item.enabled } : item
      )
    );
  };

  const updateLimit = (index, newLimit) => {
    setIdentifiers(prev =>
      prev.map((item, i) =>
        i === index ? { ...item, limit: Math.max(1, newLimit) } : item
      )
    );
  };

  const updateFrequency = (index, newFrequency) => {
    setIdentifiers(prev =>
      prev.map((item, i) =>
        i === index ? { ...item, frequency: newFrequency } : item
      )
    );
  };

  // Helper to normalize identifier: lowercase, snake_case, preserve dots
  const normalizeIdentifier = (str) => {
    return str
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_.]/g, '');
  };

  const addCustomIdentifier = () => {
    if (!newCustomId.trim()) return;
    const norm = normalizeIdentifier(newCustomId);
    const customId = {
      id: norm,
      name: newCustomId,
      enabled: true,
      isCustom: true,
      limit: 1,
      frequency: 'Ever'
    };
    setIdentifiers(prev => [...prev, customId]);
    setNewCustomId('');
  };

  const removeIdentifier = (index) => {
    setIdentifiers(prev => {
      const removed = prev[index];
      // Only add to deleted if not custom
      if (!removed.isCustom) {
        setDeletedIdentifiers(dels => [...dels, removed]);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  // Restore a deleted identifier from bubble
  const restoreDeletedIdentifier = (identifier) => {
    setIdentifiers(prev => [...prev, identifier]);
    setDeletedIdentifiers(dels => dels.filter(d => d.id !== identifier.id));
  };

  // Restore default IDs, preserving custom ones
  const handleRestoreDefaultIDs = () => {
    setIdentifiers(prev => {
      const custom = prev.filter(id => id.isCustom);
      // Only add defaults not already present
      const currentIds = prev.map(id => id.id);
      const restored = defaultIdentifiers.filter(def => !currentIds.includes(def.id));
      return [...custom, ...defaultIdentifiers];
    });
    setDeletedIdentifiers([]);
  };

  const toggleExpanded = (identifierId) => {
    setExpandedIdentifier(expandedIdentifier === identifierId ? null : identifierId);
  };

  const getCustomIdentifierLocations = () => [
    'Identify/Group traits: { "traits": { "custom_field": "value" } }',
    'Track/Page/Screen properties: { "properties": { "custom_field": "value" } }',
    'Context externalIds: { "context": { "externalIds": [{ "type": "custom_field", "id": "value" }] } }',
    'Context traits: { "context": { "traits": { "custom_field": "value" } } }'
  ];

  // Optionally, save on unmount (in case modal is closed by other means)
  useEffect(() => {
    return () => {
      localStorage.setItem('idres_config_identifiers', JSON.stringify(identifiers));
    };
  }, [identifiers]);

  return (
    <div className="idres-config">
      <div className="idres-config__section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h3 className="idres-config__section-title" style={{ margin: 0 }}>
            Identity Resolution Configuration
          </h3>
          {unifySpaceSlug && processUnifySpaceInput(unifySpaceSlug) && (
            <a 
              href={generatePageURL('identity-resolution')} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ 
                color: '#0066cc', 
                textDecoration: 'underline',
                fontSize: '0.75em',
                whiteSpace: 'nowrap'
              }}
            >
              Locate Unify Space's Identity Resolution Settings
            </a>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <p className="idres-config__section-description" style={{ margin: 0 }}>
            Configure the order and priority of identity fields used for profile resolution. Drag and drop to reorder identifiers by priority.
          </p>
          <button
            className="idres-config__add-custom-button"
            onClick={handleRestoreDefaultIDs}
            title="Restore default identifiers"
          >
            Restore Default IDs
          </button>
        </div>

        <div className="idres-config__identifiers">
          <div className="idres-config__identifier-list">
            {identifiers.map((identifier, index) => (
              <div
                key={identifier.id}
                className={`idres-config__identifier idres-config__identifier--${identifier.isCustom ? 'custom' : 'standard'} ${!identifier.enabled ? 'idres-config__identifier--disabled' : ''}`}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, index)}
              >
                <div className="idres-config__identifier-header">
                  <div className="idres-config__identifier-drag">
                    <span className="idres-config__drag-handle">⋮⋮</span>
                    <span className="idres-config__identifier-priority">{index + 1}</span>
                  </div>
                  <div className="idres-config__identifier-info">
                    <span className="idres-config__identifier-name" style={{ flex: 1, textAlign: 'left' }}>{normalizeIdentifier(identifier.id)}</span>
                    <span className="idres-config__identifier-flag-wrapper">
                      {!identifier.isCustom && <span className="idres-config__default-badge">DEFAULT</span>}
                      {identifier.isCustom && <span className="idres-config__custom-badge">CUSTOM</span>}
                    </span>
                  </div>
                  <div className="idres-config__identifier-controls">
                    <div className="idres-config__control-group">
                      <label className="idres-config__control-label" title="The maximum number of unique values for the identifier that a profile can accept.">
                        Limit
                      </label>
                      <div className="idres-config__limit-control">
                        <button
                          className="idres-config__limit-button"
                          onClick={() => updateLimit(index, (identifier.limit || 1) - 1)}
                          disabled={(identifier.limit || 1) <= 1}
                          title="Decrease limit"
                        >
                          ◀
                        </button>
                        <span className="idres-config__limit-value">{identifier.limit || 1}</span>
                        <button
                          className="idres-config__limit-button"
                          onClick={() => updateLimit(index, (identifier.limit || 1) + 1)}
                          title="Increase limit"
                        >
                          ▶
                        </button>
                      </div>
                    </div>
                    <div className="idres-config__control-group">
                      <label className="idres-config__control-label" title="The maximum number of unique values for the identifier that a profile can accept.">
                        Frequency
                      </label>
                      <select
                        className="idres-config__frequency-select"
                        value={identifier.frequency || 'Ever'}
                        onChange={(e) => updateFrequency(index, e.target.value)}
                        title="The maximum number of unique values for the identifier that a profile can accept."
                      >
                        <option value="Daily">Daily</option>
                        <option value="Weekly">Weekly</option>
                        <option value="Monthly">Monthly</option>
                        <option value="Annually">Annually</option>
                        <option value="Ever">Ever</option>
                      </select>
                    </div>
                  </div>
                  <div className="idres-config__identifier-actions">
                    <button
                      onClick={() => toggleExpanded(identifier.id)}
                      className="idres-config__expand-button"
                      title="View payload locations"
                    >
                      <span role="img" aria-label="View payload locations">📍</span>
                    </button>
                    <button
                      onClick={() => toggleIdentifier(index)}
                      className={`idres-config__toggle-button ${identifier.enabled ? 'idres-config__toggle-button--enabled' : 'idres-config__toggle-button--disabled'}`}
                      title={identifier.enabled ? 'Disable' : 'Enable'}
                    >
                      {identifier.enabled ? '✓' : '✗'}
                    </button>
                    <button
                      onClick={() => removeIdentifier(index)}
                      className="idres-config__remove-button"
                      title="Remove identifier"
                    >
                      🗑
                    </button>
                  </div>
                </div>
                {expandedIdentifier === identifier.id && (
                  <div className="idres-config__identifier-details">
                    <h5 className="idres-config__details-title">Event Payload Locations:</h5>
                    <ul className="idres-config__locations-list">
                      {(identifier.isCustom ? getCustomIdentifierLocations() : identifierLocations[identifier.id])?.map((location, i) => {
                        let label = '', code = location;
                        const colonIdx = location.indexOf(':');
                        if (colonIdx !== -1) {
                          label = location.slice(0, colonIdx + 1);
                          code = location.slice(colonIdx + 1).trim();
                        }
                        return (
                          <li key={i} className="idres-config__location-item" style={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                            {label && <span style={{ fontWeight: 'bold', minWidth: 0, fontSize: '11px', marginRight: 4 }}>{label}</span>}
                            <span style={{ background: '#f3f4f6', borderRadius: '4px', padding: '1px 4px', fontFamily: 'monospace', fontSize: '11px', display: 'inline-block' }}>{code}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="idres-config__add-custom">
          <h4 className="idres-config__subsection-title">Add Custom Identifier</h4>
          <div className="idres-config__add-custom-form">
            <input
              type="text"
              value={newCustomId}
              onChange={(e) => setNewCustomId(e.target.value)}
              placeholder="Enter custom identifier name (e.g., membership_id)"
              className="idres-config__add-custom-input"
              onKeyPress={(e) => e.key === 'Enter' && addCustomIdentifier()}
            />
            <button
              onClick={addCustomIdentifier}
              disabled={!newCustomId.trim()}
              className="idres-config__add-custom-button"
            >
              Add Custom ID
            </button>
          </div>
          <p className="idres-config__add-custom-help">
            Custom identifiers follow the same event payload patterns as email and phone fields
          </p>
        </div>

        {/* Deleted identifiers bubbles for restoration */}
        {deletedIdentifiers.length > 0 && (
          <div className="idres-config__restore-list" style={{ marginTop: '18px', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontWeight: 'bold', fontSize: '0.95em', marginRight: '8px' }}>Restore:</span>
            {deletedIdentifiers.map(identifier => (
              <span
                key={identifier.id}
                className="idres-config__restore-bubble"
                style={{ background: '#e0e7ff', borderRadius: '16px', padding: '4px 12px', cursor: 'pointer', fontSize: '0.95em', border: '1px solid #6366f1' }}
                onClick={() => restoreDeletedIdentifier(identifier)}
                title={`Restore ${identifier.name}`}
              >
                {identifier.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

export default IdResConfig;
