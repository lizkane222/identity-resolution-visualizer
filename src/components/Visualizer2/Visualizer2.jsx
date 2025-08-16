import React, { useState } from 'react';
import DiagramTimeline2 from './DiagramTimeline2.jsx';
import './Visualizer2.css';

const Visualizer2 = ({ 
  events, 
  identifierOptions,
  unifySpaceSlug,
  profileApiResults = {},
  onClose 
}) => {
  // Load ID Resolution Config from localStorage
  const [idResConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('idres_config_identifiers');
      if (saved) {
        return JSON.parse(saved).filter(id => id.enabled);
      }
    } catch {}
    // fallback to defaults if not found
    return [
      { id: 'user_id', name: 'User ID', enabled: true, isCustom: false, limit: 1, frequency: 'Ever' },
      { id: 'email', name: 'Email', enabled: true, isCustom: false, limit: 5, frequency: 'Ever' },
      { id: 'phone', name: 'Phone', enabled: true, isCustom: true, limit: 2, frequency: 'Ever' },
      { id: 'anonymous_id', name: 'Anonymous ID', enabled: true, isCustom: false, limit: 10, frequency: 'Ever' },
    ];
  });

  // Current simulation state
  const [currentSimulation, setCurrentSimulation] = useState(null);

  // Handle simulation updates from DiagramTimeline2
  const handleSimulationUpdate = (simulation) => {
    setCurrentSimulation(simulation);
  };

  // Render profiles from simulation
  const renderSimulationProfiles = () => {
    if (!currentSimulation || currentSimulation.profiles.length === 0) {
      return (
        <div className="visualizer2__empty-profiles">
          <p>No profiles created yet. Process some events to see profiles.</p>
        </div>
      );
    }

    return currentSimulation.profiles.map((profile, index) => (
      <div key={profile.id} className="visualizer2__profile-card">
        <div className="visualizer2__profile-header">
          <h4>{profile.id}</h4>
          <span className="visualizer2__profile-actions">
            {profile.history.length} action{profile.history.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="visualizer2__profile-identifiers">
          {Object.entries(profile.identifiers).map(([type, values]) => (
            <div key={type} className="visualizer2__identifier-row">
              <span className="visualizer2__identifier-type">{type}:</span>
              <span className="visualizer2__identifier-values">
                {Array.from(values).join(', ')}
              </span>
            </div>
          ))}
        </div>
        <div className="visualizer2__profile-history">
          <details>
            <summary>History ({profile.history.length} events)</summary>
            <ul className="visualizer2__history-list">
              {profile.history.map((entry, i) => (
                <li key={i} className="visualizer2__history-item">{entry}</li>
              ))}
            </ul>
          </details>
        </div>
      </div>
    ));
  };

  // Render individual profile card for timeline display
  const renderProfileCardForTimeline = (profileId) => {
    if (!currentSimulation || !profileId) return null;
    
    const profile = currentSimulation.profiles.find(p => p.id === profileId);
    if (!profile) return null;

    return (
      <div className="visualizer2__profile-card visualizer2__profile-card--timeline">
        <div className="visualizer2__profile-header">
          <h4>{profile.id}</h4>
          <span className="visualizer2__profile-actions">
            {profile.history.length} action{profile.history.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="visualizer2__profile-identifiers">
          {Object.entries(profile.identifiers).map(([type, values]) => (
            <div key={type} className="visualizer2__identifier-row">
              <span className="visualizer2__identifier-type">{type}:</span>
              <span className="visualizer2__identifier-values">
                {Array.from(values).join(', ')}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="visualizer2">
      {/* Header */}
      <div className="visualizer2__header">
        <div className="visualizer2__header-top">
          <div className="visualizer2__header-left">
            <img src="/assets/pie-chart.svg" alt="Visualizer" className="visualizer2__header-icon" />
            <h2 className="visualizer2__title">
              Identity Resolution Simulator
              <div className="visualizer2__separator">
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
              Event Processing Simulation
            </h2>
          </div>
          <div className="visualizer2__header-right">
            <button
              className="visualizer2__back-button"
              onClick={onClose}
              title="Back to Builder"
            >
              ← Back to Builder
            </button>
          </div>
        </div>
        <p className="visualizer2__description">
          This simulator processes events through Segment's identity resolution algorithm, 
          showing how profiles are created, merged, and updated based on incoming identifiers.
        </p>
      </div>

      {/* Main Content */}
      <div className="visualizer2__content">
        {/* Left Sidebar - Config and Profiles */}
        <div className="visualizer2__sidebar">
          {/* Sidebar Header */}
          <div className="visualizer2__sidebar-header">
            <h3>Identity Resolution Config</h3>
          </div>
          
          <div className="visualizer2__sidebar-content">
            {/* Identifier Configuration Table */}
            <div className="visualizer2__config-section">
              <div className="visualizer2__identifier-table">
                <div className="visualizer2__table-header">
                  <span className="visualizer2__table-col visualizer2__table-col--priority">PRIORITY</span>
                  <span className="visualizer2__table-col visualizer2__table-col--identifier">IDENTIFIER</span>
                  <span className="visualizer2__table-col visualizer2__table-col--limit">LIMIT</span>
                </div>
                {idResConfig.map((identifier, index) => (
                  <div key={identifier.id} className="visualizer2__table-row">
                    <span className="visualizer2__table-col visualizer2__table-col--priority">{index + 1}</span>
                    <span className="visualizer2__table-col visualizer2__table-col--identifier">
                      <span>
                        {identifier.id}
                        {identifier.isCustom && <span className="visualizer2__custom-indicator">*</span>}
                      </span>
                    </span>
                    <span className="visualizer2__table-col visualizer2__table-col--limit">{identifier.limit}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Current Settings Section */}
            <div className="visualizer2__config-section">
              <h4>Current Settings</h4>
              <div className="visualizer2__setting-item">
                <span className="visualizer2__setting-label">Unify Space:</span>
                <span className="visualizer2__setting-value">{unifySpaceSlug || 'Not configured'}</span>
              </div>
              <div className="visualizer2__setting-item">
                <span className="visualizer2__setting-label">Events to Process:</span>
                <span className="visualizer2__setting-value">{events.length}</span>
              </div>
              <div className="visualizer2__setting-item">
                <span className="visualizer2__setting-label">Enabled Identifiers:</span>
                <span className="visualizer2__setting-value">{idResConfig.length}</span>
              </div>
            </div>

            {/* Configuration Stats Section */}
            <div className="visualizer2__config-section">
              <h4>Resolution Statistics</h4>
              <div className="visualizer2__config-stats">
                <div className="visualizer2__stat">
                  <span className="visualizer2__stat-label">Events:</span>
                  <span className="visualizer2__stat-value">{events.length}</span>
                </div>
                <div className="visualizer2__stat">
                  <span className="visualizer2__stat-label">Profiles:</span>
                  <span className="visualizer2__stat-value">
                    {currentSimulation ? currentSimulation.profiles.length : 0}
                  </span>
                </div>
                <div className="visualizer2__stat">
                  <span className="visualizer2__stat-label">Identifiers:</span>
                  <span className="visualizer2__stat-value">{idResConfig.length}</span>
                </div>
              </div>
            </div>

            {/* Profiles Section - Removed, now showing above events in timeline */}
            {/* Profile cards are now displayed above their corresponding events */}
          </div>
        </div>

        {/* Main Content - Event Timeline */}
        <div className="visualizer2__main-content">
          {events.length === 0 ? (
            <div className="visualizer2__empty-state">
              <div className="visualizer2__empty-icon">🔍</div>
              <h3>No Events to Process</h3>
              <p>Add some events using the Event Builder to see the identity resolution simulation.</p>
            </div>
          ) : (
            <DiagramTimeline2 
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
              onSimulationUpdate={handleSimulationUpdate}
              currentSimulation={currentSimulation}
              renderProfileCard={renderProfileCardForTimeline}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Visualizer2;
