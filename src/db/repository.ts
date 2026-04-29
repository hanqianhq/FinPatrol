import { db, type CloudTokenConfigRow, type InspectionHistoryRowDb, type LlmConfigRow } from '@/db/appDb';

const MIGRATION_FLAG_KEY = 'migration.localStorage.v1.completed';

export type AgentMessage = {
  id: string;
  role: 'user' | 'agent';
  content: string;
  time: string;
};

export type CloudProvider = 'aliyun' | 'tencent' | 'volcengine' | 'aws' | 'cfm';
export type CloudTokenConfig = {
  provider: CloudProvider;
  label: string;
  values: Record<string, string>;
};

export type InspectionHistoryRow = {
  id: string;
  inspectTime: string;
  status: 'success' | 'failed';
  count: number;
  message: string;
};

export type LlmProvider = 'openai' | 'qwen' | 'deepseek' | 'zhipu' | 'tokenplan' | 'custom';
export type LlmConfig = {
  provider: LlmProvider;
  label: string;
  baseUrl: string;
  model: string;
  apiKey: string;
  enabled: boolean;
};

export async function hasCompletedMigration(): Promise<boolean> {
  const row = await db.kv.get(MIGRATION_FLAG_KEY);
  return Boolean(row?.value);
}

export async function markMigrationCompleted(): Promise<void> {
  await db.kv.put({ key: MIGRATION_FLAG_KEY, value: true, updatedAt: Date.now() });
}

export async function loadAgentMessages(sessionId = 'default'): Promise<AgentMessage[]> {
  const rows = await db.agentMessages.where('sessionId').equals(sessionId).sortBy('createdAt');
  return rows.map((r) => ({ id: r.id, role: r.role, content: r.content, time: r.time }));
}

export async function saveAgentMessages(messages: AgentMessage[], sessionId = 'default'): Promise<void> {
  const now = Date.now();
  await db.transaction('rw', db.agentMessages, async () => {
    await db.agentMessages.where('sessionId').equals(sessionId).delete();
    await db.agentMessages.bulkPut(
      messages.map((m, idx) => ({
        id: m.id,
        sessionId,
        role: m.role,
        content: m.content,
        time: m.time,
        createdAt: now + idx,
      })),
    );
  });
}

export async function loadInspectionHistory(): Promise<InspectionHistoryRow[]> {
  const rows = await db.inspectionHistory.orderBy('createdAt').reverse().limit(100).toArray();
  return rows.map((r) => ({
    id: r.id,
    inspectTime: r.inspectTime,
    status: r.status,
    count: r.count,
    message: r.message,
  }));
}

export async function appendInspectionHistory(row: Omit<InspectionHistoryRow, 'id'>): Promise<void> {
  const next: InspectionHistoryRowDb = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    inspectTime: row.inspectTime,
    status: row.status,
    count: row.count,
    message: row.message,
    createdAt: Date.now(),
  };
  await db.inspectionHistory.put(next);
}

export async function loadFundFlowRows(): Promise<unknown[]> {
  const cached = await db.fundFlowCache.get('aliyun-fund-flow');
  return Array.isArray(cached?.rows) ? cached!.rows : [];
}

export async function saveFundFlowRows(rows: unknown[]): Promise<void> {
  await db.fundFlowCache.put({ id: 'aliyun-fund-flow', rows, updatedAt: Date.now() });
}

export async function loadCloudTokenConfigs(): Promise<CloudTokenConfig[] | null> {
  const rows = await db.cloudTokenConfigs.toArray();
  if (!rows.length) return null;
  return rows.map((r) => ({ provider: r.provider as CloudProvider, label: r.label, values: r.values }));
}

export async function saveCloudTokenConfigs(configs: CloudTokenConfig[]): Promise<void> {
  const now = Date.now();
  await db.transaction('rw', db.cloudTokenConfigs, async () => {
    await db.cloudTokenConfigs.clear();
    await db.cloudTokenConfigs.bulkPut(
      configs.map(
        (c): CloudTokenConfigRow => ({
          provider: c.provider,
          label: c.label,
          values: c.values,
          updatedAt: now,
        }),
      ),
    );
  });
}

export async function loadLlmConfigs(): Promise<LlmConfig[] | null> {
  const rows = await db.llmConfigs.toArray();
  if (!rows.length) return null;
  return rows.map((r) => ({
    provider: r.provider as LlmProvider,
    label: r.label,
    baseUrl: r.baseUrl,
    model: r.model,
    apiKey: r.apiKey,
    enabled: r.enabled,
  }));
}

export async function saveLlmConfigs(configs: LlmConfig[]): Promise<void> {
  const now = Date.now();
  await db.transaction('rw', db.llmConfigs, async () => {
    await db.llmConfigs.clear();
    await db.llmConfigs.bulkPut(
      configs.map(
        (c): LlmConfigRow => ({
          provider: c.provider,
          label: c.label,
          baseUrl: c.baseUrl,
          model: c.model,
          apiKey: c.apiKey,
          enabled: c.enabled,
          updatedAt: now,
        }),
      ),
    );
  });
}

type MigrationInputs = {
  fundRowsCacheKey: string;
  inspectionHistoryCacheKey: string;
  agentSessionCacheKey: string;
  cloudTokenConfigCacheKey: string;
  llmConfigCacheKey: string;
};

export async function migrateFromLocalStorageIfNeeded(inputs: MigrationInputs): Promise<void> {
  const done = await hasCompletedMigration();
  if (done) return;

  // Migrate in best-effort mode. We intentionally don't throw to avoid blocking UI.
  try {
    const cachedMessages = localStorage.getItem(inputs.agentSessionCacheKey);
    if (cachedMessages) {
      const parsed = JSON.parse(cachedMessages) as AgentMessage[];
      if (Array.isArray(parsed) && parsed.length) {
        await saveAgentMessages(parsed, 'default');
      }
    }
  } catch {
    // ignore
  }

  try {
    const cachedHistory = localStorage.getItem(inputs.inspectionHistoryCacheKey);
    if (cachedHistory) {
      const parsed = JSON.parse(cachedHistory) as InspectionHistoryRow[];
      if (Array.isArray(parsed) && parsed.length) {
        await db.transaction('rw', db.inspectionHistory, async () => {
          for (const row of parsed.slice(0, 100)) {
            await db.inspectionHistory.put({
              id: row.id,
              inspectTime: row.inspectTime,
              status: row.status,
              count: row.count,
              message: row.message,
              createdAt: Date.now(),
            });
          }
        });
      }
    }
  } catch {
    // ignore
  }

  try {
    const cachedRows = localStorage.getItem(inputs.fundRowsCacheKey);
    if (cachedRows) {
      const parsed = JSON.parse(cachedRows) as unknown[];
      if (Array.isArray(parsed) && parsed.length) {
        await saveFundFlowRows(parsed);
      }
    }
  } catch {
    // ignore
  }

  try {
    const cachedConfigs = localStorage.getItem(inputs.cloudTokenConfigCacheKey);
    if (cachedConfigs) {
      const parsed = JSON.parse(cachedConfigs) as CloudTokenConfig[];
      if (Array.isArray(parsed) && parsed.length) {
        await saveCloudTokenConfigs(parsed);
      }
    }
  } catch {
    // ignore
  }

  try {
    const cachedLlm = localStorage.getItem(inputs.llmConfigCacheKey);
    if (cachedLlm) {
      const parsed = JSON.parse(cachedLlm) as LlmConfig[];
      if (Array.isArray(parsed) && parsed.length) {
        await saveLlmConfigs(parsed);
      }
    }
  } catch {
    // ignore
  }

  await markMigrationCompleted();
}

