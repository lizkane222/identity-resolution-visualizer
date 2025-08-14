import React from 'react';
import './GlowMode.css';

const GlowMode = ({ 
  name, 
  color, 
  isActive, 
  onClick, 
  mainBg,
  componentBg,
  textColor,
  glowColor,
  buttonPrimary,
  buttonSecondary,
  border,
  shadow 
}) => {
  return (
    <div
      className={`glow-mode ${isActive ? 'glow-mode--active' : ''}`}
      onClick={onClick}
      style={{
        backgroundColor: componentBg,
        borderColor: border,
        color: textColor,
        boxShadow: isActive 
          ? `0 0 20px ${glowColor}, inset 0 0 20px ${glowColor}` 
          : `0 2px 8px ${shadow}`,
      }}
    >
      <div 
        className="glow-mode__color-preview"
        style={{
          backgroundColor: color,
          boxShadow: `0 0 10px ${glowColor}`,
        }}
      />
      <span 
        className="glow-mode__name"
        style={{ color: color }}
      >
        {name}
      </span>
      {isActive && (
        <div 
          className="glow-mode__active-indicator"
          style={{
            backgroundColor: color,
            boxShadow: `0 0 15px ${glowColor}`,
          }}
        />
      )}
    </div>
  );
};

export default GlowMode;
