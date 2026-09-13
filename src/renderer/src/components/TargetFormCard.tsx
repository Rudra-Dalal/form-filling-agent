import React from 'react';

interface TargetFormCardProps {
  targetUrl: string;
  onTargetUrlChange: (val: string) => void;
  instruction: string;
  onInstructionChange: (val: string) => void;
  onStart: () => void;
  canStart: boolean;
  isRunning: boolean;
}

export const TargetFormCard: React.FC<TargetFormCardProps> = ({
  targetUrl,
  onTargetUrlChange,
  instruction,
  onInstructionChange,
  onStart,
  canStart,
  isRunning,
}) => {
  const handleUseDemoPortal = async () => {
    const api = (window as any).agentAPI || (window as any).eigiAgent || (window as any).electronAPI;
    if (api && typeof api.getDemoPortalUrl === 'function') {
      try {
        const url = await api.getDemoPortalUrl();
        if (url) onTargetUrlChange(url);
      } catch (_) {}
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title-group">
          <span className="step-badge">2</span>
          <div>
            <h3 className="card-title">Where should I fill this?</h3>
            <p className="card-subtitle">Provide the target web form URL for the student application</p>
          </div>
        </div>
      </div>

      <div className="form-group">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <label className="form-label" htmlFor="target-url" style={{ margin: 0 }}>
            Target Form URL
          </label>
          <button
            type="button"
            className="details-toggle"
            style={{ fontSize: '12px', padding: 0 }}
            onClick={handleUseDemoPortal}
            disabled={isRunning}
          >
            Use Greenwood Academy Demo Portal
          </button>
        </div>
        <input
          id="target-url"
          type="text"
          className="form-input"
          placeholder="https://school-portal.example/register"
          value={targetUrl}
          onChange={(e) => onTargetUrlChange(e.target.value)}
          disabled={isRunning}
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="instruction">
          Instruction <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(optional)</span>
        </label>
        <textarea
          id="instruction"
          className="form-input form-textarea"
          rows={2}
          value={instruction}
          onChange={(e) => onInstructionChange(e.target.value)}
          disabled={isRunning}
        />
      </div>

      <div style={{ marginTop: '8px' }}>
        <button
          id="start-btn"
          type="button"
          className="btn-primary-large"
          onClick={onStart}
          disabled={!canStart || isRunning}
        >
          <span>&#9654;</span>
          <span>{isRunning ? 'Agent Working...' : 'Start filling'}</span>
        </button>

        <p className="subtext-reassurance" style={{ marginTop: '8px' }}>
          <span>&#128737;</span>
          <span>Nothing is submitted automatically. You will review everything before final submission.</span>
        </p>
      </div>
    </div>
  );
};
