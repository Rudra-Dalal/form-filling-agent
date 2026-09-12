/**
 * Status indicator component displaying the agent's current operational state.
 */

function initAgentStatus({ state }) {
  const statusBadge = document.getElementById('status-badge');
  const statusMessage = document.getElementById('status-message');

  const statusColors = {
    idle: '#6b7280',
    running: '#3b82f6',
    paused: '#eab308',
    waiting_for_user: '#ec4899',
    human_takeover: '#8b5cf6',
    completed: '#10b981',
    error: '#ef4444',
  };

  state.subscribe((current) => {
    if (statusBadge) {
      statusBadge.textContent = current.agentStatus.toUpperCase();
      statusBadge.style.backgroundColor = statusColors[current.agentStatus] || '#6b7280';
    }
    if (statusMessage) {
      statusMessage.textContent = current.statusMessage || '';
    }
  });
}

if (typeof window !== 'undefined') {
  window.initAgentStatus = initAgentStatus;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { initAgentStatus };
}
