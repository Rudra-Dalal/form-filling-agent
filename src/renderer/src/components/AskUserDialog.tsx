import React, { useState } from 'react';

interface AskUserDialogProps {
  promptId: string | null;
  question: string;
  context?: string;
  onSendAnswer: (promptId: string, answer: string) => void;
}

export const AskUserDialog: React.FC<AskUserDialogProps> = ({
  promptId,
  question,
  context,
  onSendAnswer,
}) => {
  const [answer, setAnswer] = useState('');

  if (!promptId) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim()) return;
    onSendAnswer(promptId, answer.trim());
    setAnswer('');
  };

  const displayText = context ? `${question} (${context})` : question;

  return (
    <section id="ask-user-section" className="ask-user">
      <h2>Clarification Required</h2>
      <p id="ask-user-question" style={{ marginBottom: 12 }}>
        {displayText}
      </p>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <input
            id="ask-user-answer"
            type="text"
            placeholder="Type your answer here..."
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            autoFocus
          />
        </div>
        <button id="ask-user-submit" type="submit" disabled={!answer.trim()}>
          Send Answer
        </button>
      </form>
    </section>
  );
};
