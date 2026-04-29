import Dexie, { type Table } from 'dexie';

export type KvRow = {
  key: string;
  value: unknown;
  updatedAt: number;
};

export type AgentSessionRow = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
};

export type AgentMessageRow = {
  id: string;
  sessionId: string;
  role: 'user' | 'agent';
  content: string;
  time: string;
  createdAt: number;
};

export type InspectionHistoryRowDb = {
  id: string;
  inspectTime: string;
  status: 'success' | 'failed';
  count: number;
  message: string;
  createdAt: number;
};

export type FundFlowCacheRow = {
  id: string;
  rows: unknown[];
  updatedAt: number;
};

export type CloudTokenConfigRow = {
  provider: string;
  label: string;
  values: Record<string, string>;
  updatedAt: number;
};

export type LlmConfigRow = {
  provider: string;
  label: string;
  baseUrl: string;
  model: string;
  apiKey: string;
  enabled: boolean;
  updatedAt: number;
};

export class AppDb extends Dexie {
  kv!: Table<KvRow, string>;
  agentSessions!: Table<AgentSessionRow, string>;
  agentMessages!: Table<AgentMessageRow, string>;
  inspectionHistory!: Table<InspectionHistoryRowDb, string>;
  fundFlowCache!: Table<FundFlowCacheRow, string>;
  cloudTokenConfigs!: Table<CloudTokenConfigRow, string>;
  llmConfigs!: Table<LlmConfigRow, string>;

  constructor() {
    super('yunxun_agent_workbench_db');

    this.version(1).stores({
      kv: '&key, updatedAt',
      agentSessions: '&id, updatedAt, createdAt',
      agentMessages: '&id, sessionId, createdAt',
      inspectionHistory: '&id, createdAt',
      fundFlowCache: '&id, updatedAt',
      cloudTokenConfigs: '&provider, updatedAt',
    });

    this.version(2).stores({
      kv: '&key, updatedAt',
      agentSessions: '&id, updatedAt, createdAt',
      agentMessages: '&id, sessionId, createdAt',
      inspectionHistory: '&id, createdAt',
      fundFlowCache: '&id, updatedAt',
      cloudTokenConfigs: '&provider, updatedAt',
      llmConfigs: '&provider, updatedAt',
    });
  }
}

export const db = new AppDb();

