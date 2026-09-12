/**
 * Document upload & extracted fields preview component.
 */

function initDocumentUpload({ state, api, onLog }) {
  const pickBtn = document.getElementById('pick-doc-btn');
  const docStatus = document.getElementById('doc-status');
  const extractedSection = document.getElementById('extracted-section');
  const extractedList = document.getElementById('extracted-list');
  const extractedWarnings = document.getElementById('extracted-warnings');

  pickBtn.addEventListener('click', async () => {
    pickBtn.disabled = true;
    docStatus.textContent = 'Parsing document...';

    try {
      const result = await api.pickAndParseDocument();
      if (result.canceled) {
        docStatus.textContent = state.getState().documentPath || 'No document selected';
        return;
      }

      if (result.error) {
        docStatus.textContent = `Error: ${result.error}`;
        onLog(`Failed to parse document: ${result.error}`);
        return;
      }

      const fileName = result.filePath.split(/[/\\]/).pop();
      docStatus.textContent = `Selected: ${fileName}`;

      state.setState({
        documentData: result.parsed,
        documentPath: result.filePath,
      });

      // Render extracted fields
      extractedSection.hidden = false;
      extractedList.innerHTML = '';
      const fields = result.parsed.fields || [];

      if (fields.length === 0) {
        const li = document.createElement('li');
        li.textContent = 'No structured fields detected.';
        extractedList.appendChild(li);
      } else {
        fields.forEach((f) => {
          const li = document.createElement('li');
          li.textContent = `${f.label}: ${f.value} (${f.confidence || 'verified'})`;
          extractedList.appendChild(li);
        });
      }

      // Render warnings
      extractedWarnings.innerHTML = '';
      const warnings = result.parsed.warnings || [];
      if (warnings.length > 0) {
        const heading = document.createElement('p');
        heading.textContent = 'Needs your attention before/while filling:';
        heading.className = 'warning-heading';
        extractedWarnings.appendChild(heading);

        warnings.forEach((w) => {
          const p = document.createElement('p');
          p.className = 'warning';
          p.textContent = `⚠ ${w}`;
          extractedWarnings.appendChild(p);
        });
      }

      onLog(`Document "${fileName}" parsed. Extracted ${fields.length} fields.`);
    } catch (err) {
      docStatus.textContent = `Error: ${err.message}`;
      onLog(`Document selection error: ${err.message}`);
    } finally {
      pickBtn.disabled = false;
    }
  });
}

if (typeof window !== 'undefined') {
  window.initDocumentUpload = initDocumentUpload;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { initDocumentUpload };
}
