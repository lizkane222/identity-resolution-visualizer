import React, { useState, useEffect } from 'react';
import DiagramTimeline from './DiagramTimeline';
import './Visualizer.css';

const Visualizer = ({ 
  events, 
  identifierOptions,
  unifySpaceSlug,
  onClose 
}) => {
  // Load ID Resolution Config from localStorage
  const [idResConfig, setIdResConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('idres_config_identifiers');
      if (saved) {
        return JSON.parse(saved).filter(id => id.enabled);
      }
    } catch {}
    // fallback to defaults if not found
    return [
      { id: 'user_id', name: 'User ID', enabled: true, isCustom: false, limit: 1, frequency: 'Ever' },
      { id: 'email', name: 'Email', enabled: true, isCustom: false, limit: 3, frequency: 'Ever' },
      { id: 'phone', name: 'Phone', enabled: true, isCustom: true, limit: 2, frequency: 'Ever' },
      { id: 'android.id', name: 'Android ID', enabled: true, isCustom: false, limit: 1, frequency: 'Ever' },
      { id: 'android.idfa', name: 'Android IDFA', enabled: true, isCustom: false, limit: 1, frequency: 'Monthly' },
      { id: 'android.push_token', name: 'Android Push Token', enabled: true, isCustom: false, limit: 5, frequency: 'Monthly' },
      { id: 'anonymous_id', name: 'Anonymous ID', enabled: true, isCustom: false, limit: 10, frequency: 'Ever' },
      { id: 'ga_client_id', name: 'GA Client ID', enabled: true, isCustom: false, limit: 3, frequency: 'Monthly' },
      { id: 'ios.id', name: 'iOS ID', enabled: true, isCustom: false, limit: 1, frequency: 'Ever' },
      { id: 'ios.idfa', name: 'iOS IDFA', enabled: true, isCustom: false, limit: 1, frequency: 'Monthly' },
      { id: 'ios.push_token', name: 'iOS Push Token', enabled: true, isCustom: false, limit: 5, frequency: 'Monthly' },
    ];
  });

  // Listen for changes in localStorage to update the config
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const saved = localStorage.getItem('idres_config_identifiers');
        if (saved) {
          setIdResConfig(JSON.parse(saved).filter(id => id.enabled));
        }
      } catch {}
    };

    // Set up an interval to check for changes
    const interval = setInterval(handleStorageChange, 1000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="visualizer">
      {/* Header */}
      <div className="visualizer__header">
        <div className="visualizer__header-left">
          <img src="/assets/pie-chart.svg" alt="Visualizer" className="visualizer__header-icon" />
          <h2 className="visualizer__title">
            Identity Resolution Visualizer 
            <div className="visualizer__separator">
              <div className="separator-line">
                <div className="dash-pixel dash-pixel-1"></div>
                <div className="dash-pixel dash-pixel-2"></div>
                <div className="dash-pixel dash-pixel-3"></div>
                <div className="dash-pixel dash-pixel-4"></div>
                <div className="dash-pixel dash-pixel-5"></div>
                <div className="dash-pixel dash-pixel-6"></div>
                <div className="dash-pixel dash-pixel-7"></div>
              </div>
            </div>
            Event Flow
          </h2>
        </div>
        <div className="visualizer__header-right">
          <button
            className="visualizer__back-button"
            onClick={onClose}
            title="Back to Main App"
          >
            ← Back to Main
          </button>
        </div>
      </div>

      {/* Description */}
      <div className="visualizer__description">
        <p>This diagram shows how each event affects identity resolution based on existing profiles and configured rules.</p>
      </div>

      {/* Main Content */}
      <div className="visualizer__content">
            {/* Sidebar - Identity Resolution Config */}
            <div className="visualizer__sidebar">
              <div className="visualizer__sidebar-header">
                <h3>Identity Resolution Config</h3>
              </div>
              <div className="visualizer__sidebar-content">
                <div className="visualizer__config-section">
                  <div className="visualizer__identifier-table">
                    <div className="visualizer__table-header">
                      <span className="visualizer__table-col visualizer__table-col--priority">PRIORITY</span>
                      <span className="visualizer__table-col visualizer__table-col--identifier">IDENTIFIER</span>
                      <span className="visualizer__table-col visualizer__table-col--limit">LIMIT</span>
                    </div>
                    {idResConfig.map((identifier, index) => (
                      <div key={identifier.id} className="visualizer__table-row">
                        <span className="visualizer__table-col visualizer__table-col--priority">{index + 1}</span>
                        <span className="visualizer__table-col visualizer__table-col--identifier">
                          <span>
                            {identifier.id}
                            {identifier.isCustom && <span className="visualizer__custom-indicator">*</span>}
                          </span>
                        </span>
                        <span className="visualizer__table-col visualizer__table-col--limit">{identifier.limit}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="visualizer__config-section">
                  <h4>Current Settings</h4>
                  <div className="visualizer__setting-item">
                    <span className="visualizer__setting-label">Unify Space:</span>
                    <span className="visualizer__setting-value">{unifySpaceSlug || 'Not configured'}</span>
                  </div>
                  <div className="visualizer__setting-item">
                    <span className="visualizer__setting-label">Events to Process:</span>
                    <span className="visualizer__setting-value">{events.length}</span>
                  </div>
                  <div className="visualizer__setting-item">
                    <span className="visualizer__setting-label">Enabled Identifiers:</span>
                    <span className="visualizer__setting-value">{idResConfig.length}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Diagram Area */}
            <div className="visualizer__diagram-container visualizer__diagram-container--with-sidebar">
              {events.length === 0 ? (
                <div className="visualizer__empty-state">
                  <div className="visualizer__empty-icon">📊</div>
                  <h3>No Events to Visualize</h3>
                  <p>Add some events using the Event Builder to see the identity resolution flow.</p>
                </div>
              ) : (
                <DiagramTimeline 
                  events={events}
                  identifierOptions={idResConfig.map(config => ({
                    value: config.id,
                    label: config.name || config.id,
                    priority: idResConfig.indexOf(config) + 1,
                    limit: config.limit,
                    frequency: config.frequency,
                    isCustom: config.isCustom
                  }))}
                  unifySpaceSlug={unifySpaceSlug}
                />
              )}
            </div>
          </div>
    </div>
  );
};

export default Visualizer;
