import React, { useState } from 'react';

interface ClarificationCardProps {
  question: string;
  context?: string;
  onAnswer: (answer: string) => void;
}

export const ClarificationCard: React.FC<ClarificationCardProps> = ({
  question,
  context,
  onAnswer,
}) => {
  const [customAnswer, setCustomAnswer] = useState<string>('');

  const isAddressAmbiguity =
    question.toLowerCase().includes('address') ||
    (context && context.toLowerCase().includes('address'));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customAnswer.trim()) {
      onAnswer(customAnswer.trim());
      setCustomAnswer('');
    }
  };

  return (
    <div className="clarification-card">
      <div className="clarification-header">
        <span style={{ fontSize: '18px' }}>&#10067;</span>
        <span>Human Clarification Needed</span>
      </div>

      <div className="clarification-question">
        {question || 'The agent requires clarification before proceeding.'}
      </div>

      {context && (
        <div className="clarification-context">
          {context}
        </div>
      )}

      {isAddressAmbiguity ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: '13px', color: '#92400e', fontWeight: 600 }}>
            The document contains two addresses:
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-light)',
                borderRadius: '8px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '8px',
              }}
            >
              <div>
                <strong style={{ fontSize: '12px', color: 'var(--status-warning)', textTransform: 'uppercase' }}>
                  Permanent
                </strong>
                <p style={{ fontSize: '13px', color: 'var(--text-primary)', marginTop: '4px' }}>
                  14 Lotus Lane, Nagpur, Maharashtra, 440001
                </p>
              </div>
              <button
                type="button"
                className="choice-btn"
                style={{
                  backgroundColor: '#0284c7',
                  color: '#ffffff',
                  borderColor: '#0284c7',
                  fontWeight: 600,
                  marginTop: '4px',
                }}
                onClick={() => onAnswer('14 Lotus Lane')}
              >
                Use Permanent
              </button>
            </div>

            <div
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-light)',
                borderRadius: '8px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '8px',
              }}
            >
              <div>
                <strong style={{ fontSize: '12px', color: 'var(--status-warning)', textTransform: 'uppercase' }}>
                  Correspondence
                </strong>
                <p style={{ fontSize: '13px', color: 'var(--text-primary)', marginTop: '4px' }}>
                  22 Palm Residency, Nagpur, Maharashtra, 440010
                </p>
              </div>
              <button
                type="button"
                className="choice-btn"
                style={{
                  backgroundColor: '#0284c7',
                  color: '#ffffff',
                  borderColor: '#0284c7',
                  fontWeight: 600,
                  marginTop: '4px',
                }}
                onClick={() => onAnswer('22 Palm Residency')}
              >
                Use Correspondence
              </button>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ marginTop: '4px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
            Enter your response:
          </div>
          <div className="custom-answer-row">
            <input
              type="text"
              className="custom-answer-input"
              placeholder="Type answer here..."
              value={customAnswer}
              onChange={(e) => setCustomAnswer(e.target.value)}
            />
            <button
              type="submit"
              className="choice-btn"
              style={{ backgroundColor: 'var(--primary)', color: 'white', borderColor: 'var(--primary)' }}
              disabled={!customAnswer.trim()}
            >
              Send Answer
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
