import React from 'react';
import { DocumentData } from '../types';

interface DocumentCardProps {
  documentPath: string;
  documentData: DocumentData | null;
  onPickDocument: () => void;
  onClearDocument: () => void;
  onUpdateField: (category: 'student' | 'parent' | 'address', field: string, value: string) => void;
  isRunning: boolean;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({
  documentPath,
  documentData,
  onPickDocument,
  onClearDocument,
  onUpdateField,
  isRunning,
}) => {
  const fileName = documentPath ? documentPath.split(/[\\/]/).pop() || documentPath : '';
  const fileExtension = fileName.includes('.') ? fileName.split('.').pop()?.toUpperCase() : '';

  const hasAmbiguousAddress = Boolean(
    documentData?.warnings?.some((w) =>
      w.toLowerCase().includes('two different addresses') || w.toLowerCase().includes('ambiguous')
    )
  );

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title-group">
          <span className="step-badge">1</span>
          <div>
            <h3 className="card-title">Student Document</h3>
            <p className="card-subtitle">Select the student's admission or enrollment record</p>
          </div>
        </div>
      </div>

      {!documentPath ? (
        <div className="dropzone" onClick={() => onPickDocument()}>
          <div className="dropzone-icon">&#128196;</div>
          <div className="dropzone-text">Drag a student document here, or click to browse</div>
          <div className="dropzone-subtext">Supported formats for automatic extraction</div>
          <div className="badges-row">
            <span className="format-badge">PDF</span>
            <span className="format-badge">DOCX</span>
            <span className="format-badge">XLSX</span>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* File Chip */}
          <div className="file-chip-card">
            <div className="file-chip-info">
              <span className="file-icon">&#128196;</span>
              <div className="file-details">
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>
                  Student Document
                </div>
                <h4>{fileName}</h4>
                <div className="file-meta">
                  File type: {fileExtension || 'DOCX'} &bull; Size: ~24 KB &bull; Status: Extracted
                </div>
              </div>
            </div>
            {!isRunning && (
              <button
                type="button"
                className="btn-icon"
                title="Remove document"
                onClick={onClearDocument}
              >
                &times;
              </button>
            )}
          </div>

          {/* Extracted Information */}
          {documentData && (
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Information found in document (editable):
              </div>

              <div className="extraction-grid">
                {/* Student */}
                <div className="extraction-category">
                  <div className="category-title">Student</div>

                  <div className="field-row">
                    <label className="field-label">Full Name</label>
                    <div className="field-input-wrapper">
                      <input
                        type="text"
                        className="field-input"
                        value={documentData.student?.fullName || ''}
                        onChange={(e) => onUpdateField('student', 'fullName', e.target.value)}
                        disabled={isRunning}
                      />
                      <span className="confidence-pill conf-high">High</span>
                    </div>
                  </div>

                  <div className="field-row">
                    <label className="field-label">Date of Birth</label>
                    <div className="field-input-wrapper">
                      <input
                        type="text"
                        className="field-input"
                        value={documentData.student?.dateOfBirth || ''}
                        onChange={(e) => onUpdateField('student', 'dateOfBirth', e.target.value)}
                        disabled={isRunning}
                      />
                      <span className="confidence-pill conf-high">High</span>
                    </div>
                  </div>

                  <div className="field-row">
                    <label className="field-label">Gender</label>
                    <div className="field-input-wrapper">
                      <input
                        type="text"
                        className="field-input"
                        value={documentData.student?.gender || ''}
                        onChange={(e) => onUpdateField('student', 'gender', e.target.value)}
                        disabled={isRunning}
                      />
                      <span className="confidence-pill conf-high">High</span>
                    </div>
                  </div>

                  <div className="field-row">
                    <label className="field-label">Grade</label>
                    <div className="field-input-wrapper">
                      <input
                        type="text"
                        className="field-input"
                        value={documentData.student?.grade || ''}
                        onChange={(e) => onUpdateField('student', 'grade', e.target.value)}
                        disabled={isRunning}
                      />
                      <span className="confidence-pill conf-high">High</span>
                    </div>
                  </div>
                </div>

                {/* Parents */}
                <div className="extraction-category">
                  <div className="category-title">Parents / Guardian</div>

                  <div className="field-row">
                    <label className="field-label">Father's Name</label>
                    <div className="field-input-wrapper">
                      <input
                        type="text"
                        className="field-input"
                        value={documentData.parent?.fatherName || ''}
                        onChange={(e) => onUpdateField('parent', 'fatherName', e.target.value)}
                        disabled={isRunning}
                      />
                      <span className="confidence-pill conf-high">High</span>
                    </div>
                  </div>

                  <div className="field-row">
                    <label className="field-label">Mother's Name</label>
                    <div className="field-input-wrapper">
                      <input
                        type="text"
                        className="field-input"
                        value={documentData.parent?.motherName || ''}
                        onChange={(e) => onUpdateField('parent', 'motherName', e.target.value)}
                        disabled={isRunning}
                      />
                      <span className="confidence-pill conf-high">High</span>
                    </div>
                  </div>

                  <div className="field-row">
                    <label className="field-label">Primary Phone</label>
                    <div className="field-input-wrapper">
                      <input
                        type="text"
                        className="field-input"
                        value={documentData.parent?.contactNumber || ''}
                        onChange={(e) => onUpdateField('parent', 'contactNumber', e.target.value)}
                        disabled={isRunning}
                      />
                      <span className="confidence-pill conf-high">High</span>
                    </div>
                  </div>
                </div>

                {/* Address */}
                <div className="extraction-category">
                  <div className="category-title">Addresses</div>

                  <div className="field-row">
                    <label className="field-label">Permanent Address</label>
                    <div className="field-input-wrapper">
                      <input
                        type="text"
                        className="field-input"
                        value={documentData.address?.street || ''}
                        onChange={(e) => onUpdateField('address', 'street', e.target.value)}
                        disabled={isRunning}
                      />
                      <span className="confidence-pill conf-high">High</span>
                    </div>
                  </div>

                  <div className="field-row">
                    <label className="field-label">City</label>
                    <div className="field-input-wrapper">
                      <input
                        type="text"
                        className="field-input"
                        value={documentData.address?.city || ''}
                        onChange={(e) => onUpdateField('address', 'city', e.target.value)}
                        disabled={isRunning}
                      />
                      <span className="confidence-pill conf-high">High</span>
                    </div>
                  </div>

                  <div className="field-row">
                    <label className="field-label">State & PIN</label>
                    <div className="field-input-wrapper" style={{ display: 'flex', gap: '6px' }}>
                      <input
                        type="text"
                        className="field-input"
                        placeholder="State"
                        value={documentData.address?.state || ''}
                        onChange={(e) => onUpdateField('address', 'state', e.target.value)}
                        disabled={isRunning}
                      />
                      <input
                        type="text"
                        className="field-input"
                        style={{ maxWidth: '100px' }}
                        placeholder="PIN"
                        value={documentData.address?.pincode || ''}
                        onChange={(e) => onUpdateField('address', 'pincode', e.target.value)}
                        disabled={isRunning}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Ambiguity Warning Banner */}
              {hasAmbiguousAddress && (
                <div className="warning-callout" style={{ marginTop: '12px' }}>
                  <span style={{ fontSize: '18px' }}>&#9888;</span>
                  <div>
                    <strong>2 addresses found &mdash; we'll ask which one to use.</strong>
                    <p>
                      The document has both permanent and correspondence addresses. We'll ask which one to use during form filling.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
