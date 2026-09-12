/**
 * Reactive UI state store for managing task and execution status.
 */

class TaskState {
  constructor() {
    this.state = {
      documentData: null,
      documentPath: '',
      targetUrl: '',
      instruction: 'Read this document and fill the student registration form.',
      agentStatus: 'idle',
      statusMessage: 'Ready to start.',
      pendingPromptId: null,
      pendingQuestion: '',
      pendingContext: '',
      isPaused: false,
      isTakeover: false,
    };

    this.listeners = new Set();
  }

  getState() {
    return { ...this.state };
  }

  setState(updates) {
    this.state = { ...this.state, ...updates };
    this.notify();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  canStart() {
    return (
      Boolean(this.state.documentData) &&
      Boolean(this.state.targetUrl.trim()) &&
      Boolean(this.state.instruction.trim()) &&
      this.state.agentStatus !== 'running'
    );
  }
}

// In the browser renderer, expose a singleton instance
const taskState = new TaskState();
if (typeof window !== 'undefined') {
  window.taskState = taskState;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TaskState, taskState };
}
