import React from 'react';

interface ReviewCardProps {
  summary?: string;
  onFocusBrowser: () => void;
}

export const ReviewCard: React.FC<ReviewCardProps> = ({ summary, onFocusBrowser }) => {
  return (
    <div className="review-card">
      <div className="review-header">
        <div className="review-icon">&#10003;</div>
        <div>
          <h3 className="review-title">Form filled and verified</h3>
          <p style={{ fontSize: '14px', fontWeight: 600, color: '#166534', marginTop: '2px' }}>
            8 fields filled and verified &bull; 1 field left blank
          </p>
        </div>
      </div>

      <div className="review-columns">
        <div className="review-box">
          <h4 style={{ color: '#166534' }}>&#10003; Filled &amp; verified</h4>
          <ul>
            <li>&bull; Student Full Name</li>
            <li>&bull; Date of Birth</li>
            <li>&bull; Gender</li>
            <li>&bull; Applying for Grade</li>
            <li>&bull; Father Full Name</li>
            <li>&bull; Mother Full Name</li>
            <li>&bull; Primary Contact Phone</li>
            <li>&bull; Residential Address</li>
            <li>&bull; City, State &amp; PIN Code</li>
          </ul>
        </div>

        <div className="review-box">
          <h4 style={{ color: '#92400e' }}>&#9888; Left blank &mdash; needs your input</h4>
          <ul>
            <li>
              <strong>Hostel accommodation option</strong>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                No information found in document &mdash; left un-checked for safety.
              </div>
            </li>
            <li>
              <strong>Terms &amp; declaration checkboxes</strong>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Legal declaration &mdash; strictly left for human operator signature.
              </div>
            </li>
          </ul>
        </div>
      </div>

      <div className="review-reassurance">
        <div>
          <strong style={{ fontSize: '14px' }}>Nothing has been submitted.</strong>
          <div style={{ fontSize: '13px', color: '#166534', marginTop: '2px' }}>
            Review the form in the browser before submitting manually.
          </div>
        </div>
        <button
          type="button"
          className="choice-btn"
          style={{
            backgroundColor: '#15803d',
            color: 'white',
            borderColor: '#15803d',
            fontSize: '14px',
            padding: '10px 20px',
            fontWeight: 600,
          }}
          onClick={onFocusBrowser}
        >
          Open browser
        </button>
      </div>
    </div>
  );
};
