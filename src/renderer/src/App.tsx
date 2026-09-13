import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { DocumentUpload } from './components/DocumentUpload';
import { TaskConfig } from './components/TaskConfig';
import { ExecutionControls } from './components/ExecutionControls';
import { AskUserDialog } from './components/AskUserDialog';
import { ReviewSection } from './components/ReviewSection';
import { ActivityTimeline } from './components/ActivityTimeline';
import {
  AgentStatus,
  DocumentData,
  ActivityLogItem,
  AgentEvent,
  AgentAPI,
} from './types';

const getAPI = (): AgentAPI | undefined => {
  return window.agentAPI || window.eigiAgent || window.electronAPI;
};

export const App: React.FC = () => {
  const [documentPath, setDocumentPath] = useState<string>('');
  const [documentData, setDocumentData] = useState<DocumentData | null>(null);
  const [targetUrl, setTargetUrl] = useState<string>('');
  const [instruction, setInstruction] = useState<string>(
    'Read this document and fill the student registration form.'
  );
  const [dryRun, setDryRun] = useState<boolean>(false);
  const [status, setStatus] = useState<AgentStatus>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('Ready to start.');
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isTakeover, setIsTakeover] = useState<boolean>(false);
  const [pendingPromptId, setPendingPromptId] = useState<string | null>(null);
  const [pendingQuestion, setPendingQuestion] = useState<string>('');
  const [pendingContext, setPendingContext] = useState<string>('');
  const [reviewSummary, setReviewSummary] = useState<string>('');
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);

  const appendLog = useCallback((message: string, category: ActivityLogItem['category'] = 'info') => {
    const item: ActivityLogItem = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toLocaleTimeString(),
      message,
      category,
    };
    setLogs((prev) => [...prev, item]);
  }, []);

  useEffect(() => {
    const api = getAPI();
    if (!api) {
      appendLog('Warning: Native desktop bridge is initializing or unavailable.', 'error');
      return;
    }

    appendLog('System initialized. Ready for task configuration.', 'info');

    const unsubscribe = api.onAgentEvent((evt: AgentEvent) => {
      switch (evt.type) {
        case 'status':
          if (evt.message) {
            setStatusMessage(evt.message);
            appendLog(evt.message, 'info');
          }
          break;

        case 'agent-thought':
          if (evt.text) appendLog(`🤔 ${evt.text}`, 'thought');
          break;

        case 'tool-call':
          appendLog(`→ ${evt.name}(${JSON.stringify(evt.input || {})})`, 'tool');
          break;

        case 'tool-error':
          appendLog(`✖ ${evt.name} failed: ${evt.message}`, 'error');
          break;

        case 'form-snapshot': {
          const count = evt.snapshot ? evt.snapshot.length : 0;
          appendLog(`Read form: ${count} interactive elements found.`, 'info');
          break;
        }

        case 'verify-result':
          if (evt.matches) {
            appendLog(`✔ Field ${evt.elementIndex} verified: "${evt.actual}"`, 'verify-success');
          } else {
            appendLog(
              `⚠ Field ${evt.elementIndex} mismatch — expected "${evt.expected}", got "${evt.actual}"`,
              'verify-mismatch'
            );
          }
          break;

        case 'ask-user':
          setStatus('waiting_for_user');
          setStatusMessage('Waiting for your answer...');
          setPendingPromptId(evt.promptId || null);
          setPendingQuestion(evt.question || '');
          setPendingContext(evt.context || '');
          appendLog(`❓ Agent requires clarification: ${evt.question}`, 'prompt');
          break;

        case 'paused':
          setIsPaused(true);
          setStatus('paused');
          setStatusMessage('Agent paused.');
          appendLog('⏸ Agent paused.', 'info');
          break;

        case 'resumed':
          setIsPaused(false);
          setStatus('running');
          setStatusMessage('Agent running...');
          appendLog('▶ Agent resumed.', 'info');
          break;

        case 'handed-over':
          setIsTakeover(true);
          setStatus('human_takeover');
          setStatusMessage('Human takeover active.');
          appendLog(`🖐 ${evt.message || 'Human takeover active.'}`, 'info');
          break;

        case 'ready_for_review':
        case 'complete':
          setStatus('ready_for_review');
          setStatusMessage('Form filled and verified. Ready for human review.');
          setReviewSummary(evt.summary || 'All fields filled and verified.');
          appendLog(`✅ Ready for Review: ${evt.summary || 'Completed.'}`, 'complete');
          break;

        case 'step-changed':
          appendLog(`➡ Multi-step progress: advanced from Step ${evt.currentStep} to Step ${evt.nextStep}`, 'info');
          break;

        case 'dynamic-field-detected':
          appendLog(`✨ Dynamic fields detected: ${evt.message || 'new form fields appeared'}`, 'info');
          break;

        case 'file-uploaded':
          appendLog(`📎 File attached: ${evt.message || `Element ${evt.elementIndex}`}`, 'info');
          break;

        case 'safety-blocked':
          appendLog(`🛡 Safety policy enforced: ${evt.message}`, 'error');
          break;

        case 'error':
          setStatus('error');
          setStatusMessage(evt.message || 'An error occurred.');
          appendLog(`✖ Error: ${evt.message}`, 'error');
          break;

        default:
          appendLog(JSON.stringify(evt), 'info');
      }
    });

    return () => {
      unsubscribe();
    };
  }, [appendLog]);

  const handlePickDocument = async (opts?: { filePath?: string }) => {
    const api = getAPI();
    if (!api) return;

    try {
      const result = await api.selectDocument(opts);
      if (result.canceled) return;

      if (result.error) {
        appendLog(`Failed to parse document: ${result.error}`, 'error');
        return;
      }

      if (result.filePath && result.parsed) {
        setDocumentPath(result.filePath);
        setDocumentData(result.parsed);
        const fileName = result.filePath.split(/[/\\]/).pop();
        const fieldCount = result.parsed.fields?.length || 0;
        appendLog(`Document "${fileName}" parsed. Extracted ${fieldCount} fields.`, 'info');
      }
    } catch (err: any) {
      appendLog(`Document selection error: ${err.message}`, 'error');
    }
  };

  const canStart = Boolean(documentData && targetUrl.trim() && instruction.trim() && status !== 'running');

  const handleStartAgent = async () => {
    const api = getAPI();
    if (!api || !canStart) return;

    setStatus('running');
    setStatusMessage('Starting agent...');
    appendLog(`Initiating form-filling task for: ${targetUrl}`, 'info');

    const res = await api.startAgent({
      documentData: documentData || undefined,
      documentPath: documentPath || undefined,
      targetUrl,
      instruction,
      dryRun,
    });

    if (!res.ok) {
      setStatus('error');
      setStatusMessage(res.error || 'Failed to start agent.');
      appendLog(`Could not start: ${res.error}`, 'error');
    } else {
      appendLog('Agent started. Visible browser window should open shortly.', 'info');
    }
  };

  const handlePause = async () => {
    const api = getAPI();
    if (api) {
      await api.pauseAgent();
      setIsPaused(true);
      setStatus('paused');
      setStatusMessage('Agent paused by user.');
    }
  };

  const handleResume = async () => {
    const api = getAPI();
    if (api) {
      await api.resumeAgent();
      setIsPaused(false);
      setStatus('running');
      setStatusMessage('Agent resumed.');
    }
  };

  const handleTakeover = async () => {
    const api = getAPI();
    if (api) {
      await api.takeOver();
      setIsTakeover(true);
      setStatus('human_takeover');
      setStatusMessage('You have control of the browser.');
      appendLog('Human takeover enabled. You may interact directly with the browser.', 'info');
    }
  };

  const handleGiveBack = async () => {
    const api = getAPI();
    if (api) {
      await api.giveBack();
      setIsTakeover(false);
      setStatus('running');
      setStatusMessage('Agent resumed control.');
      appendLog('Control handed back to the agent.', 'info');
    }
  };

  const handleSendAnswer = async (promptId: string, answer: string) => {
    const api = getAPI();
    if (!api) return;

    await api.answerPrompt(promptId, answer);
    appendLog(`Sent answer to agent: "${answer}"`, 'info');
    setPendingPromptId(null);
    setPendingQuestion('');
    setPendingContext('');
    setStatus('running');
    setStatusMessage('Processing answer...');
  };

  return (
    <div className="app">
      <Header status={status} statusMessage={statusMessage} />

      <section className="setup">
        <h2>1. Task Configuration</h2>
        <DocumentUpload
          documentPath={documentPath}
          documentData={documentData}
          onPickDocument={handlePickDocument}
          disabled={status === 'running'}
        />

        <TaskConfig
          targetUrl={targetUrl}
          onTargetUrlChange={setTargetUrl}
          instruction={instruction}
          onInstructionChange={setInstruction}
          dryRun={dryRun}
          onDryRunChange={setDryRun}
          onStart={handleStartAgent}
          canStart={canStart}
          isRunning={status === 'running'}
        />
      </section>

      <ExecutionControls
        status={status}
        isPaused={isPaused}
        isTakeover={isTakeover}
        onPause={handlePause}
        onResume={handleResume}
        onTakeover={handleTakeover}
        onGiveBack={handleGiveBack}
      />

      <AskUserDialog
        promptId={pendingPromptId}
        question={pendingQuestion}
        context={pendingContext}
        onSendAnswer={handleSendAnswer}
      />

      <ReviewSection
        visible={status === 'ready_for_review' || status === 'completed'}
        summary={reviewSummary}
      />

      <ActivityTimeline logs={logs} />
    </div>
  );
};
