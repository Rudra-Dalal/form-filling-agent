import React from 'react';

interface ReviewSectionProps {
  visible: boolean;
  summary: string;
}

export const ReviewSection: React.FC<ReviewSectionProps> = ({ visible, summary }) => {
  if (!visible) return null;

  return (
    <section id="review-section" className="review">
      <h2>Form Ready for Review</h2>
      <div className="review-box">
        <p id="review-summary" className="review-summary">
          {summary || 'All mappable fields filled and verified.'}
        </p>
        <div className="review-notice">
          <strong>Review Required:</strong> The agent has filled and verified all fields above.
          In accordance with strict Phase 1 safety constraints, autonomous submission is prohibited.
          Please inspect the form in the visible browser and click Submit yourself.
        </div>
      </div>
    </section>
  );
};
