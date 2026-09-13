import React, { useState } from 'react';
import { ActivityLogItem } from '../types';

interface ActivityFeedProps {
  items: ActivityLogItem[];
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ items }) => {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState<boolean>(false);

  // Filter and format items to be friendly and human-readable
  const formatItem = (item: ActivityLogItem) => {
    let icon = '✓';
    let iconClass = 'icon-check';
    let text = item.message;

    // Check category and content
    if (item.category === 'error') {
      icon = '✖';
      iconClass = 'icon-warn';
    } else if (
      item.category === 'verify-mismatch' ||
      item.message.toLowerCase().includes('untouched') ||
      item.message.toLowerCase().includes('mismatch')
    ) {
      icon = '⚠';
      iconClass = 'icon-warn';
    } else if (item.category === 'prompt' || item.message.includes('ambiguity') || item.message.includes('Two different addresses')) {
      icon = '❓';
      iconClass = 'icon-warn';
      text = 'Checking address...';
    } else if (
      item.category === 'thought' ||
      item.message.toLowerCase().includes('thinking') ||
      item.message.toLowerCase().includes('navigating') ||
      item.message.toLowerCase().includes('launching') ||
      item.message.toLowerCase().includes('starting agent') ||
      item.message.toLowerCase().includes('processing')
    ) {
      icon = '⏳';
      iconClass = 'icon-wait';
    } else if (item.category === 'verify-success') {
      icon = '✓';
      iconClass = 'icon-check';
    }

    // Convert raw tool calls or messages into clean readable text
    if (text.startsWith('→ fill_text(')) {
      try {
        const payloadStr = text.slice(12, -1);
        const parsed = JSON.parse(payloadStr);
        text = `Filled field value "${parsed.value}"`;
      } catch {
        text = 'Filled form field';
      }
    } else if (text.startsWith('→ select_option(')) {
      try {
        const payloadStr = text.slice(16, -1);
        const parsed = JSON.parse(payloadStr);
        text = `Selected option "${parsed.option_label}"`;
      } catch {
        text = 'Selected form option';
      }
    } else if (text.startsWith('→ verify_field(')) {
      text = 'Verifying field in browser DOM...';
      icon = '⏳';
      iconClass = 'icon-wait';
    } else if (text.startsWith('→ read_form')) {
      text = 'Inspecting registration form structure';
      icon = '⏳';
      iconClass = 'icon-wait';
    } else if (text.startsWith('→ task_complete')) {
      text = 'Form filling and verification complete';
      icon = '✓';
      iconClass = 'icon-check';
    } else if (text.includes('Document') && text.includes('parsed')) {
      text = 'Document read and parsed successfully';
      icon = '✓';
      iconClass = 'icon-check';
    } else if (text.includes('Initiating form-filling task')) {
      text = 'Opened registration form';
      icon = '✓';
      iconClass = 'icon-check';
    } else if (text.includes('Mapped') && text.includes('candidate form fields')) {
      const match = text.match(/\d+/);
      text = `Found ${match ? match[0] : '8'} relevant form fields`;
      icon = '✓';
      iconClass = 'icon-check';
    } else if (text.includes('Ready for Review') || text.includes('Form filled, verified')) {
      text = 'Form filled and verified';
      icon = '✓';
      iconClass = 'icon-check';
    } else if (text.startsWith('✔ Field')) {
      text = text.replace(/^✔\s*/, 'Verified: ');
      icon = '✓';
      iconClass = 'icon-check';
    }

    // Clean up technical artifacts
    text = text
      .replace(/^Read form:\s*/i, 'Inspected form: ')
      .replace(/__agentElements\[\d+\]/g, 'form element');

    return { icon, iconClass, text };
  };

  if (items.length === 0) {
    return null;
  }

  // Display the most relevant latest items
  const displayItems = items.slice(-12);

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h3 className="card-title">Activity</h3>
          <p className="card-subtitle">Live progress updates as the agent works</p>
        </div>
        <button
          type="button"
          className="details-toggle"
          onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
        >
          {showTechnicalDetails ? 'Hide details' : 'Show details'}
        </button>
      </div>

      <div className="activity-feed">
        {displayItems.map((item) => {
          const { icon, iconClass, text } = formatItem(item);
          return (
            <div key={item.id} className="activity-item">
              <span className={`activity-icon ${iconClass}`}>{icon}</span>
              <span style={{ flex: 1 }}>{text}</span>
            </div>
          );
        })}
      </div>

      {showTechnicalDetails && (
        <div
          style={{
            marginTop: '8px',
            padding: '10px 12px',
            backgroundColor: '#f1f5f9',
            borderRadius: '6px',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: '#475569',
            maxHeight: '160px',
            overflowY: 'auto',
          }}
        >
          {items.map((it) => (
            <div key={`raw-${it.id}`}>
              [{it.timestamp}] ({it.category}) {it.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
