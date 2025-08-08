import React, { useState, useEffect } from 'react';
import './SegmentConfig.css';

const SegmentConfig = ({ isVisible, onClose, onConfigUpdate }) => {
  const [spaceId, setSpaceId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [hasExistingToken, setHasExistingToken] = useState(false);

  useEffect(() => {
    if (isVisible) {
      loadCurrentConfig();
    }
  }, [isVisible]);

  const loadCurrentConfig = async () => {
    try {
      const response = await fetch('/api/config');
      const config = await response.json();
      
      setSpaceId(config.spaceId || '');
      setHasExistingToken(config.hasToken);
      setAccessToken(''); // Don't pre-fill token for security
    } catch (error) {
      console.error('Error loading config:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    if (!spaceId.trim() || !accessToken.trim()) {
      setError('Both Space ID and Access Token are required');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          spaceId: spaceId.trim(),
          accessToken: accessToken.trim()
        })
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess('Configuration saved successfully!');
        setTimeout(() => {
          onConfigUpdate?.(true);
          onClose?.();
        }, 1500);
      } else {
        setError(result.error?.message || 'Failed to save configuration');
      }
    } catch (error) {
      setError('Failed to connect to server');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setError('');
    setSuccess('');
    setAccessToken('');
    onClose?.();
  };

  if (!isVisible) return null;

  return (
    <div className="segment-config-overlay">
      <div className="segment-config-modal">
        <div className="segment-config__header">
          <h2 className="segment-config__title">Segment Profile API Configuration</h2>
          <button 
            onClick={handleClose}
            className="segment-config__close-button"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="segment-config__form">
          <div className="segment-config__field">
            <label htmlFor="spaceId" className="segment-config__label">
              Space ID
            </label>
            <input
              id="spaceId"
              type="text"
              value={spaceId}
              onChange={(e) => setSpaceId(e.target.value)}
              placeholder="e.g., lg8283283"
              className="segment-config__input"
              required
            />
            <p className="segment-config__help">
              Find your Space ID in your Segment workspace settings
            </p>
          </div>

          <div className="segment-config__field">
            <label htmlFor="accessToken" className="segment-config__label">
              Access Token
            </label>
            <input
              id="accessToken"
              type="password"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder={hasExistingToken ? "Enter new token (leave blank to keep current)" : "Enter your access token"}
              className="segment-config__input"
              required={!hasExistingToken}
            />
            <p className="segment-config__help">
              Create an access token in your Unify settings page. Keep it secure!
            </p>
          </div>

          {error && (
            <div className="segment-config__error">
              {error}
            </div>
          )}

          {success && (
            <div className="segment-config__success">
              {success}
            </div>
          )}

          <div className="segment-config__actions">
            <button 
              type="button" 
              onClick={handleClose}
              className="segment-config__button segment-config__button--cancel"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isLoading}
              className="segment-config__button segment-config__button--save"
            >
              {isLoading ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </form>

        <div className="segment-config__info">
          <h3 className="segment-config__info-title">API Endpoints Available:</h3>
          <ul className="segment-config__endpoints">
            <li>Get Profile Traits</li>
            <li>Get Profile External IDs</li>
            <li>Get Profile Events</li>
            <li>Get Profile Metadata</li>
            <li>Get Profile Links</li>
            <li>Get Account Profile Traits</li>
            <li>Get Account Profile Links</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SegmentConfig;
