import React from 'react';
import { AgentStatus } from '../types';

interface HeaderProps {
  status: AgentStatus;
  statusMessage: string;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  status,
  statusMessage,
  theme,
  onToggleTheme,
}) => {
  const getStatusDetails = () => {
    switch (status) {
      case 'running':
        return { label: 'Working...', class: 'status-running' };
      case 'waiting_for_user':
        return { label: 'Needs Input', class: 'status-waiting' };
      case 'paused':
        return { label: 'Paused', class: 'status-paused' };
      case 'human_takeover':
        return { label: 'Takeover Active', class: 'status-paused' };
      case 'ready_for_review':
        return { label: 'Ready for Review', class: 'status-review' };
      case 'error':
        return { label: 'Error', class: 'status-error' };
      case 'idle':
      default:
        return { label: 'Ready', class: 'status-idle' };
    }
  };

  const statusInfo = getStatusDetails();

  return (
    <div>
      <div className="window-bar">
        <span className="window-title">EIGI Form Agent &mdash; Student Registration Assistant</span>
        <button
          type="button"
          id="theme-toggle-btn"
          className="theme-toggle-btn"
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          <span className="theme-toggle-icon">{theme === 'dark' ? '☀️' : '🌙'}</span>
          <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
      </div>

      <header className="app-header">
        <div className="brand-section">
          <div className="brand-icon-box">
            <span>&#10003;</span>
          </div>
          <div>
            <h1 className="app-title">EIGI Form Agent</h1>
            <p className="app-subtitle">
              Reads your documents. Fills the form. Never submits.
            </p>
          </div>
        </div>

        <div className="header-status">
          <div className={`status-pill ${statusInfo.class}`}>
            <span className="status-pulse" />
            <span>{statusInfo.label}</span>
          </div>
        </div>
      </header>
    </div>
  );
};
