import React, { useState } from 'react';
import './IdResConfig.css';

const IdResConfig = () => {
  const [identifiers, setIdentifiers] = useState([
    { id: 'user_id', name: 'User ID', enabled: true },
    { id: 'email', name: 'Email', enabled: true },
    { id: 'phone', name: 'Phone', enabled: true },
    { id: 'android.id', name: 'Android ID', enabled: true },
    { id: 'android.idfa', name: 'Android IDFA', enabled: true },
    { id: 'android.push_token', name: 'Android Push Token', enabled: true },
    { id: 'anonymous_id', name: 'Anonymous ID', enabled: true },
    { id: 'ga_client_id', name: 'GA Client ID', enabled: true },
    { id: 'ios.id', name: 'iOS ID', enabled: true },
    { id: 'ios.idfa', name: 'iOS IDFA', enabled: true },
    { id: 'ios.push_token', name: 'iOS Push Token', enabled: true },
  ]);
  
  const [customIdentifiers, setCustomIdentifiers] = useState([]);
  const [newCustomId, setNewCustomId] = useState('');
  const [draggedItem, setDraggedItem] = useState(null);
  const [expandedIdentifier, setExpandedIdentifier] = useState(null);

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

  const handleDragStart = (e, index, isCustom = false) => {
    setDraggedItem({ index, isCustom });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetIndex, isCustomTarget = false) => {
    e.preventDefault();
    
    if (!draggedItem) return;

    const { index: sourceIndex, isCustom: isCustomSource } = draggedItem;

    // Handle different combinations of source and target
    if (isCustomSource && isCustomTarget) {
      // Custom to custom
      const newCustomIdentifiers = [...customIdentifiers];
      const [movedItem] = newCustomIdentifiers.splice(sourceIndex, 1);
      newCustomIdentifiers.splice(targetIndex, 0, movedItem);
      setCustomIdentifiers(newCustomIdentifiers);
    } else if (!isCustomSource && !isCustomTarget) {
      // Standard to standard
      const newIdentifiers = [...identifiers];
      const [movedItem] = newIdentifiers.splice(sourceIndex, 1);
      newIdentifiers.splice(targetIndex, 0, movedItem);
      setIdentifiers(newIdentifiers);
    }

    setDraggedItem(null);
  };

  const toggleIdentifier = (index, isCustom = false) => {
    if (isCustom) {
      setCustomIdentifiers(prev => 
        prev.map((item, i) => 
          i === index ? { ...item, enabled: !item.enabled } : item
        )
      );
    } else {
      setIdentifiers(prev => 
        prev.map((item, i) => 
          i === index ? { ...item, enabled: !item.enabled } : item
        )
      );
    }
  };

  const addCustomIdentifier = () => {
    if (!newCustomId.trim()) return;
    
    const customId = {
      id: `custom_${newCustomId.toLowerCase().replace(/\s+/g, '_')}`,
      name: newCustomId,
      enabled: true,
      isCustom: true
    };
    
    setCustomIdentifiers(prev => [...prev, customId]);
    setNewCustomId('');
  };

  const removeCustomIdentifier = (index) => {
    setCustomIdentifiers(prev => prev.filter((_, i) => i !== index));
  };

  const toggleExpanded = (identifierId) => {
    setExpandedIdentifier(expandedIdentifier === identifierId ? null : identifierId);
  };

  const getCustomIdentifierLocations = () => [
    'Same locations as email and phone:',
    'Identify/Group traits: { "traits": { "custom_field": "value" } }',
    'Track/Page/Screen properties: { "properties": { "custom_field": "value" } }',
    'Context externalIds: { "context": { "externalIds": [{ "type": "custom_field", "id": "value" }] } }',
    'Context traits: { "context": { "traits": { "custom_field": "value" } } }'
  ];

  return (
    <div className="idres-config">
      <div className="idres-config__section">
        <h3 className="idres-config__section-title">Identity Resolution Configuration</h3>
        <p className="idres-config__section-description">
          Configure the order and priority of identity fields used for profile resolution. 
          Drag and drop to reorder identifiers by priority.
        </p>

        <div className="idres-config__identifiers">
          <h4 className="idres-config__subsection-title">Standard Identifiers</h4>
          <div className="idres-config__identifier-list">
            {identifiers.map((identifier, index) => (
              <div
                key={identifier.id}
                className={`idres-config__identifier ${!identifier.enabled ? 'idres-config__identifier--disabled' : ''}`}
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
                    <span className="idres-config__identifier-name">{identifier.name}</span>
                    <code className="idres-config__identifier-id">{identifier.id}</code>
                  </div>

                  <div className="idres-config__identifier-actions">
                    <button
                      onClick={() => toggleExpanded(identifier.id)}
                      className="idres-config__expand-button"
                      title="View payload locations"
                    >
                      {expandedIdentifier === identifier.id ? '▼' : '▶'}
                    </button>
                    <button
                      onClick={() => toggleIdentifier(index)}
                      className={`idres-config__toggle-button ${identifier.enabled ? 'idres-config__toggle-button--enabled' : 'idres-config__toggle-button--disabled'}`}
                      title={identifier.enabled ? 'Disable' : 'Enable'}
                    >
                      {identifier.enabled ? '✓' : '✗'}
                    </button>
                  </div>
                </div>

                {expandedIdentifier === identifier.id && (
                  <div className="idres-config__identifier-details">
                    <h5 className="idres-config__details-title">Event Payload Locations:</h5>
                    <ul className="idres-config__locations-list">
                      {identifierLocations[identifier.id]?.map((location, i) => (
                        <li key={i} className="idres-config__location-item">
                          <code>{location}</code>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {customIdentifiers.length > 0 && (
          <div className="idres-config__identifiers">
            <h4 className="idres-config__subsection-title">Custom Identifiers</h4>
            <div className="idres-config__identifier-list">
              {customIdentifiers.map((identifier, index) => (
                <div
                  key={identifier.id}
                  className={`idres-config__identifier ${!identifier.enabled ? 'idres-config__identifier--disabled' : ''} idres-config__identifier--custom`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index, true)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, index, true)}
                >
                  <div className="idres-config__identifier-header">
                    <div className="idres-config__identifier-drag">
                      <span className="idres-config__drag-handle">⋮⋮</span>
                      <span className="idres-config__identifier-priority">{identifiers.length + index + 1}</span>
                    </div>
                    
                    <div className="idres-config__identifier-info">
                      <span className="idres-config__identifier-name">{identifier.name}</span>
                      <code className="idres-config__identifier-id">{identifier.id}</code>
                      <span className="idres-config__custom-badge">CUSTOM</span>
                    </div>

                    <div className="idres-config__identifier-actions">
                      <button
                        onClick={() => toggleExpanded(identifier.id)}
                        className="idres-config__expand-button"
                        title="View payload locations"
                      >
                        {expandedIdentifier === identifier.id ? '▼' : '▶'}
                      </button>
                      <button
                        onClick={() => toggleIdentifier(index, true)}
                        className={`idres-config__toggle-button ${identifier.enabled ? 'idres-config__toggle-button--enabled' : 'idres-config__toggle-button--disabled'}`}
                        title={identifier.enabled ? 'Disable' : 'Enable'}
                      >
                        {identifier.enabled ? '✓' : '✗'}
                      </button>
                      <button
                        onClick={() => removeCustomIdentifier(index)}
                        className="idres-config__remove-button"
                        title="Remove custom identifier"
                      >
                        🗑
                      </button>
                    </div>
                  </div>

                  {expandedIdentifier === identifier.id && (
                    <div className="idres-config__identifier-details">
                      <h5 className="idres-config__details-title">Event Payload Locations:</h5>
                      <ul className="idres-config__locations-list">
                        {getCustomIdentifierLocations().map((location, i) => (
                          <li key={i} className="idres-config__location-item">
                            <code>{location}</code>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

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
      </div>
    </div>
  );
};

export default IdResConfig;
