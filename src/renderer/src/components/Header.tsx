import React from 'react';
import { AgentStatus } from '../types';

interface HeaderProps {
  status: AgentStatus;
  statusMessage: string;
}

export const Header: React.FC<HeaderProps> = ({ status, statusMessage }) => {
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
        <div className="window-dots">
          <span className="window-dot dot-red" />
          <span className="window-dot dot-yellow" />
          <span className="window-dot dot-green" />
        </div>
        <span className="window-title">EIGI Form Agent &mdash; Student Registration Assistant</span>
        <div style={{ width: '40px' }} />
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
