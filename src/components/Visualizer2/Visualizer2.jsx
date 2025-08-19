import React, { useState, useEffect } from 'react';
import DiagramTimeline2 from './DiagramTimeline2.jsx';
import './Visualizer2.css';
import '../Visualizer/AnalysisSidebar.css';
import '../Visualizer/Visualizer.css';

const Visualizer2 = ({ 
  events, 
  identifierOptions,
  unifySpaceSlug,
  profileApiResults = {},
  onClose 
}) => {
  // State for analysis
  const [analysisData, setAnalysisData] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
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

  // Handle analysis updates from DiagramTimeline2
  const handleAnalysisUpdate = (analysis) => {
    setAnalysisData(analysis);
    setIsAnalyzing(false);
  };

  // Trigger analysis computation
  const handleAnalyzeClick = async () => {
    setIsAnalyzing(true);
    setAnalysisData(null);
    
    // Trigger analysis by calling the DiagramTimeline2 component's analysis function
    setTimeout(() => {
      const analysisEvent = new CustomEvent('triggerAnalysis');
      document.dispatchEvent(analysisEvent);
    }, 100);
  };

  // Download analysis as JSON
  const downloadAnalysis = () => {
    if (!analysisData) return;
    
    const dataStr = JSON.stringify(analysisData.downloadData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const link = document.createElement('a');
    link.href = dataUri;
    link.download = `identity-resolution-analysis-${new Date().toISOString().split('T')[0]}.json`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Open analysis in new tab
  const openAnalysisInNewTab = (analysisData) => {
    if (!analysisData) return;
    
    const analysisHtml = generateAnalysisHtml(analysisData);
    const blob = new Blob([analysisHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    const newWindow = window.open(url, '_blank');
    if (newWindow) {
      newWindow.onload = () => {
        URL.revokeObjectURL(url);
      };
    }
  };

  // Generate HTML for full-page analysis view
  const generateAnalysisHtml = (analysisData) => {
    const downloadAnalysisJS = `
      function downloadAnalysis() {
        const analysisData = ${JSON.stringify(analysisData.downloadData, null, 2)};
        const dataStr = JSON.stringify(analysisData, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const link = document.createElement('a');
        link.href = dataUri;
        link.download = 'identity-resolution-analysis-' + new Date().toISOString().split('T')[0] + '.json';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    `;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Identity Resolution Analysis - Full Report</title>
    <style>
        :root {
            --color-bg-primary: #ffffff;
            --color-bg-secondary: #f8fafc;
            --color-bg-tertiary: #f1f5f9;
            --color-text-primary: #1e293b;
            --color-text-secondary: #64748b;
            --color-border: #e2e8f0;
            --color-accent: #3b82f6;
            --color-accent-hover: #2563eb;
            --color-success: #059669;
            --color-warning: #d97706;
            --color-error: #dc2626;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            background: var(--color-bg-primary);
            color: var(--color-text-primary);
            line-height: 1.6;
            padding: 24px;
            max-width: 1200px;
            margin: 0 auto;
        }

        .analysis-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 32px;
            padding-bottom: 24px;
            border-bottom: 2px solid var(--color-border);
        }

        .analysis-title {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .analysis-title h1 {
            font-size: 32px;
            font-weight: 700;
            color: var(--color-text-primary);
        }

        .analysis-icon {
            font-size: 32px;
        }

        .analysis-meta {
            text-align: right;
            color: var(--color-text-secondary);
            font-size: 14px;
        }

        .download-button {
            padding: 12px 20px;
            background: var(--color-success);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: background-color 0.2s ease;
            margin-top: 8px;
        }

        .download-button:hover {
            background: #047857;
        }

        .analysis-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 32px;
            margin-bottom: 32px;
        }

        .analysis-section {
            background: var(--color-bg-secondary);
            border-radius: 12px;
            padding: 24px;
            border: 1px solid var(--color-border);
        }

        .analysis-section--full {
            grid-column: 1 / -1;
        }

        .section-title {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 16px;
            color: var(--color-text-primary);
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .insights-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .insight-item {
            padding: 16px;
            background: var(--color-bg-primary);
            border-radius: 8px;
            border-left: 4px solid var(--color-accent);
            font-size: 14px;
            color: var(--color-text-primary);
        }

        .events-timeline {
            display: flex;
            flex-direction: column;
            gap: 16px;
            max-height: 600px;
            overflow-y: auto;
        }

        .event-card {
            background: var(--color-bg-primary);
            border-radius: 8px;
            padding: 20px;
            border: 1px solid var(--color-border);
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .event-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .event-header {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 12px;
            color: var(--color-text-primary);
        }

        .event-details {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px 24px;
            font-size: 13px;
            color: var(--color-text-secondary);
        }

        .event-detail {
            display: flex;
            flex-direction: column;
        }

        .event-detail-label {
            font-weight: 600;
            color: var(--color-text-primary);
            margin-bottom: 4px;
        }

        .event-detail-value {
            word-break: break-word;
        }

        .final-state {
            background: var(--color-bg-primary);
            border-radius: 8px;
            padding: 20px;
            border: 1px solid var(--color-border);
        }

        .final-state-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
            font-size: 14px;
        }

        .final-state-label {
            font-weight: 600;
            color: var(--color-text-primary);
        }

        .final-state-value {
            color: var(--color-text-secondary);
            font-family: 'Monaco', 'Courier New', monospace;
        }

        .profile-mappings {
            background: var(--color-bg-tertiary);
            border-radius: 8px;
            padding: 16px;
            margin-top: 16px;
            border: 1px solid var(--color-border);
            white-space: pre-wrap;
            font-family: 'Monaco', 'Courier New', monospace;
            font-size: 12px;
            color: var(--color-text-secondary);
            overflow-x: auto;
            max-height: 300px;
            overflow-y: auto;
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
        }

        .stat-card {
            background: var(--color-bg-primary);
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            border: 1px solid var(--color-border);
        }

        .stat-number {
            font-size: 32px;
            font-weight: 700;
            color: var(--color-accent);
            margin-bottom: 8px;
        }

        .stat-label {
            font-size: 14px;
            color: var(--color-text-secondary);
            font-weight: 500;
        }

        @media (max-width: 768px) {
            .analysis-grid {
                grid-template-columns: 1fr;
            }
            
            .event-details {
                grid-template-columns: 1fr;
            }
            
            .analysis-header {
                flex-direction: column;
                gap: 16px;
                text-align: center;
            }
        }
    </style>
</head>
<body>
    <div class="analysis-header">
        <div class="analysis-title">
            <span class="analysis-icon">📊</span>
            <h1>Identity Resolution Analysis</h1>
        </div>
        <div class="analysis-meta">
            <div><strong>Generated:</strong> ${new Date(analysisData.downloadData.generatedAt).toLocaleString()}</div>
            <div><strong>Events Processed:</strong> ${analysisData.downloadData.eventCount}</div>
            <button class="download-button" onclick="downloadAnalysis()">
                <img src="/assets/Download_symbol.svg" width="14" height="14" style="vertical-align: middle; margin-right: 6px;" alt="Download" /> Download JSON Report
            </button>
        </div>
    </div>

    <div class="analysis-grid">
        <!-- Key Insights -->
        <div class="analysis-section">
            <h2 class="section-title">🔍 Key Insights</h2>
            <div class="insights-list">
                ${analysisData.keyInsights.map(insight => `
                    <div class="insight-item">${insight}</div>
                `).join('')}
            </div>
        </div>

        <!-- Summary Statistics -->
        <div class="analysis-section">
            <h2 class="section-title">📈 Summary Statistics</h2>
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-number">${analysisData.downloadData.eventCount}</div>
                    <div class="stat-label">Total Events</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${analysisData.finalState.totalProfiles}</div>
                    <div class="stat-label">Final Profiles</div>
                </div>
            </div>
        </div>

        <!-- Event Sequence Analysis -->
        <div class="analysis-section analysis-section--full">
            <h2 class="section-title">⏰ Event Sequence Analysis</h2>
            <div class="events-timeline">
                ${analysisData.eventSequence.map(event => `
                    <div class="event-card">
                        <div class="event-header">
                            Event ${event.eventNumber}: ${event.eventType}
                        </div>
                        <div class="event-details">
                            <div class="event-detail">
                                <div class="event-detail-label">Identifiers</div>
                                <div class="event-detail-value">${event.identifiers || 'None'}</div>
                            </div>
                            <div class="event-detail">
                                <div class="event-detail-label">Expected Action</div>
                                <div class="event-detail-value">${event.expectedAction}</div>
                            </div>
                            <div class="event-detail">
                                <div class="event-detail-label">Reason</div>
                                <div class="event-detail-value">${event.reason}</div>
                            </div>
                            <div class="event-detail">
                                <div class="event-detail-label">Timestamp</div>
                                <div class="event-detail-value">${event.timestamp}</div>
                            </div>
                            ${event.mergeDirection ? `
                                <div class="event-detail">
                                    <div class="event-detail-label">Merge Direction</div>
                                    <div class="event-detail-value">${event.mergeDirection}</div>
                                </div>
                            ` : ''}
                            ${event.processingLog ? `
                                <div class="event-detail">
                                    <div class="event-detail-label">Processing Log</div>
                                    <div class="event-detail-value">${event.processingLog}</div>
                                </div>
                            ` : ''}
                            ${event.droppedIdentifiers.length > 0 ? `
                                <div class="event-detail">
                                    <div class="event-detail-label">Dropped Identifiers</div>
                                    <div class="event-detail-value">${event.droppedIdentifiers.join(', ')}</div>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>

        <!-- Final Profile State -->
        <div class="analysis-section analysis-section--full">
            <h2 class="section-title">🎯 Final Profile State</h2>
            <div class="final-state">
                <div class="final-state-item">
                    <span class="final-state-label">Total Profiles:</span>
                    <span class="final-state-value">${analysisData.finalState.totalProfiles}</span>
                </div>
                <div class="final-state-item">
                    <span class="final-state-label">Analysis Completed:</span>
                    <span class="final-state-value">${new Date(analysisData.finalState.lastProcessedAt).toLocaleString()}</span>
                </div>
                <div>
                    <div class="final-state-label" style="margin-bottom: 12px;">Profile Mappings:</div>
                    <div class="profile-mappings">${JSON.stringify(analysisData.finalState.profileMappings, null, 2)}</div>
                </div>
            </div>
        </div>
    </div>

    <script>
        ${downloadAnalysisJS}
    </script>
</body>
</html>
    `;
  };

  // Current simulation state
  const [currentSimulation, setCurrentSimulation] = useState(null);

  // Handle simulation updates from DiagramTimeline2
  const handleSimulationUpdate = (simulation) => {
    setCurrentSimulation(simulation);
  };

  // Render profiles from Profile API results
  const renderProfileApiResults = () => {
    if (!profileApiResults || Object.keys(profileApiResults).length === 0) {
      return (
        <div className="visualizer2__empty-profiles">
          <p>No profiles loaded yet. Use Profile Lookup to load profiles.</p>
        </div>
      );
    }

    // Convert Profile API results to profile objects using the same logic as DiagramTimeline2
    const profilesMap = new Map();

    Object.entries(profileApiResults).forEach(([identifier, result]) => {
      if (!result) return;

      let segmentId = null;
      let profileKey = identifier;

      // Handle both old format and new merged format
      const endpointsToProcess = [];
      
      if (result._combinedData) {
        Object.entries(result._combinedData).forEach(([endpoint, data]) => {
          endpointsToProcess.push({ endpoint, data, identifier });
        });
      } else if (result.data) {
        const endpoint = result._endpoint || 'unknown';
        endpointsToProcess.push({ endpoint, data: result.data, identifier });
      }

      // First pass: look for segment_id in metadata
      endpointsToProcess.forEach(({ endpoint: endpointType, data }) => {
        if (endpointType === 'metadata' && data && data.segment_id) {
          segmentId = data.segment_id;
          profileKey = segmentId;
        }
      });

      // Get or create profile
      if (!profilesMap.has(profileKey)) {
        profilesMap.set(profileKey, {
          id: profileKey,
          segmentId: segmentId,
          lookupIdentifier: identifier,
          identifiers: {},
        });
      }

      const profile = profilesMap.get(profileKey);

      // Process external IDs
      endpointsToProcess.forEach(({ endpoint: endpointType, data }) => {
        if (endpointType === 'external_ids') {
          const externalIdsArray = Array.isArray(data) ? data : (data.data || []);
          externalIdsArray.forEach(extId => {
            if (extId.type && extId.id) {
              if (!profile.identifiers[extId.type]) {
                profile.identifiers[extId.type] = [];
              }
              if (!profile.identifiers[extId.type].includes(extId.id)) {
                profile.identifiers[extId.type].push(extId.id);
              }
            }
          });
        }
      });
    });

    const profiles = Array.from(profilesMap.values());

    return profiles.map((profile, index) => (
      <div key={profile.id} className="visualizer2__profile-card">
        <div className="visualizer2__profile-header">
          <h4>{profile.id}</h4>
          <h4>{profile.segmentId}</h4>
          <span className="visualizer2__profile-actions">
            {Object.keys(profile.identifiers).length} identifier{Object.keys(profile.identifiers).length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="visualizer2__profile-identifiers">
          {Object.entries(profile.identifiers).map(([type, values]) => (
            <div key={type} className="visualizer2__identifier-row">
              <span className="visualizer2__identifier-type">{type}:</span>
              <span className="visualizer2__identifier-values">
                {Array.isArray(values) ? values.join(', ') : values}
              </span>
            </div>
          ))}
        </div>
      </div>
    ));
  };

  return (
    <div className="visualizer2">
      {/* Header */}
      {/* <div className="visualizer2__header">
        <div className="visualizer2__header-top">
          <div className="visualizer2__header-left">
            <img src="/assets/pie-chart.svg" alt="Visualizer" className="visualizer2__header-icon" />
            <h2 className="visualizer2__title">
              Identity Resolution Visualizer
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
              Event Flow 
            </h2>
          </div>
        </div>
        <p className="visualizer2__description">
          This visualizer shows how events flow through Segment's identity resolution algorithm, 
          highlighting how profiles are created, merged, and updated based on incoming identifiers.
        </p>
      </div> */}

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
                    {(() => {
                      if (!profileApiResults || Object.keys(profileApiResults).length === 0) return 0;
                      const seenProfiles = new Set();
                      
                      Object.entries(profileApiResults).forEach(([identifier, result]) => {
                        if (!result) return;
                        
                        let profileKey = identifier;
                        
                        // Check for segment_id in metadata
                        if (result._combinedData && result._combinedData.metadata) {
                          const metadata = result._combinedData.metadata;
                          if (metadata.segment_id) {
                            profileKey = metadata.segment_id;
                          }
                        }
                        
                        seenProfiles.add(profileKey);
                      });
                      
                      return seenProfiles.size;
                    })()}
                  </span>
                </div>
                <div className="visualizer2__stat">
                  <span className="visualizer2__stat-label">Identifiers:</span>
                  <span className="visualizer2__stat-value">{idResConfig.length}</span>
                </div>
              </div>
            </div>

            {/* Analysis Section */}
            <div className="visualizer2__config-section">
              <div className="visualizer__analysis-header">
                <h4>Identity <br/>Resolution <br/>Analysis</h4>
                <button
                  className="visualizer__download-button"
                  onClick={handleAnalyzeClick}
                  disabled={events.length === 0 || isAnalyzing}
                  title={events.length === 0 ? "Add events to analyze" : "Analyze identity resolution"}
                  style={{ marginLeft: 'auto', padding: '6px 12px', fontSize: '12px' }}
                >
                  {isAnalyzing ? 
                    <>⏳ Analyzing...</> : 
                    <><img src="/assets/graph-magnifying-glass.svg" width="14" height="14" style={{verticalAlign: 'middle', marginRight: '4px'}} alt="Analyze" /> Analyze</>
                  }
                </button>
              </div>

              {analysisData && (
                <>
                  <div style={{ marginBottom: '12px', textAlign: 'right', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button
                      className="visualizer__download-button"
                      onClick={() => openAnalysisInNewTab(analysisData)}
                      title="View Full Analysis"
                      style={{ padding: '4px 8px', fontSize: '11px', backgroundColor: '#6366f1' }}
                    >
                      <img src="/assets/Browser-link.svg" width="12" height="12" style={{verticalAlign: 'middle', marginRight: '4px'}} alt="View" /> View
                    </button>
                    <button
                      className="visualizer__download-button"
                      onClick={downloadAnalysis}
                      title="Download Analysis"
                      style={{ padding: '4px 8px', fontSize: '11px' }}
                    >
                      <img src="/assets/Download_symbol.svg" width="12" height="12" style={{verticalAlign: 'middle', marginRight: '4px'}} alt="Download" /> Download
                    </button>
                  </div>
                  
                  {/* Key Insights */}
                  <div className="visualizer__analysis-subsection">
                    <h5>Key Insights</h5>
                    <div className="visualizer__insights-list">
                      {analysisData.keyInsights.map((insight, index) => (
                        <div key={index} className="visualizer__insight-item" dangerouslySetInnerHTML={{ __html: insight }}>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Event Sequence Analysis */}
                  <div className="visualizer__analysis-subsection">
                    <h5>Event Sequence Analysis</h5>
                    <div className="visualizer__sequence-list">
                      {analysisData.eventSequence.map((event, index) => (
                        <div key={index} className="visualizer__sequence-item">
                          <div className="visualizer__event-header">
                            <strong>Event {event.eventNumber}: {event.eventType}</strong>
                          </div>
                          <div className="visualizer__event-details">
                            <div><strong>Identifiers:</strong> {event.identifiers || 'None'}</div>
                            <div><strong>Expected Action:</strong> {event.expectedAction}</div>
                            <div><strong>Reason:</strong> {event.reason}</div>
                            {event.mergeDirection && (
                              <div><strong>Merge Direction:</strong> {event.mergeDirection}</div>
                            )}
                            {event.processingLog && (
                              <div><strong>Processing Log:</strong> {event.processingLog}</div>
                            )}
                            {event.droppedIdentifiers.length > 0 && (
                              <div><strong>Dropped:</strong> {event.droppedIdentifiers.join(', ')}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Final State */}
                  <div className="visualizer__analysis-subsection">
                    <h5>Final Profile State</h5>
                    <div className="visualizer__final-state">
                      <div><strong>Total Profiles:</strong> {analysisData.finalState.totalProfiles}</div>
                      <div><strong>Profile Mappings:</strong></div>
                      <pre className="visualizer__profile-mappings">
                        {JSON.stringify(analysisData.finalState.profileMappings, null, 2)}
                      </pre>
                    </div>
                  </div>
                </>
              )}

              {!analysisData && !isAnalyzing && events.length > 0 && (
                <div className="visualizer__analysis-placeholder">
                  <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', textAlign: 'center', margin: '16px 0' }}>
                    Click "Analyze" to generate comprehensive identity resolution analysis
                  </p>
                </div>
              )}

              {events.length === 0 && (
                <div className="visualizer__analysis-placeholder">
                  <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', textAlign: 'center', margin: '16px 0' }}>
                    Add events to enable analysis
                  </p>
                </div>
              )}
            </div>

            {/* Profiles Section */}
            {/* <div className="visualizer2__profiles-section">
              <h3>Profiles</h3>
              <div className="visualizer2__profiles-container">
                {renderProfileApiResults()}
              </div>
            </div> */}
          </div>
        </div>

        {/* Main Content - Event Timeline */}
        <div className="visualizer2__main-content">
          {/* Floating Back Button */}
          <button
            className="visualizer2__back-button-floating"
            onClick={onClose}
            title="Back to Builder"
          >
            ← Back to Builder
          </button>
          
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
              profileApiResults={profileApiResults}
              onSimulationUpdate={handleSimulationUpdate}
              onAnalysisUpdate={handleAnalysisUpdate}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Visualizer2;
