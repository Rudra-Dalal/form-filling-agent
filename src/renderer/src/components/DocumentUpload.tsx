import React, { useState } from 'react';
import { DocumentData } from '../types';

interface DocumentUploadProps {
  documentPath: string;
  documentData: DocumentData | null;
  onPickDocument: () => Promise<void>;
  disabled: boolean;
}

export const DocumentUpload: React.FC<DocumentUploadProps> = ({
  documentPath,
  documentData,
  onPickDocument,
  disabled,
}) => {
  const [isPicking, setIsPicking] = useState(false);

  const handlePick = async () => {
    setIsPicking(true);
    try {
      await onPickDocument();
    } finally {
      setIsPicking(false);
    }
  };

  const fileName = documentPath ? documentPath.split(/[/\\]/).pop() : '';
  const fields = documentData?.fields || [];
  const warnings = documentData?.warnings || [];

  return (
    <>
      <div className="field">
        <label>Student Document (PDF / DOCX / XLSX / XLS)</label>
        <div className="doc-picker-row">
          <button
            id="pick-doc-btn"
            type="button"
            className="btn-secondary"
            onClick={handlePick}
            disabled={disabled || isPicking}
          >
            {isPicking ? 'Parsing document...' : 'Choose Document...'}
          </button>
          <span id="doc-status" className="doc-status">
            {fileName ? `Selected: ${fileName}` : 'No document selected'}
          </span>
        </div>
      </div>

      {documentData && (
        <section id="extracted-section" className="extracted">
          <h2>Extracted Document Information</h2>
          <ul id="extracted-list" className="extracted-list">
            {fields.length === 0 ? (
              <li className="extracted-item">No structured fields detected.</li>
            ) : (
              fields.map((f, i) => (
                <li key={i} className="extracted-item">
                  <strong>{f.label}:</strong> {f.value} ({f.confidence || 'verified'})
                </li>
              ))
            )}
          </ul>

          {warnings.length > 0 && (
            <div id="extracted-warnings">
              <p className="warning-heading">Needs your attention before/while filling:</p>
              {warnings.map((w, idx) => (
                <p key={idx} className="warning">
                  &warning; {w}
                </p>
              ))}
            </div>
          )}
        </section>
      )}
    </>
  );
};
