import React, { useState, useEffect, useRef } from 'react';
import { loadRandomUserData } from '../../utils/userLoader.js';
import { 
  getEnabledIdentifiers, 
  getIdentifierFieldsFromData, 
  getTraitFields, 
  getIdentifierDisplayName,
  isIdentifierField 
} from '../../utils/idResolutionConfig.js';
import './CurrentUser.css';

// UUID generation utility

const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0;
    var v = c === 'x' ? r : ((r & 0x3) | 0x8);
    return v.toString(16);
  });
};

function getOrPersistUserId() {
  let userId = null;
  try {
    userId = localStorage.getItem('eventBuilderUserId');
    if (!userId) {
      userId = generateUUID();
      localStorage.setItem('eventBuilderUserId', userId);
    }
  } catch (e) {
    userId = generateUUID();
  }
  return userId;
}

const CurrentUser = ({ onUserChange, eventPayload, onUserUpdate }) => {
  // Get configured identifiers from ID Resolution Config
  const [configuredIdentifiers, setConfiguredIdentifiers] = useState([]);
  const [identifierFields, setIdentifierFields] = useState({});
  const [traitFields, setTraitFields] = useState({
    email: '',
    firstName: '',
    lastName: ''
  });
  const [customTraits, setCustomTraits] = useState({});
  const [editingField, setEditingField] = useState(null);
  const [editingValue, setEditingValue] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customFieldName, setCustomFieldName] = useState('');
  const [fieldToggles, setFieldToggles] = useState({});
  const inputRef = useRef(null);

  // Load configured identifiers and initialize states
  useEffect(() => {
    const identifiers = getEnabledIdentifiers();
    setConfiguredIdentifiers(identifiers);
    
    // Initialize identifier fields - Always include userId and anonymousId first
    const initialIdentifierFields = {
      userId: '',
      anonymousId: ''
    };
    const initialToggles = {
      userId: true,
      anonymousId: true
    };
    
    // Add ALL configured identifiers (they will appear in identifiers section)
    identifiers.forEach(identifier => {
      let fieldName;
      switch (identifier.id) {
        case 'user_id':
          fieldName = 'userId';
          break;
        case 'anonymous_id':
          fieldName = 'anonymousId';
          break;
        case 'ga_client_id':
          fieldName = 'gaClientId';
          break;
        default:
          fieldName = identifier.id;
      }
      
      // Don't overwrite userId/anonymousId
      if (fieldName !== 'userId' && fieldName !== 'anonymousId') {
        initialIdentifierFields[fieldName] = '';
      }
    });
    
    setIdentifierFields(initialIdentifierFields);
    setFieldToggles(initialToggles);
    
    // Initialize trait fields - standard traits only, excluding identifiers
    const initialTraitFields = {};
    const standardTraits = ['email', 'firstName', 'lastName', 'username', 'phone'];
    
    // Get list of identifier field names to avoid duplication
    const identifierFieldNames = Object.keys(initialIdentifierFields);
    
    // Add standard traits that are NOT already configured as identifiers
    standardTraits.forEach(field => {
      if (!identifierFieldNames.includes(field)) {
        initialTraitFields[field] = '';
      }
    });
    
    setTraitFields(initialTraitFields);
  }, []);

  // Extract user data from event payload
  useEffect(() => {
    if (eventPayload) {
      try {
        const payload = typeof eventPayload === 'string' ? JSON.parse(eventPayload) : eventPayload;
        const extractedIdentifiers = {};
        const extractedTraits = {};

        // Extract identifier fields - only if toggles are enabled
        Object.keys(identifierFields).forEach(fieldName => {
          const hasToggle = fieldName === 'userId' || fieldName === 'anonymousId';
          const isToggleEnabled = hasToggle ? fieldToggles[fieldName] : true;
          
          if (isToggleEnabled && payload[fieldName]) {
            extractedIdentifiers[fieldName] = payload[fieldName];
          }
        });

        // Extract trait fields from various locations
        if (payload.traits) {
          Object.keys(traitFields).forEach(traitName => {
            if (payload.traits[traitName]) {
              extractedTraits[traitName] = payload.traits[traitName];
            }
          });
        }

        // Also check properties object for traits
        if (payload.properties) {
          Object.keys(traitFields).forEach(traitName => {
            if (payload.properties[traitName]) {
              extractedTraits[traitName] = payload.properties[traitName];
            }
          });
        }

        // Update fields only if they're currently empty (don't overwrite manual edits)
        setIdentifierFields(prev => {
          const updated = { ...prev };
          Object.keys(extractedIdentifiers).forEach(key => {
            if (!prev[key] || prev[key] === '') {
              updated[key] = extractedIdentifiers[key];
            }
          });
          
          // Force clear disabled fields
          Object.keys(prev).forEach(key => {
            const hasToggle = key === 'userId' || key === 'anonymousId';
            if (hasToggle && !fieldToggles[key]) {
              updated[key] = '';
            }
          });
          
          return updated;
        });

        setTraitFields(prev => {
          const updated = { ...prev };
          Object.keys(extractedTraits).forEach(key => {
            if (!prev[key] || prev[key] === '') {
              updated[key] = extractedTraits[key];
            }
          });
          return updated;
        });
      } catch (error) {
        console.error('Error parsing event payload:', error);
      }
    }
  }, [eventPayload, fieldToggles]); // Removed identifierFields and traitFields from dependencies

  // Notify parent of user changes
  useEffect(() => {
    const allIdentifiers = { ...identifierFields };
    const allTraits = { ...traitFields, ...customTraits };
    
    // Apply toggle state to the identifier fields that get sent to parent
    const filteredIdentifiers = {};
    Object.keys(allIdentifiers).forEach(key => {
      const hasToggle = key === 'userId' || key === 'anonymousId';
      if (hasToggle) {
        // Only include the field if toggle is enabled AND it has a value
        if (fieldToggles[key] && allIdentifiers[key] && allIdentifiers[key].trim()) {
          filteredIdentifiers[key] = allIdentifiers[key];
        }
      } else {
        // For fields without toggles, include if they have values
        if (allIdentifiers[key] && allIdentifiers[key].trim()) {
          filteredIdentifiers[key] = allIdentifiers[key];
        }
      }
    });
    
    // Combine all fields for backward compatibility
    const allFields = { ...filteredIdentifiers, ...allTraits };
    
    // Include toggle states in the data sent to parent
    const userData = {
      ...allFields,
      _toggles: fieldToggles // Add toggle states with a special prefix
    };

    console.log('📤 [CurrentUser] Sending userData to parent:', JSON.stringify(userData, null, 2));
    console.log('📤 [CurrentUser] anonymousId in userData:', userData.anonymousId);
    console.log('📤 [CurrentUser] toggles:', userData._toggles);

    if (onUserChange) {
      onUserChange(userData);
    }
  }, [identifierFields, traitFields, customTraits, fieldToggles]);

  // Focus input when editing starts
  useEffect(() => {
    if (editingField && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingField]);

  const handleFieldClick = (fieldName) => {
    setEditingField(fieldName);
    const value = identifierFields[fieldName] || traitFields[fieldName] || customTraits[fieldName] || '';
    setEditingValue(value);
  };

  const handleSaveField = () => {
    if (!editingField) return;

    // Check if it's an identifier field
    if (Object.keys(identifierFields).includes(editingField)) {
      setIdentifierFields(prev => ({
        ...prev,
        [editingField]: editingValue
      }));
    } else if (Object.keys(traitFields).includes(editingField)) {
      setTraitFields(prev => ({
        ...prev,
        [editingField]: editingValue
      }));
    } else {
      // Custom trait
      setCustomTraits(prev => ({
        ...prev,
        [editingField]: editingValue
      }));
    }

    setEditingField(null);
    setEditingValue('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSaveField();
    } else if (e.key === 'Escape') {
      setEditingField(null);
      setEditingValue('');
    }
  };

  const handleAddCustomField = () => {
    if (customFieldName.trim()) {
      setCustomTraits(prev => ({
        ...prev,
        [customFieldName.trim()]: ''
      }));
      setCustomFieldName('');
      setShowCustomInput(false);
    }
  };

  const handleCustomFieldKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleAddCustomField();
    } else if (e.key === 'Escape') {
      setShowCustomInput(false);
      setCustomFieldName('');
    }
  };

  const handleRemoveCustomField = (fieldName) => {
    setCustomTraits(prev => {
      const updated = { ...prev };
      delete updated[fieldName];
      return updated;
    });
  };

  const handleClearField = (fieldName) => {
    // Check if it's an identifier field
    if (Object.keys(identifierFields).includes(fieldName)) {
      setIdentifierFields(prev => ({
        ...prev,
        [fieldName]: ''
      }));
    } else if (Object.keys(traitFields).includes(fieldName)) {
      setTraitFields(prev => ({
        ...prev,
        [fieldName]: ''
      }));
    } else {
      // Custom trait
      setCustomTraits(prev => ({
        ...prev,
        [fieldName]: ''
      }));
    }
  };

  const handleUpdate = () => {
    const allIdentifiers = { ...identifierFields };
    const allTraits = { ...traitFields, ...customTraits };
    
    // Apply toggle state to the identifier fields that get sent for update
    const filteredIdentifiers = { ...allIdentifiers };
    Object.keys(allIdentifiers).forEach(key => {
      const hasToggle = key === 'userId' || key === 'anonymousId';
      if (hasToggle && !fieldToggles[key]) {
        filteredIdentifiers[key] = '';
      }
    });
    
    // Combine all fields for backward compatibility
    const allFields = { ...filteredIdentifiers, ...allTraits };
    
    // Include toggle states in the update data
    const userData = {
      ...allFields,
      _toggles: fieldToggles
    };
    
    if (onUserUpdate) {
      onUserUpdate(userData);
    }
  };

  const handleLoadRandomUser = () => {
    const { userFields: randomUserData, customFields: randomCustomFields } = loadRandomUserData();
    
    // Generate new anonymousId for this random user
    const newAnonymousId = generateUUID();
    
    // Separate identifiers from traits
    const newIdentifiers = { ...identifierFields };
    const newTraits = { ...traitFields };
    
    // Update identifier fields
    Object.keys(newIdentifiers).forEach(key => {
      const hasToggle = key === 'userId' || key === 'anonymousId';
      if (key === 'anonymousId') {
        newIdentifiers[key] = hasToggle && fieldToggles[key] ? newAnonymousId : '';
      } else if (randomUserData[key]) {
        newIdentifiers[key] = hasToggle ? (fieldToggles[key] ? randomUserData[key] : '') : randomUserData[key];
      }
    });
    
    // Update trait fields (including any that overlap with identifiers)
    Object.keys(newTraits).forEach(key => {
      if (randomUserData[key]) {
        newTraits[key] = randomUserData[key];
      }
    });
    
    setIdentifierFields(newIdentifiers);
    setTraitFields(newTraits);
    setCustomTraits(randomCustomFields);
    
    // Immediately update the event payload to sync with the UI
    if (onUserChange) {
      // Build the complete user data
      const allIdentifiers = { ...newIdentifiers };
      const allTraits = { ...newTraits, ...randomCustomFields };
      
      // Filter identifiers based on toggles
      const filteredIdentifiers = {};
      Object.keys(allIdentifiers).forEach(key => {
        const hasToggle = key === 'userId' || key === 'anonymousId';
        if (hasToggle) {
          if (fieldToggles[key] && allIdentifiers[key]) {
            filteredIdentifiers[key] = allIdentifiers[key];
          }
        } else {
          if (allIdentifiers[key]) {
            filteredIdentifiers[key] = allIdentifiers[key];
          }
        }
      });
      
      // Call onUserChange to sync the event payload
      onUserChange({
        identifiers: filteredIdentifiers,
        traits: allTraits,
        _toggles: fieldToggles
      });
    }
  };

  const handleToggleField = (fieldName) => {
    setFieldToggles(prev => {
      const newToggles = { ...prev, [fieldName]: !prev[fieldName] };
      // If toggling ON userId, get or persist UUID if not present
      if (fieldName === 'userId' && newToggles[fieldName]) {
        const currentUserId = identifierFields.userId;
        if (!currentUserId || currentUserId.trim() === '') {
          const newUserId = getOrPersistUserId();
          setIdentifierFields(prevFields => {
            const updatedFields = {
              ...prevFields,
              userId: newUserId
            };
            if (onUserUpdate) {
              const allIdentifiers = { ...updatedFields };
              const allTraits = { ...traitFields, ...customTraits };
              const filteredIdentifiers = { ...allIdentifiers };
              Object.keys(allIdentifiers).forEach(key => {
                const hasToggle = key === 'userId' || key === 'anonymousId';
                if (hasToggle && !newToggles[key]) {
                  filteredIdentifiers[key] = '';
                }
              });
              const allFields = { ...filteredIdentifiers, ...allTraits };
              const userData = {
                ...allFields,
                _toggles: newToggles
              };
              setTimeout(() => onUserUpdate(userData), 0);
            }
            return updatedFields;
          });
          return newToggles;
        }
      }
      
      // If toggling off userId, generate anonymousId UUID if not present and anonymousId is enabled
      if (fieldName === 'userId' && !newToggles[fieldName] && newToggles.anonymousId) {
        const currentAnonymousId = identifierFields.anonymousId;
        if (!currentAnonymousId || currentAnonymousId.trim() === '') {
          // Generate a new UUID for anonymousId
          const newAnonymousId = generateUUID();
          
          // Update identifierFields state
          setIdentifierFields(prevFields => {
            const updatedFields = {
              ...prevFields,
              [fieldName]: '', // Clear userId
              anonymousId: newAnonymousId // Set new UUID anonymousId
            };
            
            // Trigger update to parent components with the new data
            if (onUserUpdate) {
              const allTraits = { ...traitFields, ...customTraits };
              const filteredIdentifiers = { ...updatedFields };
              Object.keys(updatedFields).forEach(key => {
                const hasToggle = key === 'userId' || key === 'anonymousId';
                if (hasToggle && !newToggles[key]) {
                  filteredIdentifiers[key] = '';
                }
              });
              const allFields = { ...filteredIdentifiers, ...allTraits };
              
              const userData = {
                ...allFields,
                _toggles: newToggles
              };
              
              // Use setTimeout to ensure this happens after state update
              setTimeout(() => onUserUpdate(userData), 0);
            }
            
            return updatedFields;
          });
          
          return newToggles;
        }
      }
      
      // If toggling ON anonymousId, generate UUID if not present
      if (fieldName === 'anonymousId' && newToggles[fieldName]) {
        const currentAnonymousId = identifierFields.anonymousId;
        if (!currentAnonymousId || currentAnonymousId.trim() === '') {
          // Generate a new UUID for anonymousId
          const newAnonymousId = generateUUID();
          
          setIdentifierFields(prevFields => {
            const updatedFields = {
              ...prevFields,
              anonymousId: newAnonymousId
            };
            
            // Trigger update to parent components with the new data
            if (onUserUpdate) {
              const allTraits = { ...traitFields, ...customTraits };
              const filteredIdentifiers = { ...updatedFields };
              Object.keys(updatedFields).forEach(key => {
                const hasToggle = key === 'userId' || key === 'anonymousId';
                if (hasToggle && !newToggles[key]) {
                  filteredIdentifiers[key] = '';
                }
              });
              const allFields = { ...filteredIdentifiers, ...allTraits };
              
              const userData = {
                ...allFields,
                _toggles: newToggles
              };
              
              setTimeout(() => onUserUpdate(userData), 0);
            }
            
            return updatedFields;
          });
          
          return newToggles;
        }
      }
      
      // If toggling off, clear the field immediately
      if (!newToggles[fieldName]) {
        setIdentifierFields(prevFields => ({
          ...prevFields,
          [fieldName]: ''
        }));
      }
      
      return newToggles;
    });
  };

  const renderField = (fieldName, value, isCustom = false, isIdentifier = false) => {
    const isEditing = editingField === fieldName;
    const displayValue = value || '';
    const isEmpty = !displayValue;
    const hasToggle = fieldName === 'userId' || fieldName === 'anonymousId';
    const isToggleEnabled = hasToggle ? fieldToggles[fieldName] : true;
    const fieldDisabled = hasToggle && !isToggleEnabled;

    // Get display name for identifier fields or special field names
    let displayName;
    if (isIdentifier) {
      displayName = getIdentifierDisplayName(fieldName);
    } else if (fieldName === 'streetAddress') {
      displayName = 'Street Address';
    } else if (fieldName === 'firstName') {
      displayName = 'First Name';
    } else if (fieldName === 'lastName') {
      displayName = 'Last Name';
    } else {
      displayName = fieldName;
    }

    return (
      <div key={fieldName} className="current-user__field" data-field={fieldName}>
        <label className="current-user__label">
          {displayName}:
          <div className="current-user__label-controls">
            {hasToggle && (
              <button
                onClick={() => handleToggleField(fieldName)}
                className={`current-user__toggle ${isToggleEnabled ? 'current-user__toggle--enabled' : 'current-user__toggle--disabled'}`}
                title={`${isToggleEnabled ? 'Disable' : 'Enable'} ${displayName}`}
              >
                {isToggleEnabled ? '✓' : '✗'}
              </button>
            )}
            {!isEmpty && !fieldDisabled && (
              <button
                onClick={() => handleClearField(fieldName)}
                className="current-user__clear-field"
                title={`Clear ${displayName}`}
              >
                ×
              </button>
            )}
            {isCustom && !['streetAddress', 'city', 'state', 'zipcode'].includes(fieldName) && (
              <button
                onClick={() => handleRemoveCustomField(fieldName)}
                className="current-user__remove-custom"
                title="Remove custom trait"
              >
                🗑
              </button>
            )}
          </div>
        </label>
        {isEditing && !fieldDisabled ? (
          <input
            ref={inputRef}
            type="text"
            value={editingValue}
            onChange={(e) => setEditingValue(e.target.value)}
            onBlur={handleSaveField}
            onKeyDown={handleKeyPress}
            className="current-user__input"
            placeholder={`Enter ${displayName}`}
          />
        ) : (
          <div
            onClick={() => !fieldDisabled && handleFieldClick(fieldName)}
            className={`current-user__value ${isEmpty ? 'current-user__value--empty' : ''} ${fieldDisabled ? 'current-user__value--disabled' : ''}`}
            title={fieldDisabled ? `${displayName} is disabled` : "Click to edit"}
          >
            {fieldDisabled ? `${displayName} disabled` : (displayValue || `Enter ${displayName}`)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="current-user">
      <div className="current-user__header">
        <h3 className="current-user__title">Current User</h3>
      </div>

      <div className="current-user__content">
        {/* Identifiers section */}
        {Object.keys(identifierFields).length > 0 && (
          <div className="current-user__identifiers-section">
            <h4 className="current-user__section-title">Identifiers</h4>
            <div className="current-user__section-description">
              Fields configured in ID Resolution Config
            </div>
            
            {/* Primary identifiers always on top row */}
            <div className="current-user__primary-identifiers">
              {identifierFields.userId !== undefined && renderField('userId', identifierFields.userId, false, true)}
              {identifierFields.anonymousId !== undefined && renderField('anonymousId', identifierFields.anonymousId, false, true)}
            </div>
            
            {/* Other identifiers */}
            {Object.keys(identifierFields).filter(key => key !== 'userId' && key !== 'anonymousId').length > 0 && (
              <div className="current-user__other-identifiers">
                {Object.entries(identifierFields)
                  .filter(([fieldName]) => fieldName !== 'userId' && fieldName !== 'anonymousId')
                  .map(([fieldName, value]) => renderField(fieldName, value, false, true)
                )}
              </div>
            )}
          </div>
        )}

        {/* Traits section */}
        <div className="current-user__traits-section">
          <h4 className="current-user__section-title">Traits</h4>
          {/* <div className="current-user__section-description">
            User attributes and properties
          </div> */}
          
          <div className="current-user__fields-grid">
            {/* Name fields: firstName and lastName on same row if both exist in trait fields */}
            {traitFields.hasOwnProperty('firstName') && traitFields.hasOwnProperty('lastName') && (
              <div className="current-user__name-row">
                {renderField('firstName', traitFields.firstName, false, false)}
                {renderField('lastName', traitFields.lastName, false, false)}
              </div>
            )}
            
            {/* Address fields: streetAddress, city, state, zipcode on same row if all exist in custom traits */}
            {customTraits.hasOwnProperty('streetAddress') && customTraits.hasOwnProperty('city') && customTraits.hasOwnProperty('state') && customTraits.hasOwnProperty('zipcode') && (
              <div className="current-user__address-row">
                {renderField('streetAddress', customTraits.streetAddress, true, false)}
                {renderField('city', customTraits.city, true, false)}
                {renderField('state', customTraits.state, true, false)}
                {renderField('zipcode', customTraits.zipcode, true, false)}
              </div>
            )}
            
            {/* Other trait fields (excluding firstName and lastName if they were rendered above) */}
            {Object.entries(traitFields)
              .filter(([fieldName]) => {
                // Exclude firstName and lastName if both exist in trait fields (they're rendered above)
                if (traitFields.hasOwnProperty('firstName') && traitFields.hasOwnProperty('lastName')) {
                  return !['firstName', 'lastName'].includes(fieldName);
                }
                return true;
              })
              .map(([fieldName, value]) =>
                renderField(fieldName, value, false, false)
              )}

            {/* Custom traits (excluding address fields if they were rendered above) */}
            {Object.entries(customTraits)
              .filter(([fieldName]) => {
                // Exclude address fields if all four exist in custom traits (they're rendered above)
                if (customTraits.hasOwnProperty('streetAddress') && customTraits.hasOwnProperty('city') && customTraits.hasOwnProperty('state') && customTraits.hasOwnProperty('zipcode')) {
                  return !['streetAddress', 'city', 'state', 'zipcode'].includes(fieldName);
                }
                return true;
              })
              .map(([fieldName, value]) =>
                renderField(fieldName, value, true, false)
              )}
          </div>

          {/* Add custom trait */}
          <div className="current-user__custom-section">
            {showCustomInput ? (
              <div className="current-user__field">
                <label className="current-user__label">New trait:</label>
                <input
                  type="text"
                  value={customFieldName}
                  onChange={(e) => setCustomFieldName(e.target.value)}
                  onBlur={() => customFieldName.trim() ? handleAddCustomField() : setShowCustomInput(false)}
                  onKeyDown={handleCustomFieldKeyPress}
                  className="current-user__input"
                  placeholder="Trait name"
                  autoFocus
                />
              </div>
            ) : (
              <button
                onClick={() => setShowCustomInput(true)}
                className="current-user__add-custom"
              >
                + Add Custom Trait
              </button>
            )}
          </div>
        </div>
        
        {/* Buttons section */}
        <div className="current-user__update-section">
          <div className="current-user__buttons">
            <button
              onClick={handleLoadRandomUser}
              className="current-user__random-user-button"
              title="Load random user data from users.json"
            >
              Load Random User
            </button>
            <button
              onClick={handleUpdate}
              className="current-user__update-button"
              title="Update EventBuilder with current user data"
            >
              Update
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CurrentUser;