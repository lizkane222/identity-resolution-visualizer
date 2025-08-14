import React, { useState, useEffect } from 'react';
import './AliasModal.css';

const AliasModal = ({ isOpen, onClose, onSubmit, currentUser }) => {
  const [userId, setUserId] = useState('');
  const [previousId, setPreviousId] = useState('');
  const [errors, setErrors] = useState({});

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setUserId('');
      setPreviousId('');
      setErrors({});
    }
  }, [isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const newErrors = {};
    if (!userId.trim()) {
      newErrors.userId = 'New User ID is required';
    }
    if (!previousId.trim()) {
      newErrors.previousId = 'Previous ID is required';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    onSubmit({
      userId: userId.trim(),
      previousId: previousId.trim()
    });
    
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const fillCurrentUserId = () => {
    if (currentUser?.userId) {
      setUserId(currentUser.userId);
    }
  };

  const fillCurrentUserIdForPrevious = () => {
    if (currentUser?.userId) {
      setPreviousId(currentUser.userId);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="alias-modal-overlay" onClick={handleOverlayClick}>
      <div className="alias-modal">
        <div className="alias-modal__header">
          <h3 className="alias-modal__title">Create Alias Event</h3>
          <button
            type="button"
            className="alias-modal__close-button"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        
        <div className="alias-modal__content">
          <p className="alias-modal__description">
            The Alias call connects two user identities, merging the data from the previous identity into the new one.
          </p>
          
          <form onSubmit={handleSubmit} className="alias-modal__form">
            <div className="alias-modal__field">
              <label htmlFor="userId" className="alias-modal__label">
                New User ID <span className="alias-modal__required">*</span>
              </label>
              <div className="alias-modal__input-group">
                <input
                  type="text"
                  id="userId"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className={`alias-modal__input ${errors.userId ? 'alias-modal__input--error' : ''}`}
                  placeholder="Enter the new user identity"
                  autoFocus
                />
                {currentUser?.userId && (
                  <button
                    type="button"
                    onClick={fillCurrentUserId}
                    className="alias-modal__suggest-button"
                    title={`Use current userId: ${currentUser.userId}`}
                  >
                    Use Current
                  </button>
                )}
              </div>
              {errors.userId && (
                <span className="alias-modal__error">{errors.userId}</span>
              )}
              <p className="alias-modal__help">
                This is the identity you want to merge <strong>TO</strong> (the target identity).
              </p>
            </div>

            <div className="alias-modal__field">
              <label htmlFor="previousId" className="alias-modal__label">
                Previous ID <span className="alias-modal__required">*</span>
              </label>
              <div className="alias-modal__input-group">
                <input
                  type="text"
                  id="previousId"
                  value={previousId}
                  onChange={(e) => setPreviousId(e.target.value)}
                  className={`alias-modal__input ${errors.previousId ? 'alias-modal__input--error' : ''}`}
                  placeholder="Enter the previous/current identity"
                />
                {currentUser?.userId && (
                  <button
                    type="button"
                    onClick={fillCurrentUserIdForPrevious}
                    className="alias-modal__suggest-button"
                    title={`Use current userId: ${currentUser.userId}`}
                  >
                    Use Current
                  </button>
                )}
              </div>
              {errors.previousId && (
                <span className="alias-modal__error">{errors.previousId}</span>
              )}
              <p className="alias-modal__help">
                This is the identity you want to merge <strong>FROM</strong> (the source identity to alias).
              </p>
            </div>

            <div className="alias-modal__actions">
              <button
                type="button"
                onClick={handleCancel}
                className="alias-modal__button alias-modal__button--cancel"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="alias-modal__button alias-modal__button--submit"
              >
                Create Alias Event
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AliasModal;
