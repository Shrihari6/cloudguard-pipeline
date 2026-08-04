export type NodeType =
  | 'kinesis'
  | 's3'
  | 'sqs'
  | 'lambda'
  | 'glue'
  | 'emr'
  | 'rds'
  | 'dynamodb'
  | 'redshift'
  | 'iam'
  | 'kms'
  | 'waf'
  | 'cloudwatch'
  | 'guardduty';

export type ActivePanelView = 'NODE_CHECKLIST' | 'GLOBAL_REPORT';

export type CanvasTheme = 'dark' | 'light' | 'matrix';

export type SecurityCategory = 'IAM' | 'Encryption' | 'Threat Detection';

export interface SecurityCheck {
  id: string;
  category: SecurityCategory;
  label: string;
  checked: boolean;
  description?: string;
}

export interface PipelineNodeData {
  type: NodeType;
  label: string;
  desc: string;
  color: string;
  abbrev: string;
  checks: SecurityCheck[];
  origin: 'user' | 'agent';
  isManuallyPositioned: boolean;
  [key: string]: unknown; // React Flow Node index signature compatibility
}

export type SidebarGroupCategory =
  | 'Ingestion'
  | 'Processing'
  | 'Storage'
  | 'Security'
  | 'Observability';

export interface NodeRegistryItem {
  type: NodeType;
  label: string;
  desc: string;
  category: SidebarGroupCategory;
  color: string;
  abbrev: string;
}

export interface Finding {
  id: string;
  title: string;
  category: string;
  description: string;
  remediation: string;
  severity: 'critical' | 'high' | 'medium';
}

export interface ValidationReportDTO {
  score: number;
  critical: Finding[];
  high: Finding[];
  medium: Finding[];
  passed: string[];
  executionSequence: string[];
}

export interface SuggestionDTO {
  title: string;
  body: string;
  acceptLabel: string;
  dismissLabel: string;
  nodeType?: NodeType;
  edge?: {
    source: string;
    target: string;
  };
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  suggestion?: SuggestionDTO;
  timestamp?: string;
}

export interface PipelineNodeDTO {
  id: string;
  type: string;
  label: string;
  desc: string;
}

export interface PipelineEdgeDTO {
  id: string;
  source: string;
  target: string;
}

export interface PipelineStateDTO {
  nodes: PipelineNodeDTO[];
  edges: PipelineEdgeDTO[];
}

export interface AgentRequestDTO {
  message: string;
  pipelineState: PipelineStateDTO;
  history: ChatMessage[];
}

export interface AgentResponseDTO {
  reply: string;
  suggestion?: SuggestionDTO;
  securityFlags: string[];
}
