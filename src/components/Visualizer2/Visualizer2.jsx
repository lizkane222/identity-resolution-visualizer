import React, { useState, useEffect, useRef } from 'react';
import { IdentitySimulation } from '../../utils/identitySimulation.js';
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
      { id: 'email', name: 'Email', enabled: true, isCustom: false, limit: 5, frequency: 'Ever' },
      { id: 'phone', name: 'Phone', enabled: true, isCustom: true, limit: 2, frequency: 'Ever' },
      { id: 'anonymous_id', name: 'Anonymous ID', enabled: true, isCustom: false, limit: 10, frequency: 'Ever' },
    ];
  });

  return (
    <div className="visualizer2">
      {/* Header */}
      <div className="visualizer2__header">
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
            title="Back to Main App"
          >
            ← Back to Main
          </button>
        </div>
      </div>

      {/* Description */}
      <div className="visualizer2__description">
        <p>
          This simulator processes events through Segment's identity resolution algorithm, 
          showing how profiles are created, merged, and updated based on incoming identifiers.
        </p>
      </div>

      {/* Main Content */}
      <div className="visualizer2__content">
        {/* Left Sidebar - Config and Profiles */}
        <div className="visualizer2__sidebar">
          {/* Configuration Section */}
          <div className="visualizer2__config-section">
            <h3>Resolution Configuration</h3>
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

            {/* Process Button */}
            <button 
              className="visualizer2__process-button"
              onClick={processEvents}
              disabled={isProcessing || events.length === 0}
            >
              {isProcessing ? 'Processing...' : 'Reprocess Events'}
            </button>
          </div>

          {/* Profiles Section */}
          <div className="visualizer2__profiles-section">
            <h3>Created Profiles</h3>
            <div className="visualizer2__profiles-container">
              {renderSimulationProfiles()}
            </div>
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
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Visualizer2;
