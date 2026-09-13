import React from 'react';
import { AgentStatus } from '../types';

interface ProgressStepperProps {
  hasDocument: boolean;
  status: AgentStatus;
  hasVerifiedFields: boolean;
  isReadyForReview: boolean;
}

export const ProgressStepper: React.FC<ProgressStepperProps> = ({
  hasDocument,
  status,
  hasVerifiedFields,
  isReadyForReview,
}) => {
  // Determine active stage index: 0 to 4
  let currentStage = 0;
  if (isReadyForReview) {
    currentStage = 4;
  } else if (hasVerifiedFields && status === 'running') {
    currentStage = 3;
  } else if (status === 'running' || status === 'waiting_for_user' || status === 'paused' || status === 'human_takeover') {
    currentStage = 2;
  } else if (hasDocument) {
    currentStage = 1;
  }

  const stages = [
    { title: 'Document ready', num: 1 },
    { title: 'Form understood', num: 2 },
    { title: 'Filling', num: 3 },
    { title: 'Verifying', num: 4 },
    { title: 'Ready for review', num: 5 },
  ];

  return (
    <div className="progress-stepper">
      {stages.map((stage, idx) => {
        const isCompleted = currentStage > idx;
        const isActive = currentStage === idx;

        let statusClass = '';
        if (isCompleted) statusClass = 'step-completed';
        else if (isActive) statusClass = 'step-active';

        return (
          <React.Fragment key={stage.title}>
            <div className={`step-item ${statusClass}`}>
              <div className="step-circle">
                {isCompleted ? '✓' : stage.num}
              </div>
              <span>{stage.title}</span>
            </div>
            {idx < stages.length - 1 && <div className="step-divider" />}
          </React.Fragment>
        );
      })}
    </div>
  );
};
