import React from 'react';
import { AgentStatus } from '../types';

interface ExecutionControlsProps {
  status: AgentStatus;
  isPaused: boolean;
  isTakeover: boolean;
  onPause: () => void;
  onResume: () => void;
  onTakeover: () => void;
  onGiveBack: () => void;
}

export const ExecutionControls: React.FC<ExecutionControlsProps> = ({
  status,
  isPaused,
  isTakeover,
  onPause,
  onResume,
  onTakeover,
  onGiveBack,
}) => {
  const isRunningOrActive = ['running', 'paused', 'waiting_for_user', 'human_takeover'].includes(status);
  if (!isRunningOrActive) return null;

  return (
    <section id="controls-section" className="controls">
      <h2>Execution Controls</h2>
      <div className="controls-buttons">
        <button
          id="pause-btn"
          type="button"
          className="btn-secondary"
          onClick={onPause}
          disabled={isPaused || isTakeover}
        >
          Pause
        </button>

        <button
          id="resume-btn"
          type="button"
          className="btn-secondary"
          onClick={onResume}
          disabled={!isPaused || isTakeover}
        >
          Resume
        </button>

        <button
          id="take-over-btn"
          type="button"
          className="btn-secondary"
          onClick={onTakeover}
          disabled={isTakeover}
        >
          Take Over Browser
        </button>

        <button
          id="give-back-btn"
          type="button"
          className="btn-secondary"
          onClick={onGiveBack}
          disabled={!isTakeover}
        >
          Give Control Back
        </button>
      </div>
    </section>
  );
};
