import React, { useState, useEffect, useRef } from 'react';
import { loadRandomUserData } from '../../utils/userLoader.js';
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
  const [userFields, setUserFields] = useState({
    userId: '',
    anonymousId: '',
    email: '',
    firstName: '',
    lastName: ''
  });
  const [customFields, setCustomFields] = useState({});
  const [editingField, setEditingField] = useState(null);
  const [editingValue, setEditingValue] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customFieldName, setCustomFieldName] = useState('');
  const [fieldToggles, setFieldToggles] = useState({
    userId: true,
    anonymousId: true
  });
  const inputRef = useRef(null);

  // Extract user data from event payload
  useEffect(() => {
    if (eventPayload) {
      try {
        const payload = typeof eventPayload === 'string' ? JSON.parse(eventPayload) : eventPayload;
        const extractedFields = {};

        // Direct fields from payload - only if toggles are enabled
        if (payload.userId && fieldToggles.userId) extractedFields.userId = payload.userId;
        if (payload.anonymousId && fieldToggles.anonymousId) extractedFields.anonymousId = payload.anonymousId;

        // Fields from traits object
        if (payload.traits) {
          if (payload.traits.email) extractedFields.email = payload.traits.email;
          if (payload.traits.firstName) extractedFields.firstName = payload.traits.firstName;
          if (payload.traits.lastName) extractedFields.lastName = payload.traits.lastName;
        }

        // Fields from properties object
        if (payload.properties) {
          if (payload.properties.email) extractedFields.email = payload.properties.email;
          if (payload.properties.firstName) extractedFields.firstName = payload.properties.firstName;
          if (payload.properties.lastName) extractedFields.lastName = payload.properties.lastName;
        }

        // Update fields only if they're currently empty (don't overwrite manual edits)
        // And respect toggle states for userId and anonymousId
        setUserFields(prev => {
          const updated = { ...prev };
          Object.keys(extractedFields).forEach(key => {
            if (!prev[key] || prev[key] === '') {
              updated[key] = extractedFields[key];
            }
          });
          
          // Force clear disabled fields
          if (!fieldToggles.userId) updated.userId = '';
          if (!fieldToggles.anonymousId) updated.anonymousId = '';
          
          return updated;
        });
      } catch (error) {
        console.error('Error parsing event payload:', error);
      }
    }
  }, [eventPayload, fieldToggles]);

  // Notify parent of user changes
  useEffect(() => {
    const allFields = { ...userFields, ...customFields };
    
    // Apply toggle state to the fields that get sent to parent
    const filteredFields = { ...allFields };
    if (!fieldToggles.userId) filteredFields.userId = '';
    if (!fieldToggles.anonymousId) filteredFields.anonymousId = '';
    
    // Include toggle states in the data sent to parent
    const userData = {
      ...filteredFields,
      _toggles: fieldToggles // Add toggle states with a special prefix
    };
    
    if (onUserChange) {
      onUserChange(userData);
    }
  }, [userFields, customFields, fieldToggles]);

  // Focus input when editing starts
  useEffect(() => {
    if (editingField && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingField]);

  const handleFieldClick = (fieldName) => {
    setEditingField(fieldName);
    setEditingValue(userFields[fieldName] || customFields[fieldName] || '');
  };

  const handleSaveField = () => {
    if (!editingField) return;

    if (Object.keys(userFields).includes(editingField)) {
      setUserFields(prev => ({
        ...prev,
        [editingField]: editingValue
      }));
    } else {
      setCustomFields(prev => ({
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
      setCustomFields(prev => ({
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
    setCustomFields(prev => {
      const updated = { ...prev };
      delete updated[fieldName];
      return updated;
    });
  };

  const handleUpdate = () => {
    const allFields = { ...userFields, ...customFields };
    
    // Apply toggle state to the fields that get sent for update
    const filteredFields = { ...allFields };
    if (!fieldToggles.userId) filteredFields.userId = '';
    if (!fieldToggles.anonymousId) filteredFields.anonymousId = '';
    
    // Include toggle states in the update data
    const userData = {
      ...filteredFields,
      _toggles: fieldToggles
    };
    
    if (onUserUpdate) {
      onUserUpdate(userData);
    }
  };

  const handleLoadRandomUser = () => {
    const { userFields: randomUserFields, customFields: randomCustomFields } = loadRandomUserData();
    
    // Generate new anonymousId for this random user
    const newAnonymousId = generateUUID();
    
    // Update userFields state with new userId and anonymousId
    setUserFields(prev => ({
      ...prev,
      ...randomUserFields,
      // Always update both userId and anonymousId when loading random user
      userId: fieldToggles.userId ? randomUserFields.userId : '',
      anonymousId: fieldToggles.anonymousId ? newAnonymousId : ''
    }));
    
    // Update customFields state
    setCustomFields(randomCustomFields);
  };

  const handleToggleField = (fieldName) => {
    setFieldToggles(prev => {
      const newToggles = { ...prev, [fieldName]: !prev[fieldName] };
      // If toggling ON userId, get or persist UUID if not present
      if (fieldName === 'userId' && newToggles[fieldName]) {
        const currentUserId = userFields.userId;
        if (!currentUserId || currentUserId.trim() === '') {
          const newUserId = getOrPersistUserId();
          setUserFields(prevFields => {
            const updatedFields = {
              ...prevFields,
              userId: newUserId
            };
            if (onUserUpdate) {
              const allFields = { ...updatedFields, ...customFields };
              const filteredFields = { ...allFields };
              if (!newToggles.userId) filteredFields.userId = '';
              if (!newToggles.anonymousId) filteredFields.anonymousId = '';
              const userData = {
                ...filteredFields,
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
        const currentAnonymousId = userFields.anonymousId;
        if (!currentAnonymousId || currentAnonymousId.trim() === '') {
          // Generate a new UUID for anonymousId
          const newAnonymousId = generateUUID();
          
          // Update userFields state
          setUserFields(prevFields => {
            const updatedFields = {
              ...prevFields,
              [fieldName]: '', // Clear userId
              anonymousId: newAnonymousId // Set new UUID anonymousId
            };
            
            // Trigger update to parent components with the new data
            if (onUserUpdate) {
              const allFields = { ...updatedFields, ...customFields };
              const filteredFields = { ...allFields };
              if (!newToggles.userId) filteredFields.userId = '';
              if (!newToggles.anonymousId) filteredFields.anonymousId = '';
              
              const userData = {
                ...filteredFields,
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
        const currentAnonymousId = userFields.anonymousId;
        if (!currentAnonymousId || currentAnonymousId.trim() === '') {
          // Generate a new UUID for anonymousId
          const newAnonymousId = generateUUID();
          
          setUserFields(prevFields => {
            const updatedFields = {
              ...prevFields,
              anonymousId: newAnonymousId
            };
            
            // Trigger update to parent components with the new data
            if (onUserUpdate) {
              const allFields = { ...updatedFields, ...customFields };
              const filteredFields = { ...allFields };
              if (!newToggles.userId) filteredFields.userId = '';
              if (!newToggles.anonymousId) filteredFields.anonymousId = '';
              
              const userData = {
                ...filteredFields,
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
        setUserFields(prevFields => ({
          ...prevFields,
          [fieldName]: ''
        }));
      }
      
      return newToggles;
    });
  };

  const renderField = (fieldName, value, isCustom = false) => {
    const isEditing = editingField === fieldName;
    const displayValue = value || '';
    const isEmpty = !displayValue;
    const hasToggle = fieldName === 'userId' || fieldName === 'anonymousId';
    const isToggleEnabled = hasToggle ? fieldToggles[fieldName] : true;
    const fieldDisabled = hasToggle && !isToggleEnabled;

    return (
      <div key={fieldName} className="current-user__field">
        <label className="current-user__label">
          {fieldName}:
          {hasToggle && (
            <button
              onClick={() => handleToggleField(fieldName)}
              className={`current-user__toggle ${isToggleEnabled ? 'current-user__toggle--enabled' : 'current-user__toggle--disabled'}`}
              title={`${isToggleEnabled ? 'Disable' : 'Enable'} ${fieldName}`}
            >
              {isToggleEnabled ? '✓' : '✗'}
            </button>
          )}
          {isCustom && (
            <button
              onClick={() => handleRemoveCustomField(fieldName)}
              className="current-user__remove-custom"
              title="Remove custom field"
            >
              ×
            </button>
          )}
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
            placeholder={`Enter ${fieldName}`}
          />
        ) : (
          <div
            onClick={() => !fieldDisabled && handleFieldClick(fieldName)}
            className={`current-user__value ${isEmpty ? 'current-user__value--empty' : ''} ${fieldDisabled ? 'current-user__value--disabled' : ''}`}
            title={fieldDisabled ? `${fieldName} is disabled` : "Click to edit"}
          >
            {fieldDisabled ? `${fieldName} disabled` : (displayValue || `Enter ${fieldName}`)}
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
        {/* Core user fields */}
        {Object.entries(userFields).map(([fieldName, value]) =>
          renderField(fieldName, value)
        )}

        {/* Custom fields section */}
        {(Object.keys(customFields).length > 0 || showCustomInput) && (
          <div className="current-user__custom-section">
            {/* Custom fields grid */}
            {Object.keys(customFields).length > 0 && (
              <div className="current-user__custom-fields">
                {Object.entries(customFields).map(([fieldName, value]) =>
                  renderField(fieldName, value, true)
                )}
              </div>
            )}

            {/* Add custom field */}
            {showCustomInput ? (
              <div className="current-user__field">
                <label className="current-user__label">New field:</label>
                <input
                  type="text"
                  value={customFieldName}
                  onChange={(e) => setCustomFieldName(e.target.value)}
                  onBlur={() => customFieldName.trim() ? handleAddCustomField() : setShowCustomInput(false)}
                  onKeyDown={handleCustomFieldKeyPress}
                  className="current-user__input"
                  placeholder="Field name"
                  autoFocus
                />
              </div>
            ) : (
              <button
                onClick={() => setShowCustomInput(true)}
                className="current-user__add-custom"
              >
                + Add Custom Field
              </button>
            )}
          </div>
        )}
        
        {/* Update button */}
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