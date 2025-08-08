import React, { useState, useRef } from 'react';
import SpaceConfig from './SpaceConfig';
import IdResConfig from './IdResConfig';
import './UnifySpaceConfig.css';


const UnifySpaceConfig = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('space');
  const idResConfigRef = useRef();

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
              <IdResConfig ref={idResConfigRef} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UnifySpaceConfig;
