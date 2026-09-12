import React from 'react';
import { AgentStatus } from '../types';

interface HeaderProps {
  status: AgentStatus;
  statusMessage: string;
}

const STATUS_COLORS: Record<AgentStatus, string> = {
  idle: '#6b7280',
  running: '#3b82f6',
  paused: '#eab308',
  waiting_for_user: '#ec4899',
  human_takeover: '#8b5cf6',
  ready_for_review: '#10b981',
  completed: '#10b981',
  error: '#ef4444',
};

export const Header: React.FC<HeaderProps> = ({ status, statusMessage }) => {
  const badgeColor = STATUS_COLORS[status] || '#6b7280';
  const badgeText = status === 'ready_for_review' ? 'READY FOR REVIEW' : status.toUpperCase();

  return (
    <header>
      <div className="header-row">
        <h1>Document &rarr; Form AI Agent</h1>
        <span
          id="status-badge"
          className="status-badge"
          style={{ backgroundColor: badgeColor }}
        >
          {badgeText}
        </span>
      </div>
      <p id="status-message" className="status-message">
        {statusMessage || 'Ready to start.'}
      </p>
      <p className="subtitle">
        Phase 1: Reads document, maps fields, fills &amp; verifies form. Never submits.
      </p>
    </header>
  );
};
