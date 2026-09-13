import React, { useState, useEffect, useCallback } from 'react';
import './styles.css';
import { Header } from './components/Header';
import { DocumentCard } from './components/DocumentCard';
import { TargetFormCard } from './components/TargetFormCard';
import { ProgressStepper } from './components/ProgressStepper';
import { ControlsBar } from './components/ControlsBar';
import { ClarificationCard } from './components/ClarificationCard';
import { ReviewCard } from './components/ReviewCard';
import { ActivityFeed } from './components/ActivityFeed';
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
  const [status, setStatus] = useState<AgentStatus>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('Ready to start.');
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isTakeover, setIsTakeover] = useState<boolean>(false);
  const [pendingPromptId, setPendingPromptId] = useState<string | null>(null);
  const [pendingQuestion, setPendingQuestion] = useState<string>('');
  const [pendingContext, setPendingContext] = useState<string>('');
  const [reviewSummary, setReviewSummary] = useState<string>('');
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [hasVerifiedFields, setHasVerifiedFields] = useState<boolean>(false);

  const appendLog = useCallback(
    (message: string, category: ActivityLogItem['category'] = 'info') => {
      const item: ActivityLogItem = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toLocaleTimeString(),
        message,
        category,
      };
      setLogs((prev) => [...prev, item]);
    },
    []
  );

  useEffect(() => {
    const api = getAPI();
    if (!api) {
      appendLog('Desktop bridge connecting...', 'info');
      return;
    }

    appendLog('EIGI Form Agent initialized. Ready.', 'info');

    const unsubscribe = api.onAgentEvent((evt: AgentEvent) => {
      switch (evt.type) {
        case 'status':
          if (evt.message) {
            setStatusMessage(evt.message);
            appendLog(evt.message, 'info');
          }
          break;

        case 'agent-thought':
          if (evt.text) appendLog(`Thinking: ${evt.text}`, 'thought');
          break;

        case 'tool-call':
          appendLog(`→ ${evt.name}(${JSON.stringify(evt.input || {})})`, 'tool');
          break;

        case 'tool-error':
          appendLog(`✖ ${evt.name} failed: ${evt.message}`, 'error');
          break;

        case 'form-snapshot': {
          const count = evt.snapshot ? evt.snapshot.length : 0;
          appendLog(`Found ${count} interactive form elements.`, 'info');
          break;
        }

        case 'verify-result':
          if (evt.matches) {
            setHasVerifiedFields(true);
            appendLog(`✔ Field ${evt.elementIndex} verified: "${evt.actual}"`, 'verify-success');
          } else {
            appendLog(
              `⚠ Field ${evt.elementIndex} mismatch: expected "${evt.expected}", got "${evt.actual}"`,
              'verify-mismatch'
            );
          }
          break;

        case 'ask-user':
          setStatus('waiting_for_user');
          setStatusMessage('Waiting for clarification...');
          setPendingPromptId(evt.promptId || null);
          setPendingQuestion(evt.question || '');
          setPendingContext(evt.context || '');
          appendLog(`❓ Clarification needed: ${evt.question}`, 'prompt');
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
          setStatusMessage('Agent working...');
          appendLog('▶ Agent resumed.', 'info');
          break;

        case 'handed-over':
          setIsTakeover(true);
          setStatus('human_takeover');
          setStatusMessage('You have control of the browser.');
          appendLog(`🖐 ${evt.message || 'You have control of the browser.'}`, 'info');
          break;

        case 'ready_for_review':
        case 'complete':
          setStatus('ready_for_review');
          setStatusMessage('Form filled and verified. Ready for human review.');
          setReviewSummary(evt.summary || 'All fields filled and verified.');
          setHasVerifiedFields(true);
          appendLog(`✅ Ready for review: ${evt.summary || 'Completed.'}`, 'complete');
          break;

        case 'step-changed':
          appendLog(`Advanced from step ${evt.currentStep} to step ${evt.nextStep}`, 'info');
          break;

        case 'dynamic-field-detected':
          appendLog(`Dynamic fields detected: ${evt.message || 'new fields appeared'}`, 'info');
          break;

        case 'file-uploaded':
          appendLog(`File attached: ${evt.message || `Element ${evt.elementIndex}`}`, 'info');
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
      const cleanOpts =
        opts && typeof opts === 'object' && typeof opts.filePath === 'string'
          ? { filePath: opts.filePath }
          : undefined;
      const result = await api.selectDocument(cleanOpts);
      if (result.canceled) return;

      if (result.error) {
        appendLog(`Document parse error: ${result.error}`, 'error');
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

  const handleClearDocument = () => {
    setDocumentPath('');
    setDocumentData(null);
  };

  const handleUpdateField = (
    category: 'student' | 'parent' | 'address',
    field: string,
    value: string
  ) => {
    setDocumentData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [category]: {
          ...(prev as any)[category],
          [field]: value,
        },
      };
    });
  };

  const canStart = Boolean(
    documentData && targetUrl.trim() && instruction.trim() && status !== 'running'
  );

  const handleStartAgent = async () => {
    const api = getAPI();
    if (!api || !canStart) return;

    setStatus('running');
    setStatusMessage('Starting agent...');
    setHasVerifiedFields(false);
    appendLog(`Initiating form-filling task for: ${targetUrl}`, 'info');

    // Run deterministic offline dry-run if targeting local files or test fixtures
    const isLocalForm = targetUrl.startsWith('file:') || targetUrl.includes('sample-registration-form');

    const res = await api.startAgent({
      documentData: documentData || undefined,
      documentPath: documentPath || undefined,
      targetUrl,
      instruction,
      dryRun: isLocalForm,
    });

    if (!res.ok) {
      setStatus('error');
      setStatusMessage(res.error || 'Failed to start agent.');
      appendLog(`Could not start: ${res.error}`, 'error');
    } else {
      appendLog('Agent started. Visible browser window opening...', 'info');
    }
  };

  const handlePause = async () => {
    const api = getAPI();
    if (api) {
      await api.pauseAgent();
      setIsPaused(true);
      setStatus('paused');
      setStatusMessage('Agent paused.');
    }
  };

  const handleResume = async () => {
    const api = getAPI();
    if (api) {
      await api.resumeAgent();
      setIsPaused(false);
      setStatus('running');
      setStatusMessage('Agent working...');
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

  const handleFocusBrowser = async () => {
    const api = getAPI();
    if (api) {
      try {
        await api.takeOver();
        setIsTakeover(true);
        setStatus('human_takeover');
        setStatusMessage('Browser active for your manual review.');
      } catch (err: any) {
        appendLog(`Browser focus: ${err.message}`, 'info');
      }
    }
  };

  return (
    <div className="app-container">
      <Header status={status} statusMessage={statusMessage} />

      <ProgressStepper
        hasDocument={Boolean(documentData)}
        status={status}
        hasVerifiedFields={hasVerifiedFields}
        isReadyForReview={status === 'ready_for_review'}
      />

      <DocumentCard
        documentPath={documentPath}
        documentData={documentData}
        onPickDocument={handlePickDocument}
        onClearDocument={handleClearDocument}
        onUpdateField={handleUpdateField}
        isRunning={status === 'running'}
      />

      <TargetFormCard
        targetUrl={targetUrl}
        onTargetUrlChange={setTargetUrl}
        instruction={instruction}
        onInstructionChange={setInstruction}
        onStart={handleStartAgent}
        canStart={canStart}
        isRunning={status === 'running'}
      />

      <ControlsBar
        status={status}
        isPaused={isPaused}
        isTakeover={isTakeover}
        onPause={handlePause}
        onResume={handleResume}
        onTakeover={handleTakeover}
        onGiveBack={handleGiveBack}
      />

      {status === 'waiting_for_user' && (
        <ClarificationCard
          question={pendingQuestion}
          context={pendingContext}
          onAnswer={(ans) => {
            if (pendingPromptId) handleSendAnswer(pendingPromptId, ans);
          }}
        />
      )}

      {(status === 'ready_for_review' || status === 'completed') && (
        <ReviewCard
          summary={reviewSummary}
          onFocusBrowser={handleFocusBrowser}
        />
      )}

      <ActivityFeed items={logs} />
    </div>
  );
};
