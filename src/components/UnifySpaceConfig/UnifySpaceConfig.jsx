import React, { useState, useRef, useEffect } from 'react';
import SpaceConfig from './SpaceConfig';
import IdResConfig from './IdResConfig';
import './UnifySpaceConfig.css';


const UnifySpaceConfig = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('space');
  const [unifySpaceSlug, setUnifySpaceSlug] = useState('');
  const idResConfigRef = useRef();

  // Load unifySpaceSlug from server configuration
  useEffect(() => {
    const loadUnifySpaceSlug = async () => {
      try {
        const response = await fetch('http://localhost:8888/api/config');
        const config = await response.json();
        if (config.unifySpaceSlug) {
          setUnifySpaceSlug(config.unifySpaceSlug);
        }
      } catch (error) {
        console.error('Failed to load unifySpaceSlug:', error);
      }
    };
    if (isOpen) {
      loadUnifySpaceSlug();
    }
  }, [isOpen]);

  // Listen for storage events to update unifySpaceSlug when SpaceConfig changes it
  useEffect(() => {
    const handleStorageChange = () => {
      // Reload the config when we detect changes
      if (isOpen) {
        const loadUnifySpaceSlug = async () => {
          try {
            const response = await fetch('http://localhost:8888/api/config');
            const config = await response.json();
            if (config.unifySpaceSlug) {
              setUnifySpaceSlug(config.unifySpaceSlug);
            }
          } catch (error) {
            console.error('Failed to reload unifySpaceSlug:', error);
          }
        };
        loadUnifySpaceSlug();
      }
    };

    // Set up an interval to check for changes (since server config changes don't trigger storage events)
    const interval = setInterval(handleStorageChange, 1000);
    
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveIdResConfig = () => {
    if (idResConfigRef.current && idResConfigRef.current.saveConfig) {
      idResConfigRef.current.saveConfig();
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      handleSaveIdResConfig();
      onClose();
    }
  };

  return (
    <div className="unify-space-config__overlay" onClick={handleOverlayClick}>
      <div className="unify-space-config__modal">
        <div className="unify-space-config__header">
          <h2 className="unify-space-config__title">Unify Space Configuration</h2>
          <button
            onClick={() => { handleSaveIdResConfig(); onClose(); }}
            className="unify-space-config__close"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="unify-space-config__tabs">
          <button
            className={`unify-space-config__tab ${activeTab === 'space' ? 'unify-space-config__tab--active' : ''}`}
            onClick={() => setActiveTab('space')}
          >
            Space Config
          </button>
          <button
            className={`unify-space-config__tab ${activeTab === 'idres' ? 'unify-space-config__tab--active' : ''}`}
            onClick={() => setActiveTab('idres')}
          >
            ID Resolution Config
          </button>
        </div>

        <div className="unify-space-config__content">
          {activeTab === 'space' && (
            <div className="unify-space-config__card">
              <SpaceConfig />
            </div>
          )}
          {activeTab === 'idres' && (
            <div className="unify-space-config__card">
              <IdResConfig ref={idResConfigRef} unifySpaceSlug={unifySpaceSlug} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UnifySpaceConfig;
