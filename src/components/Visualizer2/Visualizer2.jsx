import React, { useState, useEffect } from 'react';
import DiagramTimeline2 from './DiagramTimeline2.jsx';
import { exportVisualizerAsImage } from '../../utils/imageExport.js';
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
    // Embed SVG icons as data URIs to avoid loading issues
    const iconSvgs = {
      download: `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 72 72" aria-hidden="true" role="img"><rect x="15" y="33" width="42" height="28" rx="2" fill="none" stroke="white" stroke-width="2"/><path d="M35.52 48.58l14.46-14.46M22.65 34.12l12.87 14.46" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="36" cy="25" r="14" fill="none" stroke="white" stroke-width="2"/><rect x="12.5" y="31.93" width="47" height="28" rx="1.5" fill="none" stroke="white" stroke-width="1.5"/></svg>`)}`,
      unknown: `data:image/svg+xml;base64,${btoa(`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" stroke="white" stroke-width="2"/>
        <path d="M9 9A3 3 0 0 1 15 9C15 11.5 12 11.5 12 13" stroke="white" stroke-width="2" stroke-linecap="round"/>
        <circle cx="12" cy="17" r="1" fill="white"/>
      </svg>`)}`,
      barGraph: `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 72 72" aria-hidden="true" role="img"><rect x="9" y="9" width="8" height="45" fill="none" stroke="white" stroke-width="2"/><rect x="22" y="18" width="8" height="36" fill="none" stroke="white" stroke-width="2"/><rect x="35" y="25" width="8" height="29" fill="none" stroke="white" stroke-width="2"/><rect x="48" y="31" width="8" height="23" fill="none" stroke="white" stroke-width="2"/><circle cx="54.55" cy="15.69" r="9.95" fill="none" stroke="white" stroke-width="2"/><path d="M51 14l2 2 4-4" stroke="white" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`)}`,
      userPlus: `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 72 72" aria-hidden="true" role="img"><circle cx="28" cy="22" r="11" fill="none" stroke="white" stroke-width="2"/><ellipse cx="28" cy="48.5" rx="17" ry="11.5" fill="none" stroke="white" stroke-width="2"/><circle cx="54" cy="26" r="8" fill="none" stroke="white" stroke-width="2"/><path d="M52 23v6M49 26h6" stroke="white" stroke-width="2" stroke-linecap="round"/></svg>`)}`,
      userCheck: `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 73 72" aria-hidden="true" role="img"><circle cx="28.5" cy="22" r="11" fill="none" stroke="white" stroke-width="2"/><ellipse cx="28.5" cy="48.5" rx="17" ry="11.5" fill="none" stroke="white" stroke-width="2"/><circle cx="54.5" cy="26" r="8" fill="none" stroke="white" stroke-width="2"/><path d="M51 24l2 2 4-4" stroke="white" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`)}`,
      unified: `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 29.39 28.13"><circle cx="8.68" cy="6.23" r="5" fill="none" stroke="white" stroke-width="1.5"/><circle cx="18.31" cy="6.23" r="5" fill="none" stroke="white" stroke-width="1.5"/><rect x="6.45" y="14.06" width="14.06" height="11.19" rx="2.88" fill="none" stroke="white" stroke-width="1.5"/><path d="M10 18h8M10 20h6M10 22h8" stroke="white" stroke-width="1" stroke-linecap="round"/></svg>`)}`,
      userProfile: `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 72 72" aria-hidden="true" role="img"><rect x="16" y="15" width="25" height="42" rx="4" fill="none" stroke="white" stroke-width="2"/><circle cx="28.5" cy="28" r="8" fill="none" stroke="white" stroke-width="2"/><rect x="22" y="42" width="13" height="8" rx="2" fill="none" stroke="white" stroke-width="1.5"/><rect x="47" y="20" width="13" height="3" fill="none" stroke="white" stroke-width="1"/><rect x="47" y="28" width="13" height="3" fill="none" stroke="white" stroke-width="1"/><rect x="47" y="36" width="9" height="3" fill="none" stroke="white" stroke-width="1"/><rect x="47" y="44" width="13" height="3" fill="none" stroke="white" stroke-width="1"/><rect x="47" y="52" width="13" height="3" fill="none" stroke="white" stroke-width="1"/></svg>`)}`,
      browserLink: `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 72 72" aria-hidden="true" role="img"><rect x="9" y="13" width="54" height="42" rx="4" fill="none" stroke="white" stroke-width="2"/><circle cx="13" cy="20" r="2" fill="white"/><circle cx="19" cy="20" r="2" fill="white"/><circle cx="25" cy="20" r="2" fill="white"/><rect x="9" y="25" width="54" height="30" fill="none" stroke="white" stroke-width="1"/><path d="M22.5 34.5l7 7 7-7" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M29.5 41.5v-7" stroke="white" stroke-width="2" fill="none"/><rect x="42" y="33" width="6" height="2" fill="none" stroke="white" stroke-width="1"/><rect x="42" y="37" width="8" height="2" fill="none" stroke="white" stroke-width="1"/><rect x="42" y="41" width="8" height="2" fill="none" stroke="white" stroke-width="1"/><rect x="42" y="45" width="6" height="2" fill="none" stroke="white" stroke-width="1"/></svg>`)}`,
      graphMagnifying: `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 72 72" aria-hidden="true" role="img"><circle cx="28" cy="27" r="20" fill="none" stroke="white" stroke-width="3"/><path d="m62 61-12-12" stroke="white" stroke-width="4" stroke-linecap="round"/><path d="M18 32h4l2-6 3 10 3-8 2 6h4" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`)}`,
      // Source type icons
      javascript: `data:image/svg+xml;base64,${btoa(`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="2" width="20" height="20" fill="#F7DF1E" stroke="#FFCE00" stroke-width="2"/>
        <text x="12" y="16" font-family="Arial" font-size="12" font-weight="bold" fill="#333" text-anchor="middle">JS</text>
      </svg>`)}`,
      ios: `data:image/svg+xml;base64,${btoa(`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="4" y="2" width="16" height="20" rx="2" fill="#3373dc" stroke="#2052cc" stroke-width="2"/>
        <circle cx="12" cy="18.5" r="1.5" fill="white"/>
        <rect x="7" y="5" width="10" height="10" fill="white"/>
        <circle cx="12" cy="10" r="2" fill="#3373dc"/>
      </svg>`)}`,
      android: `data:image/svg+xml;base64,${btoa(`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 7C4 5.89543 4.89543 5 6 5H18C19.1046 5 20 5.89543 20 7V17C20 18.1046 19.1046 19 18 19H6C4.89543 19 4 18.1046 4 17V7Z" fill="#a4c639|20a" stroke="#688c4c" stroke-width="2"/>
        <circle cx="8" cy="9" r="1.5" fill="white"/>
        <circle cx="16" cy="9" r="1.5" fill="white"/>
        <path d="M9 13H15" stroke="white" stroke-width="2" stroke-linecap="round"/>
      </svg>`)}`,
      server: `data:image/svg+xml;base64,${btoa(`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="3" width="20" height="4" rx="1" fill="#6373dc" stroke="#4f59c7" stroke-width="2"/>
        <rect x="2" y="10" width="20" height="4" rx="1" fill="#6373dc" stroke="#4f59c7" stroke-width="2"/>
        <rect x="2" y="17" width="20" height="4" rx="1" fill="#6373dc" stroke="#4f59c7" stroke-width="2"/>
        <circle cx="6" cy="5" r="1" fill="white"/>
        <circle cx="6" cy="12" r="1" fill="white"/>
        <circle cx="6" cy="19" r="1" fill="white"/>
      </svg>`)}`,
      web: `data:image/svg+xml;base64,${btoa(`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" stroke="#3373dc" stroke-width="2"/>
        <path d="M2 12H18" stroke="#3373dc" stroke-width="2"/>
        <path d="M12 2C14 6 14 10 12 12C10 14 10 18 12 22" stroke="#3373dc" stroke-width="2"/>
      </svg>`)}`
    };

    // Helper function to get source icon
    const getSourceIconEmoji = (sourceType) => {
      const icons = {
        'javascript': '🌐',
        'ios': '📱', 
        'android': '🤖',
        'server': '🖥️',
        'http': '🔗',
        'react-native': '⚛️',
        'flutter': '🐦',
        'unity': '🎮'
      };
      return icons[sourceType] || '📡';
    };
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
      
      function toggleRawJson(eventNumber) {
        const element = document.getElementById('raw-json-' + eventNumber);
        const button = element.previousElementSibling;
        
        if (element.style.display === 'none') {
          element.style.display = 'block';
          button.textContent = 'Hide Raw JSON';
        } else {
          element.style.display = 'none';
          button.textContent = 'View Raw JSON';
        }
      }
      
      function toggleProfileDetails(profileIndex) {
        const element = document.getElementById('profile-details-' + profileIndex);
        const button = element.previousElementSibling;
        
        if (element.style.display === 'none') {
          element.style.display = 'block';
          button.textContent = 'Hide Profile JSON';
        } else {
          element.style.display = 'none';
          button.textContent = 'View Full Profile JSON';
        }
      }
      
      function toggleProfileDetails(profileIndex) {
        const element = document.getElementById('profile-details-' + profileIndex);
        const button = element.previousElementSibling;
        
        if (element.style.display === 'none') {
          element.style.display = 'block';
          button.textContent = 'Hide Full Profile JSON';
        } else {
          element.style.display = 'none';
          button.textContent = 'View Full Profile JSON';
        }
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
                <img src="${iconSvgs.download}" width="14" height="14" style="vertical-align: middle; margin-right: 6px; filter: brightness(0) invert(1);" alt="Download" /> Download JSON Report
            </button>
        </div>
    </div>

    <div class="analysis-grid">
        <!-- Key Insights -->
        <div class="analysis-section">
            <h2 class="section-title">🔍 Key Insights</h2>
            <div class="insights-list">
                ${analysisData.keyInsights.map(insight => `
                    <div class="insight-item">
                        <div style="text-align: center; margin-bottom: 8px;">
                            <img src="${insight.icon}" width="32" height="32" alt="${insight.label}" />
                        </div>
                        <div>${insight.label}: ${insight.value}</div>
                    </div>
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
                            <img src="${event.sourceIcon || iconSvgs[event.sourceType] || iconSvgs.unknown}" width="20" height="20" style="vertical-align: middle; margin-right: 8px;" alt="${event.sourceType}" />
                            Event ${event.eventNumber}: ${event.eventType}
                        </div>
                        <div class="event-details">
                            <div class="event-detail">
                                <div class="event-detail-label">All Identifiers</div>
                                <div class="event-detail-value">${Object.entries(event.allIdentifiers || {}).map(([key, value]) => `<strong>${key}:</strong> ${value}`).join('<br>')}</div>
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
                                <div class="event-detail-value">${new Date(event.timestamp).toLocaleString()}</div>
                            </div>
                            ${event.segmentId ? `
                                <div class="event-detail">
                                    <div class="event-detail-label">Segment ID</div>
                                    <div class="event-detail-value">${event.segmentId}</div>
                                </div>
                            ` : ''}
                            ${event.sourceType ? `
                                <div class="event-detail">
                                    <div class="event-detail-label">Source Type</div>
                                    <div class="event-detail-value">${event.sourceType}</div>
                                </div>
                            ` : ''}
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
                            <div class="event-detail">
                                <div class="event-detail-label">Raw JSON Payload</div>
                                <div class="event-detail-value">
                                    <button onclick="toggleRawJson(${event.eventNumber})" style="padding: 4px 8px; background: #3373dc; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
                                        View Raw JSON
                                    </button>
                                    <div id="raw-json-${event.eventNumber}" style="display: none; margin-top: 8px; padding: 12px; background: #f5f5f5; border-radius: 4px; font-family: monospace; font-size: 11px; white-space: pre-wrap; max-height: 300px; overflow-y: auto; border: 1px solid #ddd;">
                                        ${JSON.stringify(event.rawPayload, null, 2).replace(/</g, '&lt;').replace(/>/g, '&gt;')}
                                    </div>
                                </div>
                            </div>
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
                
                <!-- Processing Statistics -->
                ${analysisData.finalState.processingStatistics ? `
                    <div style="margin-top: 20px;">
                        <div class="final-state-label" style="margin-bottom: 12px;">Processing Statistics:</div>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 20px;">
                            <div style="text-align: center; padding: 12px; background: var(--color-bg-tertiary); border-radius: 6px;">
                                <div style="font-size: 18px; font-weight: bold; color: var(--color-accent);">${analysisData.finalState.processingStatistics.totalEvents}</div>
                                <div style="font-size: 12px; color: var(--color-text-secondary);">Total Events</div>
                            </div>
                            <div style="text-align: center; padding: 12px; background: var(--color-bg-tertiary); border-radius: 6px;">
                                <div style="font-size: 18px; font-weight: bold; color: var(--color-accent);">${analysisData.finalState.processingStatistics.createActions}</div>
                                <div style="font-size: 12px; color: var(--color-text-secondary);">Profiles Created</div>
                            </div>
                            <div style="text-align: center; padding: 12px; background: var(--color-bg-tertiary); border-radius: 6px;">
                                <div style="font-size: 18px; font-weight: bold; color: var(--color-accent);">${analysisData.finalState.processingStatistics.addActions}</div>
                                <div style="font-size: 12px; color: var(--color-text-secondary);">Add Actions</div>
                            </div>
                            <div style="text-align: center; padding: 12px; background: var(--color-bg-tertiary); border-radius: 6px;">
                                <div style="font-size: 18px; font-weight: bold; color: var(--color-accent);">${analysisData.finalState.processingStatistics.mergeActions}</div>
                                <div style="font-size: 12px; color: var(--color-text-secondary);">Profile Merges</div>
                            </div>
                        </div>
                    </div>
                ` : ''}

                <!-- Detailed Profile Objects -->
                ${analysisData.finalState.profiles && analysisData.finalState.profiles.length > 0 ? `
                    <div style="margin-top: 20px;">
                        <div class="final-state-label" style="margin-bottom: 12px;">Detailed Profile Objects:</div>
                        <div style="display: grid; gap: 16px;">
                            ${analysisData.finalState.profiles.map((profile, index) => `
                                <div style="background: var(--color-bg-tertiary); border-radius: 8px; padding: 16px; border: 1px solid var(--color-border);">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                                        <h4 style="margin: 0; color: var(--color-text-primary);">${profile.profileNumber}</h4>
                                        <span style="font-size: 12px; color: var(--color-text-secondary);">${profile.eventCount} events</span>
                                    </div>
                                    
                                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 12px;">
                                        <div>
                                            <div style="font-weight: bold; font-size: 12px; color: var(--color-text-primary); margin-bottom: 4px;">Internal ID:</div>
                                            <div style="font-family: monospace; font-size: 11px; color: var(--color-text-secondary);">${profile.internalId}</div>
                                        </div>
                                        ${profile.segmentId ? `
                                            <div>
                                                <div style="font-weight: bold; font-size: 12px; color: var(--color-text-primary); margin-bottom: 4px;">Segment ID:</div>
                                                <div style="font-family: monospace; font-size: 11px; color: var(--color-text-secondary);">${profile.segmentId}</div>
                                            </div>
                                        ` : ''}
                                    </div>
                                    
                                    <div style="margin-bottom: 12px;">
                                        <div style="font-weight: bold; font-size: 12px; color: var(--color-text-primary); margin-bottom: 6px;">Contributing Events:</div>
                                        <div style="display: flex; flex-wrap: wrap; gap: 4px;">
                                            ${profile.events.map(event => `
                                                <span style="background: var(--color-accent); color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px;">
                                                    #${event.eventNumber}
                                                </span>
                                            `).join('')}
                                        </div>
                                    </div>
                                    
                                    <button onclick="toggleProfileDetails(${index})" style="padding: 6px 12px; background: #3373dc; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
                                        View Full Profile JSON
                                    </button>
                                    <div id="profile-details-${index}" style="display: none; margin-top: 12px; padding: 12px; background: #f5f5f5; border-radius: 4px; font-family: monospace; font-size: 11px; white-space: pre-wrap; max-height: 300px; overflow-y: auto; border: 1px solid #ddd;">
                                        ${JSON.stringify(profile, null, 2).replace(/</g, '&lt;').replace(/>/g, '&gt;')}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                
                <div style="margin-top: 20px;">
                    <div class="final-state-label" style="margin-bottom: 12px;">Profile Mappings (Internal ID → Display Name):</div>
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
          <p>No profiles loaded yet. Use Profile API Lookup to load profiles.</p>
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
            <img src={`data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIiLz4KPHBhdGggZD0iTTEyIDJWMTJMMTggNiIgZmlsbD0iY3VycmVudENvbG9yIi8+Cjwvc3ZnPgo=`} alt="Visualizer" className="visualizer2__header-icon" />
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

            {/* Image Export Section */}
            <div className="visualizer2__config-section">
              <div className="visualizer__analysis-header">
                <h4>Export <br/>Visualizer <br/>as Image</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginLeft: 'auto' }}>
                  <button
                    className="visualizer__download-button"
                    onClick={() => exportVisualizerAsImage('visualizer-timeline', 'identity-resolution-visualizer')}
                    disabled={events.length === 0}
                    title={events.length === 0 ? "Add events to export" : "Export as standard resolution image"}
                    style={{ padding: '6px 12px', fontSize: '11px', minWidth: '100px' }}
                  >
                    <img src="/assets/Download_symbol.svg" width="12" height="12" style={{verticalAlign: 'middle', marginRight: '4px', filter: 'brightness(0) invert(1)'}} alt="Export" />
                    Export PNG
                  </button>
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
                    <><img src="/assets/graph-magnifying-glass.svg" width="14" height="14" style={{verticalAlign: 'middle', marginRight: '4px', filter: 'brightness(0) invert(1)'}} alt="Analyze" /> Analyze</>
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
                      <img src="/assets/Browser-link.svg" width="12" height="12" style={{verticalAlign: 'middle', marginRight: '4px', filter: 'brightness(0) invert(1)'}} alt="View" /> View
                    </button>
                    <button
                      className="visualizer__download-button"
                      onClick={downloadAnalysis}
                      title="Download Analysis"
                      style={{ padding: '4px 8px', fontSize: '11px' }}
                    >
                      <img src="/assets/Download_symbol.svg" width="12" height="12" style={{verticalAlign: 'middle', marginRight: '4px', filter: 'brightness(0) invert(1)'}} alt="Download" /> Download
                    </button>
                  </div>
                  
                  {/* Key Insights */}
                  <div className="visualizer__analysis-subsection">
                    <h5>Key Insights</h5>
                    <div className="visualizer__insights-list">
                      {analysisData.keyInsights.map((insight, index) => (
                        <div key={`${insight.label}-${insight.value}`} className="visualizer__insight-item">
                          <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                            <img src={insight.icon} width="32" height="32" alt={insight.label} />
                          </div>
                          <div>{insight.label}: {insight.value}</div>
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
