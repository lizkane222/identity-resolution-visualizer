import React, { useState, useEffect } from 'react';
import DiagramTimeline2 from './DiagramTimeline2.jsx';
import { exportVisualizerAsImage } from '../../utils/imageExport.js';
import html2canvas from 'html2canvas';
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

  // Helper function to get sources from localStorage
  const getSourcesConfig = () => {
    try {
      const saved = localStorage.getItem('sourceConfig');
      if (saved) {
        const config = JSON.parse(saved);
        return config.sources || [];
      }
    } catch (error) {
      console.error('Error loading source config:', error);
    }
    return [];
  };

  // Helper function to get unify space configuration
  const getUnifySpaceConfig = () => {
    const processedSlug = unifySpaceSlug ? unifySpaceSlug.trim() : '';
    let generatedURL = '';
    let workspaceSlug = '';
    let spaceId = '';
    
    if (processedSlug) {
      // Check if input contains a Segment URL pattern
      const urlMatch = processedSlug.match(/segment\.com\/([^/]+)\/(?:unify|engage)\/spaces\/([^/]+)/);
      if (urlMatch) {
        workspaceSlug = urlMatch[1];
        spaceId = urlMatch[2];
        generatedURL = `https://app.segment.com/${workspaceSlug}/unify/spaces/${spaceId}`;
      } else {
        // Assume it's just the space ID
        spaceId = processedSlug;
        generatedURL = `https://app.segment.com/[workspace]/unify/spaces/${spaceId}`;
      }
    }
    
    return { processedSlug, generatedURL, workspaceSlug, spaceId };
  };

  // Helper function to format Profile API results for display
  const formatProfileApiResults = () => {
    if (!profileApiResults || Object.keys(profileApiResults).length === 0) {
      return { raw: {}, formatted: [], csv: [] };
    }

    const formatted = [];
    const csv = [];

    Object.entries(profileApiResults).forEach(([key, result]) => {
      if (result && result.profile) {
        const profile = result.profile;
        
        // Formatted profile for display
        formatted.push({
          key,
          segmentId: profile.segment_id || profile.id || 'N/A',
          identifiers: profile.identifiers || {},
          traits: profile.traits || {},
          externalIds: profile.external_ids || []
        });

        // CSV row data
        const identifierTypes = profile.identifiers ? Object.keys(profile.identifiers) : [];
        const identifierValues = profile.identifiers ? Object.values(profile.identifiers).map(v => 
          Array.isArray(v) ? v.join('; ') : v
        ) : [];
        
        csv.push({
          'Segment ID': profile.segment_id || profile.id || 'N/A',
          'Identifier Types': identifierTypes.join(', '),
          'Identifier Values': identifierValues.join(' | '),
          'Trait Count': Object.keys(profile.traits || {}).length,
          'External ID Count': (profile.external_ids || []).length
        });
      }
    });

    return {
      raw: profileApiResults,
      formatted,
      csv
    };
  };

  // Helper function to capture visualizer as data URL
  const captureVisualizerImage = async () => {
    try {
      const element = document.getElementById('visualizer-timeline') || document.querySelector('.diagram-timeline2');
      
      if (!element) {
        console.warn('Visualizer element not found for capture');
        return null;
      }

      const options = {
        allowTaint: true,
        useCORS: true,
        scale: 2,
        width: element.scrollWidth,
        height: element.scrollHeight,
        scrollX: 0,
        scrollY: 0,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          const clonedElement = clonedDoc.getElementById('visualizer-timeline') || clonedDoc.querySelector('.diagram-timeline2');
          if (clonedElement) {
            clonedElement.style.overflow = 'visible';
            clonedElement.style.height = 'auto';
            clonedElement.style.maxHeight = 'none';
          }
        }
      };

      const canvas = await html2canvas(element, options);
      return canvas.toDataURL('image/png', 0.9);
    } catch (error) {
      console.error('Error capturing visualizer image:', error);
      return null;
    }
  };

  // Open analysis in new tab (with PNG capture)
  const openAnalysisInNewTab = async (analysisData) => {
    if (!analysisData) return;
    
    // Capture visualizer image
    const visualizerImageDataUrl = await captureVisualizerImage();
    
    const analysisHtml = generateAnalysisHtml(analysisData, visualizerImageDataUrl);
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
  const generateAnalysisHtml = (analysisData, visualizerImageDataUrl = null) => {
    // Get sources configuration to embed in the HTML
    const sourcesConfig = getSourcesConfig();
    
    // Embed SVG icons as data URIs to avoid loading issues
    const iconSvgs = {
      download: `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 72 72" aria-hidden="true" role="img"><rect x="15" y="33" width="42" height="28" rx="2" fill="none" stroke="white" stroke-width="2"/><path d="M35.52 48.58l14.46-14.46M22.65 34.12l12.87 14.46" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="36" cy="25" r="14" fill="none" stroke="white" stroke-width="2"/><rect x="12.5" y="31.93" width="47" height="28" rx="1.5" fill="none" stroke="white" stroke-width="1.5"/></svg>`)}`,
      unknown: `data:image/svg+xml;base64,${btoa(`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" stroke="white" stroke-width="2"/>
        <path d="M9 9A3 3 0 0 1 15 9C15 11.5 12 11.5 12 13" stroke="white" stroke-width="2" stroke-linecap="round"/>
        <circle cx="12" cy="17" r="1" fill="white"/>
      </svg>`)}`,
      barGraph: `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 72 72" aria-hidden="true" role="img"><rect x="9" y="9" width="8" height="45" fill="#3b82f6" stroke="#2563eb" stroke-width="2"/><rect x="22" y="18" width="8" height="36" fill="#3b82f6" stroke="#2563eb" stroke-width="2"/><rect x="35" y="25" width="8" height="29" fill="#3b82f6" stroke="#2563eb" stroke-width="2"/><rect x="48" y="31" width="8" height="23" fill="#3b82f6" stroke="#2563eb" stroke-width="2"/><circle cx="54.55" cy="15.69" r="9.95" fill="none" stroke="#059669" stroke-width="2"/><path d="M51 14l2 2 4-4" stroke="#059669" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`)}`,
      userPlus: `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 72 72" aria-hidden="true" role="img"><circle cx="28" cy="22" r="11" fill="none" stroke="#3b82f6" stroke-width="2"/><ellipse cx="28" cy="48.5" rx="17" ry="11.5" fill="none" stroke="#3b82f6" stroke-width="2"/><circle cx="54" cy="26" r="8" fill="none" stroke="#059669" stroke-width="2"/><path d="M52 23v6M49 26h6" stroke="#059669" stroke-width="2" stroke-linecap="round"/></svg>`)}`,
      userCheck: `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 73 72" aria-hidden="true" role="img"><circle cx="28.5" cy="22" r="11" fill="none" stroke="#3b82f6" stroke-width="2"/><ellipse cx="28.5" cy="48.5" rx="17" ry="11.5" fill="none" stroke="#3b82f6" stroke-width="2"/><circle cx="54.5" cy="26" r="8" fill="none" stroke="#059669" stroke-width="2"/><path d="M51 24l2 2 4-4" stroke="#059669" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`)}`,
      unified: `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 29.39 28.13"><circle cx="8.68" cy="6.23" r="5" fill="none" stroke="#3b82f6" stroke-width="1.5"/><circle cx="18.31" cy="6.23" r="5" fill="none" stroke="#3b82f6" stroke-width="1.5"/><rect x="6.45" y="14.06" width="14.06" height="11.19" rx="2.88" fill="none" stroke="#3b82f6" stroke-width="1.5"/><path d="M10 18h8M10 20h6M10 22h8" stroke="#3b82f6" stroke-width="1" stroke-linecap="round"/></svg>`)}`,
      userProfile: `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 72 72" aria-hidden="true" role="img"><rect x="16" y="15" width="25" height="42" rx="4" fill="none" stroke="#3b82f6" stroke-width="2"/><circle cx="28.5" cy="28" r="8" fill="none" stroke="#3b82f6" stroke-width="2"/><rect x="22" y="42" width="13" height="8" rx="2" fill="none" stroke="#3b82f6" stroke-width="1.5"/><rect x="47" y="20" width="13" height="3" fill="none" stroke="#64748b" stroke-width="1"/><rect x="47" y="28" width="13" height="3" fill="none" stroke="#64748b" stroke-width="1"/><rect x="47" y="36" width="9" height="3" fill="none" stroke="#64748b" stroke-width="1"/><rect x="47" y="44" width="13" height="3" fill="none" stroke="#64748b" stroke-width="1"/><rect x="47" y="52" width="13" height="3" fill="none" stroke="#64748b" stroke-width="1"/></svg>`)}`,
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
      
      function downloadHTMLReport() {
        const htmlContent = document.documentElement.outerHTML;
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = 'identity-resolution-analysis-' + new Date().toISOString().split('T')[0] + '.html';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
      
      async function downloadPDFReport() {
        const button = event.target;
        const originalText = button.textContent;
        button.textContent = '⏳ Generating PDF...';
        button.disabled = true;
        
        try {
          // Expand all collapsible sections for PDF
          const collapsibleSections = document.querySelectorAll('[id^="insight-details-"], [id^="raw-json-"], [id^="profile-details-"]');
          const originalStates = [];
          
          collapsibleSections.forEach(section => {
            originalStates.push({
              element: section,
              display: section.style.display
            });
            section.style.display = 'block';
          });
          
          // Use browser's print functionality
          window.print();
          
          // Restore original states
          originalStates.forEach(state => {
            state.element.style.display = state.display;
          });
          
          button.textContent = originalText;
          button.disabled = false;
        } catch (error) {
          console.error('PDF generation failed:', error);
          alert('PDF generation failed. Please use "Download HTML Report" instead or try printing the page.');
          button.textContent = originalText;
          button.disabled = false;
        }
      }
      
      async function shareReportLink() {
        const button = event.target;
        const originalText = button.textContent;
        button.textContent = '⏳ Generating Link...';
        button.disabled = true;
        
        try {
          const htmlContent = document.documentElement.outerHTML;
          
          // Option 1: Use Web Share API if available (mobile-friendly)
          if (navigator.share) {
            const blob = new Blob([htmlContent], { type: 'text/html' });
            const file = new File([blob], 'identity-resolution-analysis.html', { type: 'text/html' });
            
            try {
              await navigator.share({
                title: 'Identity Resolution Analysis Report',
                text: 'View the full identity resolution analysis report',
                files: [file]
              });
              
              button.textContent = '✓ Shared!';
              setTimeout(() => {
                button.textContent = originalText;
                button.disabled = false;
              }, 2000);
              return;
            } catch (shareError) {
              // Fall through to clipboard option if share fails
              console.log('Web Share failed, falling back to clipboard');
            }
          }
          
          // Option 2: Copy to clipboard with instructions
          const blob = new Blob([htmlContent], { type: 'text/html' });
          const reader = new FileReader();
          
          reader.onload = function() {
            const base64 = reader.result.split(',')[1];
            const shareMessage = \`To share this report:

1. Save as HTML file:
   - Click "Download HTML Report" button above
   - Upload to Google Drive, Dropbox, or any file hosting service
   - Share the link from your cloud storage

2. Or copy this report data:
   (Report size: \${(htmlContent.length / 1024).toFixed(1)} KB)

Note: For best viewing experience, share via cloud storage link rather than email attachment.\`;
            
            // Copy message to clipboard
            navigator.clipboard.writeText(shareMessage).then(() => {
              alert(shareMessage);
              button.textContent = '💡 Instructions Copied';
              setTimeout(() => {
                button.textContent = originalText;
                button.disabled = false;
              }, 3000);
            }).catch(err => {
              alert(shareMessage);
              button.textContent = originalText;
              button.disabled = false;
            });
          };
          
          reader.readAsDataURL(blob);
          
        } catch (error) {
          console.error('Share failed:', error);
          alert('Sharing failed. Please use "Download HTML Report" and share the file manually via email or cloud storage.');
          button.textContent = originalText;
          button.disabled = false;
        }
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

        .download-button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }

        .export-buttons {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            margin-top: 12px;
        }

        .export-button {
            padding: 8px 16px;
            background: var(--color-accent);
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            transition: background-color 0.2s ease;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .export-button:hover {
            background: var(--color-accent-hover);
        }

        .export-button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }

        .export-button--secondary {
            background: #64748b;
        }

        .export-button--secondary:hover {
            background: #475569;
        }

        @media print {
            .download-button,
            .export-buttons,
            .export-button {
                display: none !important;
            }
            
            body {
                padding: 0;
                max-width: 100%;
            }
            
            .events-timeline {
                max-height: none;
            }
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
            <div class="export-buttons">
                <button class="export-button" onclick="downloadHTMLReport()">
                    📄 Download HTML Report
                </button>
                <button class="export-button export-button--secondary" onclick="downloadPDFReport()">
                    📑 Print/Save as PDF
                </button>
                <button class="export-button export-button--secondary" onclick="shareReportLink()">
                    🔗 Share Report
                </button>
            </div>
        </div>
    </div>

    <div class="analysis-grid">
        <!-- Export Instructions -->
        <div class="analysis-section analysis-section--full" style="background: #f0f9ff; border-left: 4px solid #0ea5e9;">
            <h2 class="section-title" style="color: #0369a1;">💡 How to Share This Report</h2>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; font-size: 14px;">
                <div>
                    <div style="font-weight: 600; margin-bottom: 6px; color: #0369a1;">📄 Download HTML Report</div>
                    <p style="color: #475569; margin: 0; line-height: 1.5;">
                        Best for email and mobile viewing. Preserves all interactivity (toggle buttons, copy functions). 
                        Open on any device with a browser. Works offline.
                    </p>
                </div>
                <div>
                    <div style="font-weight: 600; margin-bottom: 6px; color: #0369a1;">📑 Print/Save as PDF</div>
                    <p style="color: #475569; margin: 0; line-height: 1.5;">
                        Opens print dialog - save as PDF for static archiving. All sections auto-expand for complete view. 
                        Great for printing or long-term storage.
                    </p>
                </div>
                <div>
                    <div style="font-weight: 600; margin-bottom: 6px; color: #0369a1;">🔗 Share Report</div>
                    <p style="color: #475569; margin: 0; line-height: 1.5;">
                        Share via mobile or get instructions for cloud storage links. 
                        Upload HTML to Google Drive/Dropbox for easy sharing via email or SMS.
                    </p>
                </div>
            </div>
        </div>

        <!-- Identity Resolution Configuration -->
        <div class="analysis-section analysis-section--full">
            <h2 class="section-title">⚙️ Identity Resolution Configuration</h2>
            <p style="color: var(--color-text-secondary); margin-bottom: 16px;">
                Configured identifier rules and settings
            </p>
            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; border: 1px solid #ddd;">
                    <thead>
                        <tr style="background: #f5f5f5;">
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd; font-weight: 600;">Identifier</th>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd; font-weight: 600;">Type</th>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd; font-weight: 600;">Limit</th>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd; font-weight: 600;">Frequency</th>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd; font-weight: 600;">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${idResConfig.map((identifier, index) => `
                            <tr style="border-bottom: 1px solid #eee; ${index % 2 === 0 ? 'background: #fafafa;' : ''}">
                                <td style="padding: 12px; font-weight: 500;">${identifier.name}</td>
                                <td style="padding: 12px; font-family: monospace; font-size: 12px; color: #666;">${identifier.id}</td>
                                <td style="padding: 12px; text-align: center;">${identifier.limit}</td>
                                <td style="padding: 12px;">${identifier.frequency}</td>
                                <td style="padding: 12px;">
                                    <span style="display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; ${identifier.enabled ? 'background: #e6f7e6; color: #2d7a2d;' : 'background: #ffe6e6; color: #cc0000;'}">
                                        ${identifier.enabled ? '✓ Enabled' : '✗ Disabled'}
                                    </span>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        ${(() => {
          const unifyConfig = getUnifySpaceConfig();
          return unifyConfig.processedSlug ? `
        <!-- Unify Space Configuration -->
        <div class="analysis-section analysis-section--full">
            <h2 class="section-title">🔗 Segment Profile API Configuration</h2>
            <div style="background: var(--color-bg-secondary); border-radius: 8px; padding: 20px; border: 1px solid var(--color-border);">
                <div style="margin-bottom: 16px;">
                    <div style="font-weight: 600; margin-bottom: 8px; color: #666; font-size: 12px; text-transform: uppercase;">Unify Space Slug / URL (Input Value)</div>
                    <code style="display: block; background: #f0f0f0; padding: 12px; border-radius: 4px; font-family: monospace; font-size: 13px; word-break: break-all;">${unifyConfig.processedSlug}</code>
                    <div style="margin-top: 8px; font-size: 12px; color: #666;">
                        Found in your Segment workspace settings under "General"
                    </div>
                </div>
                
                ${unifyConfig.generatedURL ? `
                <div style="margin-bottom: 16px;">
                    <div style="font-weight: 600; margin-bottom: 8px; color: #666; font-size: 12px; text-transform: uppercase;">Generated URL</div>
                    <a href="${unifyConfig.generatedURL}" target="_blank" rel="noopener noreferrer" style="display: block; color: #3373dc; text-decoration: none; padding: 12px; background: #f0f8ff; border-radius: 4px; font-family: monospace; font-size: 13px; word-break: break-all;">
                        🔗 ${unifyConfig.generatedURL}
                    </a>
                </div>
                ` : ''}
                
                ${unifyConfig.workspaceSlug ? `
                <div>
                    <div style="font-weight: 600; margin-bottom: 8px; color: #666; font-size: 12px; text-transform: uppercase;">Workspace Slug</div>
                    <code style="display: block; background: #f0f0f0; padding: 12px; border-radius: 4px; font-family: monospace; font-size: 13px;">${unifyConfig.workspaceSlug}</code>
                </div>
                ` : ''}
            </div>
        </div>
          ` : '';
        })()}

        <!-- Key Insights -->
        <div class="analysis-section">
            <h2 class="section-title">🔍 Key Insights</h2>
            <div class="insights-list">
                ${(() => {
                  // Map insight labels to icon names and generate nested data
                  const insightIcons = {
                    'Total Events Processed': 'barGraph',
                    'New Profiles Created': 'userPlus',
                    'Additional Actions': 'userCheck',
                    'Profile Merges': 'unified',
                    'Final Profile Count': 'userProfile'
                  };
                  
                  return analysisData.keyInsights.map((insight, index) => {
                    const iconKey = insightIcons[insight.label] || 'barGraph';
                    const icon = iconSvgs[iconKey];
                    
                    // Generate nested data for each insight
                    let nestedData = '';
                    
                    if (insight.label === 'Total Events Processed') {
                      // List event types and names with identifiers
                      const eventDetails = analysisData.eventSequence.map(e => {
                        const identifiersText = e.allIdentifiers && Object.keys(e.allIdentifiers).length > 0
                          ? Object.entries(e.allIdentifiers).map(([key, value]) => `${key}: ${value}`).join(', ')
                          : 'No identifiers';
                        
                        return `<div style="padding: 6px 0; border-bottom: 1px solid #eee;">
                          <div><strong>Event #${e.eventNumber}:</strong> ${e.eventType}${e.eventName ? ` - ${e.eventName}` : ''}</div>
                          <div style="font-size: 11px; color: #666; margin-top: 4px; padding-left: 12px; font-family: monospace;">
                            ${identifiersText}
                          </div>
                        </div>`;
                      }).join('');
                      nestedData = `
                        <div style="margin-top: 12px; font-size: 12px; color: #666;">
                          ${eventDetails}
                        </div>
                      `;
                    } else if (insight.label === 'New Profiles Created') {
                      // List each profile and their final identifiers
                      const profiles = analysisData.finalState.profiles || [];
                      nestedData = `
                        <div style="margin-top: 12px; font-size: 12px;">
                          ${profiles.map((profile, pIndex) => `
                            <div style="padding: 8px; margin-bottom: 8px; background: #f9f9f9; border-radius: 4px; border: 1px solid #eee;">
                              <div style="font-weight: 600; color: #3373dc; margin-bottom: 6px;">Profile ${pIndex + 1}</div>
                              ${profile.identifiers && Object.keys(profile.identifiers).length > 0 ? `
                                <div style="padding-left: 12px;">
                                  ${Object.entries(profile.identifiers).map(([type, values]) => `
                                    <div style="margin-bottom: 4px;">
                                      <span style="color: #666;">${type}:</span> 
                                      <span style="font-family: monospace; font-size: 11px;">${Array.isArray(values) ? values.join(', ') : values}</span>
                                    </div>
                                  `).join('')}
                                </div>
                              ` : '<div style="color: #999; font-style: italic;">No identifiers</div>'}
                            </div>
                          `).join('')}
                        </div>
                      `;
                    } else if (insight.label === 'Additional Actions') {
                      // List distinct flat matching logic actions
                      const actions = analysisData.eventSequence
                        .filter(e => e.expectedAction && !e.expectedAction.includes('Create') && !e.expectedAction.includes('Merge'))
                        .map(e => `
                          <div style="padding: 6px 0; border-bottom: 1px solid #eee;">
                            <strong>Event #${e.eventNumber}:</strong> ${e.expectedAction}
                            ${e.reason ? `<div style="font-size: 11px; color: #666; margin-top: 4px;">${e.reason}</div>` : ''}
                          </div>
                        `).join('');
                      nestedData = actions ? `
                        <div style="margin-top: 12px; font-size: 12px;">
                          ${actions}
                        </div>
                      ` : '<div style="margin-top: 12px; font-size: 12px; color: #999; font-style: italic;">No additional actions</div>';
                    } else if (insight.label === 'Profile Merges' && insight.value > 0) {
                      // List merge events with processing logs and profile targets
                      const merges = analysisData.eventSequence.filter(e => e.expectedAction && e.expectedAction.includes('Merge'));
                      nestedData = `
                        <div style="margin-top: 12px; font-size: 12px;">
                          ${merges.map(merge => `
                            <div style="padding: 10px; margin-bottom: 10px; background: #f0f8ff; border-radius: 4px; border: 1px solid #d0e8ff;">
                              <div style="font-weight: 600; color: #3373dc; margin-bottom: 8px;">Event #${merge.eventNumber}</div>
                              ${merge.mergeDirection ? `
                                <div style="margin-bottom: 6px;">
                                  <strong>Profile Target:</strong> ${merge.mergeDirection}
                                </div>
                              ` : ''}
                              ${merge.processingLog ? `
                                <div style="margin-top: 8px;">
                                  <strong>Processing Logs:</strong>
                                  <div style="margin-top: 4px; padding: 8px; background: white; border-radius: 3px; font-family: monospace; font-size: 10px; max-height: 150px; overflow-y: auto; white-space: pre-wrap;">
                                    ${merge.processingLog}
                                  </div>
                                </div>
                              ` : ''}
                            </div>
                          `).join('')}
                        </div>
                      `;
                    }
                    
                    return `
                      <div class="insight-item" style="position: relative;">
                        <div style="text-align: center; margin-bottom: 8px;">
                          <img src="${icon}" width="32" height="32" alt="${insight.label}" style="opacity: 0.8;" />
                        </div>
                        <div style="font-weight: 500;">${insight.label}: ${insight.value}</div>
                        ${nestedData ? `
                          <button onclick="toggleInsightDetails(${index})" style="margin-top: 8px; width: 100%; padding: 6px 10px; background: #3373dc; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: 500;">
                            View Details
                          </button>
                          <div id="insight-details-${index}" style="display: none;">
                            ${nestedData}
                          </div>
                        ` : ''}
                      </div>
                    `;
                  }).join('');
                })()}
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
            
            ${(() => {
              // Group events by source writeKey - sources data embedded at generation time
              const sources = sourcesConfig;
              const eventsBySource = {};
              
              analysisData.eventSequence.forEach((event, index) => {
                // Try to get writeKey from rawPayload first, then fall back to original events array
                let writeKey = event.rawPayload?.context?.writeKey || event.rawPayload?.writeKey;
                
                // If not found in rawPayload, try the original events array
                if (!writeKey && events[index]) {
                  writeKey = events[index].context?.writeKey || events[index].writeKey;
                }
                
                // Default to 'Unknown' if still not found
                writeKey = writeKey || 'Unknown';
                
                if (!eventsBySource[writeKey]) {
                  eventsBySource[writeKey] = [];
                }
                eventsBySource[writeKey].push(event.eventNumber);
              });
              
              // Match writeKeys to source names
              const sourceBreakdown = Object.entries(eventsBySource).map(([writeKey, eventNumbers]) => {
                const source = sources.find(s => s.settings?.writeKey === writeKey);
                const isConfigured = !!source;
                return {
                  writeKey,
                  name: isConfigured ? source.name : `Source: ${writeKey}`,
                  id: source?.id || writeKey,
                  category: source?.category || null,
                  eventNumbers,
                  eventCount: eventNumbers.length,
                  isConfigured
                };
              }).sort((a, b) => b.eventCount - a.eventCount);
              
              return sourceBreakdown.length > 0 ? `
                <div style="margin-top: 20px; padding: 16px; background: var(--color-bg-secondary); border-radius: 8px; border: 1px solid var(--color-border);">
                  <h3 style="margin: 0 0 12px 0; font-size: 16px; color: var(--color-text-primary);">
                    📡 Events by Source (${sourceBreakdown.length} ${sourceBreakdown.length === 1 ? 'source' : 'sources'})
                  </h3>
                  <div style="display: flex; flex-direction: column; gap: 12px;">
                    ${sourceBreakdown.map(source => `
                      <div style="padding: 12px; background: #fff; border-radius: 6px; border: 1px solid #e0e0e0; border-left: 4px solid ${source.isConfigured ? '#3b82f6' : '#94a3b8'};">
                        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                          <div>
                            <div style="font-weight: 600; margin-bottom: 4px; color: #1e293b;">
                              ${source.name}
                              ${!source.isConfigured ? '<span style="margin-left: 8px; font-size: 10px; padding: 2px 6px; background: #f1f5f9; color: #64748b; border-radius: 3px; font-weight: 500;">Not in Config</span>' : ''}
                              ${source.category ? `<span style="margin-left: 8px; font-size: 10px; padding: 2px 6px; background: #e0e7ff; color: #3730a3; border-radius: 3px; font-weight: 500;">${source.category}</span>` : ''}
                            </div>
                            <div style="font-family: monospace; font-size: 11px; color: #64748b;">
                              ${source.isConfigured && source.id !== source.writeKey ? `${source.id} • ` : ''}${source.writeKey}
                            </div>
                          </div>
                          <div style="text-align: right;">
                            <div style="font-size: 20px; font-weight: 700; color: #3b82f6;">${source.eventCount}</div>
                            <div style="font-size: 11px; color: #64748b;">${source.eventCount === 1 ? 'event' : 'events'}</div>
                          </div>
                        </div>
                        <div style="margin-top: 8px;">
                          <div style="font-size: 12px; color: #64748b; margin-bottom: 4px;">Event Numbers:</div>
                          <div style="display: flex; flex-wrap: wrap; gap: 4px;">
                            ${source.eventNumbers.map(num => `
                              <span style="background: #e0e7ff; color: #3730a3; padding: 2px 6px; border-radius: 3px; font-size: 11px; font-weight: 500;">
                                #${num}
                              </span>
                            `).join('')}
                          </div>
                        </div>
                      </div>
                    `).join('')}
                  </div>
                </div>
              ` : '';
            })()}
            
            ${(() => {
              // Calculate merges and drops
              const merges = analysisData.eventSequence.filter(e => e.expectedAction && e.expectedAction.includes('Merge'));
              const drops = analysisData.eventSequence.filter(e => e.expectedAction && (e.expectedAction.includes('Drop') || e.expectedAction.includes('dropped')));
              
              if (merges.length > 0 || drops.length > 0) {
                return `
                  <div style="margin-top: 20px; padding: 16px; background: var(--color-bg-secondary); border-radius: 8px; border: 1px solid var(--color-border);">
                    ${merges.length > 0 ? `
                      <div style="margin-bottom: ${drops.length > 0 ? '20px' : '0'};">
                        <h3 style="margin: 0 0 12px 0; font-size: 16px; color: var(--color-text-primary);">
                          🔀 Profile Merges (${merges.length})
                        </h3>
                        <div style="display: flex; flex-direction: column; gap: 12px;">
                          ${merges.map(merge => `
                            <div style="padding: 12px; background: #fff; border-radius: 6px; border: 1px solid #e0e0e0;">
                              <div style="font-weight: 600; margin-bottom: 8px; color: #3373dc;">
                                Event #${merge.eventNumber}: ${merge.eventType}
                              </div>
                              <div style="margin-bottom: 6px; font-size: 13px;">
                                <strong>Identifiers:</strong> ${Object.entries(merge.allIdentifiers || {}).map(([k, v]) => `${k}: ${v}`).join(', ')}
                              </div>
                              ${merge.mergeDirection ? `
                                <div style="margin-bottom: 6px; font-size: 13px;">
                                  <strong>Merge Direction:</strong> ${merge.mergeDirection}
                                </div>
                              ` : ''}
                              ${merge.reason ? `
                                <div style="font-size: 12px; color: #666;">
                                  <strong>Reason:</strong> ${merge.reason}
                                </div>
                              ` : ''}
                            </div>
                          `).join('')}
                        </div>
                      </div>
                    ` : ''}
                    
                    ${drops.length > 0 ? `
                      <div>
                        <h3 style="margin: 0 0 12px 0; font-size: 16px; color: var(--color-text-primary);">
                          ⚠️ Dropped Identifiers (${drops.length})
                        </h3>
                        <div style="display: flex; flex-direction: column; gap: 12px;">
                          ${drops.map(drop => `
                            <div style="padding: 12px; background: #fff; border-radius: 6px; border: 1px solid #ffebcc; background: #fffbf5;">
                              <div style="font-weight: 600; margin-bottom: 8px; color: #cc6600;">
                                Event #${drop.eventNumber}: ${drop.eventType}
                              </div>
                              <div style="margin-bottom: 6px; font-size: 13px;">
                                <strong>Identifiers:</strong> ${Object.entries(drop.allIdentifiers || {}).map(([k, v]) => `${k}: ${v}`).join(', ')}
                              </div>
                              ${drop.reason ? `
                                <div style="font-size: 12px; color: #666;">
                                  <strong>Reason:</strong> ${drop.reason}
                                </div>
                              ` : ''}
                            </div>
                          `).join('')}
                        </div>
                      </div>
                    ` : ''}
                  </div>
                `;
              }
              return '';
            })()}
        </div>

        <!-- Identity Resolution Visualizer PNG -->
        ${visualizerImageDataUrl ? `
        <div class="analysis-section analysis-section--full">
            <h2 class="section-title">🎨 Identity Resolution Visualizer</h2>
            <p style="color: var(--color-text-secondary); margin-bottom: 16px;">
                Visual representation of the identity resolution process
            </p>
            <div style="background: #ffffff; border-radius: 8px; padding: 20px; border: 1px solid #ddd; text-align: center; overflow-x: auto;">
                <img src="${visualizerImageDataUrl}" alt="Identity Resolution Visualizer" style="max-width: 100%; height: auto; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />
            </div>
            <div style="margin-top: 12px; text-align: center;">
                <button onclick="downloadVisualizerImage()" style="padding: 8px 16px; background: #3373dc; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: 500;">
                    💾 Download PNG
                </button>
            </div>
        </div>
        ` : ''}

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

        ${(() => {
          // Get all additional data
          const sources = sourcesConfig;
          const unifyConfig = getUnifySpaceConfig();
          const profileData = formatProfileApiResults();
          const rawEvents = JSON.stringify(events, null, 2);
          
          return `
        <!-- Event Simulator Queue (Raw JSON) -->
        <div class="analysis-section analysis-section--full">
            <h2 class="section-title">📋 Event Simulator Queue</h2>
            <p style="color: var(--color-text-secondary); margin-bottom: 16px;">
                Raw JSON event payloads from the event simulator queue
            </p>
            <div style="position: relative;">
                <button onclick="copyToClipboard('event-queue-json')" style="position: absolute; top: 8px; right: 8px; padding: 6px 12px; background: #3373dc; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; z-index: 10;">
                    📋 Copy JSON
                </button>
                <pre id="event-queue-json" style="background: #f5f5f5; padding: 16px; border-radius: 8px; overflow-x: auto; max-height: 500px; font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace; font-size: 12px; line-height: 1.5; border: 1px solid #ddd;">${rawEvents.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
            </div>
        </div>

        <!-- Profile API Raw Responses -->
        ${Object.keys(profileData.raw).length > 0 ? `
        <div class="analysis-section analysis-section--full">
            <h2 class="section-title">🔍 Profile API Raw Responses</h2>
            <p style="color: var(--color-text-secondary); margin-bottom: 16px;">
                Raw data returned by the Profile API for each lookup
            </p>
            <div style="position: relative;">
                <button onclick="copyToClipboard('profile-api-raw')" style="position: absolute; top: 8px; right: 8px; padding: 6px 12px; background: #3373dc; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; z-index: 10;">
                    📋 Copy JSON
                </button>
                <pre id="profile-api-raw" style="background: #f5f5f5; padding: 16px; border-radius: 8px; overflow-x: auto; max-height: 500px; font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace; font-size: 12px; line-height: 1.5; border: 1px solid #ddd;">${JSON.stringify(profileData.raw, null, 2).replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
            </div>
        </div>
        ` : ''}

        <!-- Profile API Formatted Profiles -->
        ${profileData.formatted.length > 0 ? `
        <div class="analysis-section analysis-section--full">
            <h2 class="section-title">👤 Profile API Results (Formatted)</h2>
            <p style="color: var(--color-text-secondary); margin-bottom: 16px;">
                Beautified profile data as shown in the UI
            </p>
            ${profileData.formatted.map((profile, index) => `
                <div class="profile-card" style="background: var(--color-bg-secondary); border-radius: 8px; padding: 16px; margin-bottom: 16px; border: 1px solid var(--color-border);">
                    <h3 style="margin-top: 0; margin-bottom: 12px; color: var(--color-text-primary);">Profile ${index + 1}</h3>
                    <div style="margin-bottom: 12px;">
                        <strong>Segment ID:</strong> <code style="background: #f0f0f0; padding: 2px 6px; border-radius: 3px;">${profile.segmentId}</code>
                    </div>
                    
                    ${Object.keys(profile.identifiers).length > 0 ? `
                    <div style="margin-bottom: 12px;">
                        <strong>Identifiers:</strong>
                        <div style="margin-top: 8px; padding-left: 16px;">
                            ${Object.entries(profile.identifiers).map(([type, values]) => `
                                <div style="margin-bottom: 4px;">
                                    <span style="color: #666;">${type}:</span> 
                                    <span style="font-family: monospace;">${Array.isArray(values) ? values.join(', ') : values}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    ` : ''}
                    
                    ${Object.keys(profile.traits).length > 0 ? `
                    <div style="margin-bottom: 12px;">
                        <strong>Traits:</strong>
                        <div style="margin-top: 8px; padding-left: 16px;">
                            ${Object.entries(profile.traits).slice(0, 5).map(([key, value]) => `
                                <div style="margin-bottom: 4px;">
                                    <span style="color: #666;">${key}:</span> 
                                    <span style="font-family: monospace;">${JSON.stringify(value)}</span>
                                </div>
                            `).join('')}
                            ${Object.keys(profile.traits).length > 5 ? `
                                <div style="color: #666; font-style: italic; margin-top: 4px;">
                                    ... and ${Object.keys(profile.traits).length - 5} more traits
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    ` : ''}
                    
                    ${profile.externalIds.length > 0 ? `
                    <div>
                        <strong>External IDs:</strong> ${profile.externalIds.length} external identifiers
                    </div>
                    ` : ''}
                </div>
            `).join('')}
        </div>
        ` : ''}

        <!-- Profile API CSV Export Data -->
        ${profileData.csv.length > 0 ? `
        <div class="analysis-section analysis-section--full">
            <h2 class="section-title">📊 Profile API Data (CSV Format)</h2>
            <p style="color: var(--color-text-secondary); margin-bottom: 16px;">
                Tabular view of Profile API results
            </p>
            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; border: 1px solid #ddd;">
                    <thead>
                        <tr style="background: #f5f5f5;">
                            ${Object.keys(profileData.csv[0]).map(header => `
                                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd; font-weight: 600;">${header}</th>
                            `).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${profileData.csv.map((row, index) => `
                            <tr style="border-bottom: 1px solid #eee; ${index % 2 === 0 ? 'background: #fafafa;' : ''}">
                                ${Object.values(row).map(value => `
                                    <td style="padding: 12px; font-family: monospace; font-size: 12px;">${value}</td>
                                `).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
        ` : ''}

        <!-- Source Configuration -->
        ${sources.length > 0 ? `
        <div class="analysis-section analysis-section--full">
            <h2 class="section-title">📡 Source Configuration</h2>
            <p style="color: var(--color-text-secondary); margin-bottom: 16px;">
                Enabled sources for event tracking
            </p>
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 16px;">
                ${sources.filter(s => s.enabled).map(source => `
                    <div style="background: var(--color-bg-secondary); border-radius: 8px; padding: 16px; border: 1px solid var(--color-border);">
                        <div style="font-weight: 600; margin-bottom: 8px; font-size: 14px;">${source.name}</div>
                        <div style="font-family: monospace; font-size: 11px; color: #666; margin-bottom: 8px;">${source.id}</div>
                        ${source.category ? `
                            <div style="display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 10px; background: #e6f2ff; color: #0052cc;">
                                ${source.category}
                            </div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        </div>
        ` : ''}
          `;
        })()}
    </div>

    <script>
        ${downloadAnalysisJS}
        
        function copyToClipboard(elementId) {
            const element = document.getElementById(elementId);
            const text = element.textContent;
            
            navigator.clipboard.writeText(text).then(() => {
                const button = element.previousElementSibling;
                const originalText = button.textContent;
                button.textContent = '✓ Copied!';
                button.style.background = '#2d7a2d';
                
                setTimeout(() => {
                    button.textContent = originalText;
                    button.style.background = '#3373dc';
                }, 2000);
            }).catch(err => {
                alert('Failed to copy to clipboard');
                console.error('Copy failed:', err);
            });
        }
        
        function downloadVisualizerImage() {
            const imgElement = document.querySelector('.analysis-section--full img[alt="Identity Resolution Visualizer"]');
            if (!imgElement) {
                alert('Image not found');
                return;
            }
            
            const link = document.createElement('a');
            link.href = imgElement.src;
            link.download = 'identity-resolution-visualizer-' + new Date().toISOString().split('T')[0] + '.png';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
        
        function toggleInsightDetails(insightIndex) {
            const element = document.getElementById('insight-details-' + insightIndex);
            const button = element.previousElementSibling;
            
            if (element.style.display === 'none') {
                element.style.display = 'block';
                button.textContent = 'Hide Details';
            } else {
                element.style.display = 'none';
                button.textContent = 'View Details';
            }
        }
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
