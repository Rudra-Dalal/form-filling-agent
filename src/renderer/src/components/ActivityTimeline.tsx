import React, { useEffect, useRef } from 'react';
import { ActivityLogItem } from '../types';

interface ActivityTimelineProps {
  logs: ActivityLogItem[];
}

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({ logs }) => {
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <section className="log">
      <h2>Agent Activity Log</h2>
      <div id="log-output" ref={logContainerRef} className="log-output">
        {logs.map((item) => (
          <div key={item.id} className={`log-line log-${item.category}`}>
            <span className="log-time">[{item.timestamp}]</span>{' '}
            <span className="log-text">{item.message}</span>
          </div>
        ))}
      </div>
    </section>
  );
};
