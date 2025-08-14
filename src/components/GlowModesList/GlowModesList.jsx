import React, { useState } from 'react';
import GlowMode from './GlowMode';
import './GlowModesList.css';

const GlowModesList = ({ isOpen, onClose, currentGlowMode, onGlowModeChange }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Twilio brand color configurations
  const glowModes = [
    {
      id: 'grey-50',
      name: 'Grey 50',
      color: '#F3F4F7',
      mainBg: '#F3F4F7',
      componentBg: '#FFFFFF',
      textColor: '#191F36',
      glowColor: '#DDE0E6',
      buttonPrimary: '#4D5777',
      buttonSecondary: '#DDE0E6',
      border: '#DDE0E6',
      shadow: 'rgba(0, 0, 0, 0.1)'
    },
    {
      id: 'grey-100',
      name: 'Grey 100',
      color: '#DDE0E6',
      mainBg: '#DDE0E6',
      componentBg: '#F3F4F7',
      textColor: '#191F36',
      glowColor: '#4D5777',
      buttonPrimary: '#191F36',
      buttonSecondary: '#4D5777',
      border: '#4D5777',
      shadow: 'rgba(77, 87, 119, 0.2)'
    },
    {
      id: 'grey-600',
      name: 'Grey 600',
      color: '#4D5777',
      mainBg: '#4D5777',
      componentBg: '#DDE0E6',
      textColor: '#FFFFFF',
      glowColor: '#F3F4F7',
      buttonPrimary: '#F3F4F7',
      buttonSecondary: '#191F36',
      border: '#F3F4F7',
      shadow: 'rgba(243, 244, 247, 0.3)'
    },
    {
      id: 'grey-850',
      name: 'Grey 850',
      color: '#191F36',
      mainBg: '#191F36',
      componentBg: '#4D5777',
      textColor: '#F3F4F7',
      glowColor: '#DDE0E6',
      buttonPrimary: '#DDE0E6',
      buttonSecondary: '#F3F4F7',
      border: '#DDE0E6',
      shadow: 'rgba(221, 224, 230, 0.2)'
    },
    {
      id: 'red-300',
      name: 'Red 300',
      color: '#F77786',
      mainBg: '#430B12',
      componentBg: '#1D0508',
      textColor: '#F77786',
      glowColor: '#FF1233',
      buttonPrimary: '#F83D53',
      buttonSecondary: '#DB132A',
      border: '#F83D53',
      shadow: 'rgba(247, 119, 134, 0.3)'
    },
    {
      id: 'red-400',
      name: 'Red 400',
      color: '#F83D53',
      mainBg: '#1D0508',
      componentBg: '#430B12',
      textColor: '#F77786',
      glowColor: '#F83D53',
      buttonPrimary: '#FF1233',
      buttonSecondary: '#DB132A',
      border: '#F77786',
      shadow: 'rgba(248, 61, 83, 0.4)'
    },
    {
      id: 'red-450',
      name: 'Red 450',
      color: '#FF1233',
      mainBg: '#430B12',
      componentBg: '#1D0508',
      textColor: '#F77786',
      glowColor: '#FF1233',
      buttonPrimary: '#F83D53',
      buttonSecondary: '#DB132A',
      border: '#FF1233',
      shadow: 'rgba(255, 18, 51, 0.5)'
    },
    {
      id: 'red-500',
      name: 'Red 500',
      color: '#DB132A',
      mainBg: '#1D0508',
      componentBg: '#430B12',
      textColor: '#F77786',
      glowColor: '#F83D53',
      buttonPrimary: '#FF1233',
      buttonSecondary: '#F77786',
      border: '#DB132A',
      shadow: 'rgba(219, 19, 42, 0.4)'
    },
    {
      id: 'red-600',
      name: 'Red 600',
      color: '#B10F23',
      mainBg: '#1D0508',
      componentBg: '#430B12',
      textColor: '#F77786',
      glowColor: '#DB132A',
      buttonPrimary: '#F83D53',
      buttonSecondary: '#FF1233',
      border: '#B10F23',
      shadow: 'rgba(177, 15, 35, 0.3)'
    },
    {
      id: 'red-850',
      name: 'Red 850',
      color: '#430B12',
      mainBg: '#430B12',
      componentBg: '#1D0508',
      textColor: '#F77786',
      glowColor: '#F83D53',
      buttonPrimary: '#FF1233',
      buttonSecondary: '#DB132A',
      border: '#F77786',
      shadow: 'rgba(67, 11, 18, 0.4)'
    },
    {
      id: 'red-900',
      name: 'Red 900',
      color: '#1D0508',
      mainBg: '#1D0508',
      componentBg: '#430B12',
      textColor: '#F77786',
      glowColor: '#F83D53',
      buttonPrimary: '#FF1233',
      buttonSecondary: '#DB132A',
      border: '#430B12',
      shadow: 'rgba(29, 5, 8, 0.5)'
    },
    {
      id: 'blue-500',
      name: 'Blue 500',
      color: '#1866EE',
      mainBg: '#081F47',
      componentBg: '#191F36',
      textColor: '#F3F4F7',
      glowColor: '#1866EE',
      buttonPrimary: '#1866EE',
      buttonSecondary: '#DDE0E6',
      border: '#1866EE',
      shadow: 'rgba(24, 102, 238, 0.4)'
    },
    {
      id: 'blue-850',
      name: 'Blue 850',
      color: '#081F47',
      mainBg: '#081F47',
      componentBg: '#191F36',
      textColor: '#DDE0E6',
      glowColor: '#1866EE',
      buttonPrimary: '#1866EE',
      buttonSecondary: '#F3F4F7',
      border: '#1866EE',
      shadow: 'rgba(8, 31, 71, 0.4)'
    },
    {
      id: 'blue-900',
      name: 'Blue 900',
      color: '#191F36',
      mainBg: '#191F36',
      componentBg: '#081F47',
      textColor: '#DDE0E6',
      glowColor: '#1866EE',
      buttonPrimary: '#1866EE',
      buttonSecondary: '#F3F4F7',
      border: '#4D5777',
      shadow: 'rgba(25, 31, 54, 0.4)'
    }
  ];

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };

  const handleGlowModeSelect = (glowMode) => {
    onGlowModeChange(glowMode);
    setIsExpanded(false);
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      setIsExpanded(false);
    }
  };

  return (
    <>
      {/* Backdrop overlay when expanded */}
      {isExpanded && (
        <div className="glow-modes-list__overlay" onClick={handleOverlayClick} />
      )}

      {/* Toggle Button */}
      <div className="glow-modes-list__container">
        <button
          className={`glow-modes-list__toggle ${isExpanded ? 'glow-modes-list__toggle--expanded' : ''} ${currentGlowMode ? 'glow-modes-list__toggle--active' : ''}`}
          onClick={handleToggle}
          title="Twilio Glow Modes"
        >
          {/* Twilio Logo SVG - simplified version */}
          <svg
            className="glow-modes-list__logo"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <circle cx="8" cy="8" r="2.5" />
            <circle cx="16" cy="8" r="2.5" />
            <circle cx="8" cy="16" r="2.5" />
            <circle cx="16" cy="16" r="2.5" />
          </svg>
        </button>

        {/* Glow Modes Panel */}
        <div className={`glow-modes-list__panel ${isExpanded ? 'glow-modes-list__panel--expanded' : ''}`}>
          <div className="glow-modes-list__header">
            <h3 className="glow-modes-list__title">Twilio Glow Modes</h3>
            <button
              className="glow-modes-list__close"
              onClick={() => setIsExpanded(false)}
            >
              ✕
            </button>
          </div>
          
          <div className="glow-modes-list__modes">
            {glowModes.map((glowMode) => (
              <GlowMode
                key={glowMode.id}
                name={glowMode.name}
                color={glowMode.color}
                isActive={currentGlowMode?.id === glowMode.id}
                onClick={() => handleGlowModeSelect(glowMode)}
                mainBg={glowMode.mainBg}
                componentBg={glowMode.componentBg}
                textColor={glowMode.textColor}
                glowColor={glowMode.glowColor}
                buttonPrimary={glowMode.buttonPrimary}
                buttonSecondary={glowMode.buttonSecondary}
                border={glowMode.border}
                shadow={glowMode.shadow}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default GlowModesList;