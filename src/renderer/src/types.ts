export interface ExtractedField {
  label: string;
  value: string;
  confidence?: string;
}

export interface StudentInfo {
  fullName?: string;
  dateOfBirth?: string;
  gender?: string;
  grade?: string;
  applicantName?: string;
}

export interface ParentInfo {
  fatherName?: string;
  motherName?: string;
  contactNumber?: string;
}

export interface AddressInfo {
  street?: string;
  city?: string;
  state?: string;
  pincode?: string;
  residentialAddress?: string;
}

export interface CanonicalRecord {
  student: StudentInfo;
  parent: ParentInfo;
  address: AddressInfo;
}

export interface UnmappedField {
  label: string;
  value: string;
  reason?: string;
}

export interface DocumentData {
  rawText?: string;
  fields?: ExtractedField[];
  record?: CanonicalRecord;
  student?: StudentInfo;
  parent?: ParentInfo;
  address?: AddressInfo;
  unmapped?: UnmappedField[];
  warnings?: string[];
}

export type AgentStatus =
  | 'idle'
  | 'running'
  | 'paused'
  | 'waiting_for_user'
  | 'human_takeover'
  | 'ready_for_review'
  | 'completed'
  | 'error';

export interface ActivityLogItem {
  id: string;
  timestamp: string;
  message: string;
  category: 'info' | 'thought' | 'tool' | 'error' | 'verify-success' | 'verify-mismatch' | 'prompt' | 'complete';
}

export interface AgentEvent {
  type: string;
  message?: string;
  text?: string;
  name?: string;
  input?: any;
  actual?: string;
  expected?: string;
  matches?: boolean;
  elementIndex?: number;
  promptId?: string;
  question?: string;
  context?: string;
  summary?: string;
  snapshot?: any[];
  currentStep?: number;
  nextStep?: number;
  parentIndex?: number;
}

export interface DocumentPickResult {
  canceled: boolean;
  filePath?: string;
  parsed?: DocumentData;
  error?: string;
}

export interface AgentAPI {
  pickAndParseDocument: (opts?: { filePath?: string }) => Promise<DocumentPickResult>;
  selectDocument: (opts?: { filePath?: string }) => Promise<DocumentPickResult>;
  startAgent: (payload: {
    documentData?: DocumentData;
    documentPath?: string;
    targetUrl: string;
    instruction: string;
    dryRun: boolean;
  }) => Promise<{ ok: boolean; error?: string; sessionId?: string }>;
  pauseAgent: () => Promise<{ ok: boolean; error?: string }>;
  resumeAgent: () => Promise<{ ok: boolean; error?: string }>;
  takeOver: () => Promise<{ ok: boolean; error?: string }>;
  giveBack: () => Promise<{ ok: boolean; error?: string }>;
  answerPrompt: (promptId: string, answer: string) => Promise<{ ok: boolean; error?: string }>;
  getBrowserSnapshot: () => Promise<{ ok: boolean; snapshot?: any; error?: string }>;
  getBrowserDomValues: () => Promise<{ ok: boolean; values?: Record<string, any>; error?: string }>;
  onAgentEvent: (callback: (evt: AgentEvent) => void) => () => void;
}

declare global {
  interface Window {
    agentAPI?: AgentAPI;
    eigiAgent?: AgentAPI;
    electronAPI?: AgentAPI;
  }
}
