import React from 'react';

interface TaskConfigProps {
  targetUrl: string;
  onTargetUrlChange: (val: string) => void;
  instruction: string;
  onInstructionChange: (val: string) => void;
  dryRun: boolean;
  onDryRunChange: (val: boolean) => void;
  onStart: () => void;
  canStart: boolean;
  isRunning: boolean;
}

export const TaskConfig: React.FC<TaskConfigProps> = ({
  targetUrl,
  onTargetUrlChange,
  instruction,
  onInstructionChange,
  dryRun,
  onDryRunChange,
  onStart,
  canStart,
  isRunning,
}) => {
  return (
    <div className="task-config-fields">
      <div className="field">
        <label htmlFor="target-url">Target Form URL</label>
        <input
          id="target-url"
          type="text"
          placeholder="https://school-site.example/register"
          value={targetUrl}
          onChange={(e) => onTargetUrlChange(e.target.value)}
          disabled={isRunning}
        />
      </div>

      <div className="field">
        <label htmlFor="instruction">Agent Instruction</label>
        <input
          id="instruction"
          type="text"
          value={instruction}
          onChange={(e) => onInstructionChange(e.target.value)}
          disabled={isRunning}
        />
      </div>

      <div className="field">
        <label className="checkbox-inline">
          <input
            id="dry-run-check"
            type="checkbox"
            checked={dryRun}
            onChange={(e) => onDryRunChange(e.target.checked)}
            disabled={isRunning}
          />
          <span>Deterministic Dry Run (exercises full browser pipeline without requiring LLM tokens)</span>
        </label>
      </div>

      <button
        id="start-btn"
        type="button"
        onClick={onStart}
        disabled={!canStart || isRunning}
      >
        Start Form-Filling Agent
      </button>
    </div>
  );
};
