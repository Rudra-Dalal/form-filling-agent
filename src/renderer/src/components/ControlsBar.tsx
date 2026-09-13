import React from 'react';
import { AgentStatus } from '../types';

interface ControlsBarProps {
  status: AgentStatus;
  isPaused: boolean;
  isTakeover: boolean;
  onPause: () => void;
  onResume: () => void;
  onTakeover: () => void;
  onGiveBack: () => void;
}

export const ControlsBar: React.FC<ControlsBarProps> = ({
  status,
  isPaused,
  isTakeover,
  onPause,
  onResume,
  onTakeover,
  onGiveBack,
}) => {
  const isRunning = status === 'running';
  const isActionActive = isRunning || isPaused || isTakeover || status === 'waiting_for_user';

  if (!isActionActive) {
    return null;
  }

  return (
    <div className="controls-bar">
      <div className="controls-group">
        {isTakeover ? (
          <>
            <span style={{ fontWeight: 600, color: '#6d28d9', fontSize: '13px' }}>
              &#9995; You have control of the browser.
            </span>
            <button
              type="button"
              className="btn-secondary"
              style={{ backgroundColor: '#f3e8ff', borderColor: '#c084fc', color: '#6d28d9' }}
              onClick={onGiveBack}
            >
              Give control back
            </button>
          </>
        ) : (
          <>
            {isPaused ? (
              <button type="button" className="btn-secondary" onClick={onResume}>
                <span>&#9654;</span> Resume
              </button>
            ) : (
              <button type="button" className="btn-secondary" onClick={onPause} disabled={!isRunning}>
                <span>&#10074;&#10074;</span> Pause
              </button>
            )}

            <button type="button" className="btn-secondary" onClick={onTakeover}>
              <span>&#128187;</span> Take over browser
            </button>
          </>
        )}
      </div>

      <div className="controls-hint">
        {isTakeover
          ? 'Make changes in Chromium, then click "Give control back".'
          : 'You can pause or take control of the browser at any time.'}
      </div>
    </div>
  );
};
