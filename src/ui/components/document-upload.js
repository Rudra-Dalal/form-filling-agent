import { taskState } from '../state/task-state.js';

const CONFIDENCE_TO_PILL_CLASS = {
  high: 'pill-success',
  medium: 'pill-warning',
  low: 'pill-neutral',
};

function formatFileSize(bytes) {
  if (!bytes) return '';
  const kb = bytes / 1024;
  return kb < 1024 ? `${kb.toFixed(0)} KB` : `${(kb / 1024).toFixed(1)} MB`;
}

function renderFieldRow(field) {
  const pillClass = CONFIDENCE_TO_PILL_CLASS[field.confidence] || 'pill-neutral';
  return `
    <div class="extracted-row">
      <span class="field-label">${field.label}</span>
      <span class="field-value">
        ${field.value}
        <span class="pill ${pillClass}" style="margin-left:6px;">${field.confidence}</span>
      </span>
    </div>`;
}

function groupFieldsBySection(fields) {
  // Fields carry a free-form label; group them into the three canonical
  // sections by simple prefix matching so the grid always has the same
  // three columns regardless of exactly which fields extraction found.
  const groups = { Student: [], 'Parent / Guardian': [], 'Address Details': [] };

  for (const field of fields) {
    const lower = field.label.toLowerCase();
    if (/father|mother|parent|guardian|contact/.test(lower)) {
      groups['Parent / Guardian'].push(field);
    } else if (/address|city|state|pincode|pin code/.test(lower)) {
      groups['Address Details'].push(field);
    } else {
      groups.Student.push(field);
    }
  }
  return groups;
}

export function initDocumentUpload(container) {
  container.innerHTML = `
    <div class="step-label">Step 1</div>
    <h2>Upload Document</h2>
    <div id="dropzone-area"></div>
    <div id="extracted-area"></div>
  `;

  const dropzoneArea = container.querySelector('#dropzone-area');
  const extractedArea = container.querySelector('#extracted-area');

  dropzoneArea.addEventListener('click', async () => {
    if (taskState.getState().documentFile) return; // already have a file
    const result = await window.agentAPI.pickAndParseDocument();
    if (result.canceled) return;

    taskState.setState({
      documentFile: { name: result.filePath.split(/[\\/]/).pop(), size: result.parsed.sizeBytes },
      extraction: { fields: result.parsed.fields, warnings: result.parsed.warnings },
      extractionInProgress: false,
    });
  });

  function render(state) {
    // Dropzone / file chip
    if (!state.documentFile) {
      dropzoneArea.innerHTML = `
        <div class="dropzone">
          <div style="font-size:24px;">📄</div>
          <p>Drag a file here or click to browse</p>
          <p class="helper-text">PDF &nbsp;·&nbsp; DOCX &nbsp;·&nbsp; XLSX</p>
        </div>`;
    } else {
      dropzoneArea.innerHTML = `
        <div class="file-chip">
          <span>📄</span>
          <span class="file-name">${state.documentFile.name}</span>
          <span class="file-meta">${formatFileSize(state.documentFile.size)}</span>
          <button class="remove-btn" id="remove-file-btn">×</button>
        </div>
        ${
          state.extractionInProgress
            ? `<div class="progress-bar"><div class="progress-bar-fill" style="width:60%"></div></div>
               <div class="progress-caption">Reading document...</div>`
            : `<div class="progress-bar"><div class="progress-bar-fill" style="width:100%"></div></div>
               <div class="progress-caption">Document parsed successfully</div>`
        }
      `;
      dropzoneArea.querySelector('#remove-file-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        taskState.setState({ documentFile: null, extraction: null });
      });
    }

    // Extracted fields
    if (!state.extraction) {
      extractedArea.innerHTML = '';
      return;
    }

    const groups = groupFieldsBySection(state.extraction.fields);
    const groupsHtml = Object.entries(groups)
      .map(
        ([title, fields]) => `
        <div class="extracted-group">
          <h3>${title}</h3>
          ${fields.map(renderFieldRow).join('') || '<p class="helper-text">None found</p>'}
        </div>`
      )
      .join('');

    const warningsHtml =
      state.extraction.warnings.length > 0
        ? `<div class="warning-callout">
             <strong>Needs your attention</strong>
             ${state.extraction.warnings.map((w) => `<div>• ${w}</div>`).join('')}
           </div>`
        : '';

    extractedArea.innerHTML = `
      <div class="extracted-grid">${groupsHtml}</div>
      ${warningsHtml}
    `;
  }

  taskState.subscribe(render);
  render(taskState.getState());
}
