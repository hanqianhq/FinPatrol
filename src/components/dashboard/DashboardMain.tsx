import {
  Activity,
  ArrowUpRight,
  Bot,
  CheckCircle2,
  Clock,
  Cloud,
  Cpu,
  FileText,
  Key,
  MoreVertical,
  PanelRight,
  Workflow,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Bubble, Sender } from '@ant-design/x';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/dashboard/Badge';
import type { DashboardMenuKey } from '@/components/dashboard/Sidebar';
import { StatCard } from '@/components/dashboard/StatCard';
import {
  dataSourceHealthRows,
  recentWorkflowRuns,
  usageChartHeights,
} from '@/data/dashboard';
import type { AliyunFundTransaction } from '@/data/dashboard';
import { modelHealthStatusLabel, taskStatusLabel, taskStatusToBadge } from '@/lib/taskStatus';
import {
  appendInspectionHistory as dbAppendInspectionHistory,
  appendConnectionLog,
  loadConnectionLogs,
  loadAgentMessages,
  loadCloudTokenConfigs,
  loadFundFlowRows,
  loadInspectionHistory,
  loadLlmConfigs,
  migrateFromLocalStorageIfNeeded,
  saveAgentMessages,
  saveCloudTokenConfigs as dbSaveCloudTokenConfigs,
  saveFundFlowRows as dbSaveFundFlowRows,
  saveLlmConfigs as dbSaveLlmConfigs,
} from '@/db/repository';

type DashboardMainProps = {
  activeMenu: DashboardMenuKey;
  onOpenAsk?: () => void;
};

const FUND_ROWS_CACHE_KEY = 'aliyun-fund-flow-cache-v1';
const ALIYUN_AUTH_CACHE_KEY = 'aliyun-auth-cache-v1';
const INSPECTION_HISTORY_CACHE_KEY = 'aliyun-inspection-history-cache-v1';
const LLM_CONFIG_CACHE_KEY = 'llm-provider-configs-v1';
const AGENT_SESSION_CACHE_KEY = 'agent-chat-session-cache-v1';
const CLOUD_TOKEN_CONFIG_CACHE_KEY = 'multi-cloud-token-configs-v1';
const EXTENSION_REPO_ZIP_URL = '/downloads/dual-credential-capture-extension.zip';
const EXTENSION_INSTALL_URL = 'chrome://extensions/';

type FundFlowRow = AliyunFundTransaction;
type InspectionHistoryRow = {
  id: string;
  inspectTime: string;
  status: 'success' | 'failed';
  count: number;
  message: string;
};
type AgentMessage = {
  id: string;
  role: 'user' | 'agent';
  content: string;
  time: string;
};
type LlmProvider = 'openai' | 'qwen' | 'deepseek' | 'zhipu' | 'tokenplan' | 'custom';
type LlmConfig = {
  provider: LlmProvider;
  label: string;
  baseUrl: string;
  model: string;
  apiKey: string;
  enabled: boolean;
};
type CloudProvider = 'aliyun' | 'tencent' | 'volcengine' | 'aws' | 'cfm';
type CloudTokenConfig = {
  provider: CloudProvider;
  label: string;
  values: Record<string, string>;
};

type PlatformStatus = 'live' | 'setup' | 'mock' | 'error';

const platformStatusBadge: Record<PlatformStatus, { label: string; badge: Parameters<typeof Badge>[0]['status'] }> = {
  live: { label: 'LIVE', badge: 'success' },
  setup: { label: 'SETUP', badge: 'neutral' },
  mock: { label: 'MOCK', badge: 'processing' },
  error: { label: 'ERROR', badge: 'danger' },
};

const platformStatusText: Record<PlatformStatus, string> = {
  live: '已连接',
  setup: '未配置',
  mock: 'Mock',
  error: '连接失败',
};

type AliyunFundFlowItem = {
  serialNo?: string;
  tradeNo?: string;
  gmtCreate?: number | string;
  tradeTime?: number | string;
  inOutType?: string;
  inOutTypeDesc?: string;
  tradeType?: string;
  tradeTypeDesc?: string;
  channel?: string;
  tradeChannel?: string;
  amount?: string | number;
  balance?: string | number;
  fundType?: string;
  fundTypeDesc?: string;
  remark?: string;
  memo?: string;
  channelTradeNo?: string;
  channelSerialNo?: string;
  orderNo?: string;
  tradeOrderNo?: string;
  billCycle?: string;
  billPeriod?: string;
  account?: string;
  accountName?: string;
  resourceUserName?: string;
  tradeId?: string | number;
  tradeTimeStr?: string;
  tradeDirection?: string;
  tradeDirectionName?: string;
  tradeTypeName?: string;
  tradeChannelName?: string;
  fundTypeName?: string;
  accountBookName?: string;
  desc?: string;
  dealAmount?: string | number;
  billingCycle?: string;
};

type AliyunFundFlowResponse = {
  data?: AliyunFundFlowItem[] | { list?: AliyunFundFlowItem[]; result?: AliyunFundFlowItem[] };
  list?: AliyunFundFlowItem[];
};

const formatDisplayTime = (value?: number | string): string => {
  if (value === undefined || value === null || value === '') {
    return '-';
  }
  if (typeof value === 'number') {
    return new Date(value).toLocaleString('zh-CN', { hour12: false });
  }
  return value;
};

const formatCurrency = (value?: string | number): string => {
  if (value === undefined || value === null || value === '') {
    return '-';
  }
  if (typeof value === 'number') {
    const sign = value > 0 ? '+' : '';
    return `${sign}¥${value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return String(value);
};

const normalizeFundFlowRows = (items: AliyunFundFlowItem[]): FundFlowRow[] =>
  items.map((item, index) => ({
    serialNo: String(item.serialNo || item.tradeNo || item.tradeId || `FLOW_${index + 1}`),
    transactionTime: item.tradeTimeStr || formatDisplayTime(item.tradeTime || item.gmtCreate),
    incomeExpenseType: item.tradeDirectionName || item.inOutTypeDesc || item.inOutType || item.tradeDirection || '-',
    transactionType: item.tradeTypeName || item.tradeTypeDesc || item.tradeType || '-',
    transactionChannel: item.tradeChannelName || item.tradeChannel || item.channel || '-',
    amount: formatCurrency(item.dealAmount ?? item.amount),
    balance: formatCurrency(item.balance),
    fundForm: item.accountBookName || item.fundTypeName || item.fundTypeDesc || item.fundType || '-',
    remark: item.remark || item.memo || '-',
    channelSerialNo: item.channelSerialNo || item.channelTradeNo || '-',
    transactionOrderNo: item.tradeOrderNo || item.orderNo || '-',
    billingPeriod: item.billPeriod || item.billCycle || item.billingCycle || '-',
    account: item.resourceUserName || item.account || item.accountName || 'sappoc@rd-oibw8m.aliyunid.com',
  }));

const extractCsrfTokenFromCookie = (cookie: string): string => {
  const primary = cookie.match(/(?:^|;\s*)c_csrf_token=([^;]+)/);
  if (primary?.[1]) {
    return decodeURIComponent(primary[1]);
  }
  const fallback = cookie.match(/(?:^|;\s*)login_aliyunid_csrf=([^;]+)/);
  return fallback?.[1] ? decodeURIComponent(fallback[1]) : '';
};

const getDefaultDateRange = () => {
  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - 30);

  const toInputDate = (d: Date) => d.toISOString().slice(0, 10);
  return { startDate: toInputDate(start), endDate: toInputDate(end) };
};

const toRangeTimestamp = (dateText: string, endOfDay: boolean): number => {
  const date = new Date(`${dateText}T00:00:00`);
  if (endOfDay) {
    date.setHours(23, 59, 59, 999);
  }
  return date.getTime();
};

const DEFAULT_LLM_CONFIGS: LlmConfig[] = [
  {
    provider: 'openai',
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    apiKey: '',
    enabled: false,
  },
  {
    provider: 'qwen',
    label: '通义千问（DashScope/OpenAI兼容）',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen-max',
    apiKey: '',
    enabled: false,
  },
  {
    provider: 'deepseek',
    label: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    apiKey: '',
    enabled: false,
  },
  {
    provider: 'zhipu',
    label: '智谱（GLM/OpenAI兼容）',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    model: 'glm-5.1',
    apiKey: '',
    enabled: false,
  },
  {
    provider: 'tokenplan',
    label: 'TokenPlan（OpenAI兼容）',
    baseUrl: '',
    model: '',
    apiKey: '',
    enabled: false,
  },
  {
    provider: 'custom',
    label: '自定义 OpenAI 兼容',
    baseUrl: '',
    model: '',
    apiKey: '',
    enabled: false,
  },
];

const DEFAULT_CLOUD_TOKEN_CONFIGS: CloudTokenConfig[] = [
  {
    provider: 'aliyun',
    label: '阿里云',
    values: {
      csrfToken: '',
      cookie: '',
    },
  },
  {
    provider: 'tencent',
    label: '腾讯云',
    values: {
      secretId: '',
      secretKey: '',
      token: '',
    },
  },
  {
    provider: 'volcengine',
    label: '火山引擎',
    values: {
      accessKeyId: '',
      secretAccessKey: '',
      sessionToken: '',
    },
  },
  {
    provider: 'aws',
    label: 'AWS',
    values: {
      accessKeyId: '',
      secretAccessKey: '',
      sessionToken: '',
    },
  },
  {
    provider: 'cfm',
    label: 'CFM',
    values: {
      apiUrl: '',
      apiToken: '',
    },
  },
];

export function DashboardMain({ activeMenu, onOpenAsk }: DashboardMainProps) {
  const navigate = useNavigate();
  const [fundRows, setFundRows] = useState<FundFlowRow[]>([]);
  const [isInspecting, setIsInspecting] = useState(false);
  const [inspectMsg, setInspectMsg] = useState('');
  const [aliyunCookie, setAliyunCookie] = useState('');
  const [csrfToken, setCsrfToken] = useState('');
  const [inspectionHistory, setInspectionHistory] = useState<InspectionHistoryRow[]>([]);
  const [dateRange, setDateRange] = useState(getDefaultDateRange);
  const startDateInputRef = useRef<HTMLInputElement>(null);
  const endDateInputRef = useRef<HTMLInputElement>(null);
  const [workflowInput, setWorkflowInput] = useState('');
  const [agentMessages, setAgentMessages] = useState<AgentMessage[]>([
    {
      id: 'msg-init',
      role: 'agent',
      content:
        '我是财务巡检 Agent。你可以让我执行“巡检充值和转账流水”“分析异常交易”“生成巡检摘要”。',
      time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
    },
  ]);
  const [isAgentRunning, setIsAgentRunning] = useState(false);
  const [toolDrawerOpen, setToolDrawerOpen] = useState(false);
  const [llmConfigs, setLlmConfigs] = useState<LlmConfig[]>(DEFAULT_LLM_CONFIGS);
  const [llmSaveMsg, setLlmSaveMsg] = useState('');
  const [cloudTokenConfigs, setCloudTokenConfigs] = useState<CloudTokenConfig[]>(DEFAULT_CLOUD_TOKEN_CONFIGS);
  const [cloudTokenSaveMsg, setCloudTokenSaveMsg] = useState('');
  const [credentialImportText, setCredentialImportText] = useState('');
  const [credentialImportMsg, setCredentialImportMsg] = useState('');
  const [extensionInstallMsg, setExtensionInstallMsg] = useState('');
  const [connTestState, setConnTestState] = useState<
    Record<string, { running: boolean; result?: 'success' | 'failed'; message?: string }>
  >({});
  const [connectionLogs, setConnectionLogs] = useState<
    Array<{ id: string; time: string; platform: string; action: string; status: 'success' | 'failed'; message: string }>
  >([]);
  const [connModal, setConnModal] = useState<{
    open: boolean;
    platform: string;
    phase: 'running' | 'done';
    result?: 'success' | 'failed';
    message?: string;
    progress: number;
  }>({ open: false, platform: '', phase: 'running', progress: 0 });

  useEffect(() => {
    void (async () => {
      await migrateFromLocalStorageIfNeeded({
        fundRowsCacheKey: FUND_ROWS_CACHE_KEY,
        inspectionHistoryCacheKey: INSPECTION_HISTORY_CACHE_KEY,
        agentSessionCacheKey: AGENT_SESSION_CACHE_KEY,
        cloudTokenConfigCacheKey: CLOUD_TOKEN_CONFIG_CACHE_KEY,
        llmConfigCacheKey: LLM_CONFIG_CACHE_KEY,
      });

      try {
        const cachedAuth = localStorage.getItem(ALIYUN_AUTH_CACHE_KEY);
        if (cachedAuth) {
          const parsedAuth = JSON.parse(cachedAuth) as { csrfToken?: string; aliyunCookie?: string };
          if (parsedAuth.csrfToken) {
            setCsrfToken(parsedAuth.csrfToken);
          }
          if (parsedAuth.aliyunCookie) {
            setAliyunCookie(parsedAuth.aliyunCookie);
          }
        }
      } catch {
        // Ignore broken cache and continue without auto-filled auth.
      }

      try {
        const rows = (await loadFundFlowRows()) as FundFlowRow[];
        if (Array.isArray(rows) && rows.length) {
          setFundRows(rows);
        }
      } catch {
        // Ignore and keep empty state.
      }

      try {
        const history = await loadInspectionHistory();
        if (Array.isArray(history) && history.length) {
          setInspectionHistory(history as InspectionHistoryRow[]);
        }
      } catch {
        // Ignore broken cache and continue without history.
      }

      try {
        const messages = await loadAgentMessages('default');
        if (Array.isArray(messages) && messages.length > 0) {
          setAgentMessages(messages as AgentMessage[]);
        }
      } catch {
        // Ignore broken cache and continue with default welcome message.
      }

      try {
        const cachedCloudConfigs = await loadCloudTokenConfigs();
        if (cachedCloudConfigs && Array.isArray(cachedCloudConfigs)) {
          const merged = DEFAULT_CLOUD_TOKEN_CONFIGS.map((defaultCfg) => {
            const cached = cachedCloudConfigs.find((cfg) => cfg.provider === defaultCfg.provider);
            return cached
              ? {
                  ...defaultCfg,
                  ...cached,
                  values: { ...defaultCfg.values, ...cached.values },
                }
              : defaultCfg;
          });
          setCloudTokenConfigs(merged);
          const aliyunCfg = merged.find((cfg) => cfg.provider === 'aliyun');
          if (aliyunCfg) {
            setCsrfToken(aliyunCfg.values.csrfToken || '');
            setAliyunCookie(aliyunCfg.values.cookie || '');
          }
        } else if (csrfToken || aliyunCookie) {
          setCloudTokenConfigs((prev) =>
            prev.map((cfg) =>
              cfg.provider === 'aliyun'
                ? { ...cfg, values: { ...cfg.values, csrfToken: csrfToken || '', cookie: aliyunCookie || '' } }
                : cfg,
            ),
          );
        }
      } catch {
        // Ignore broken cache and keep defaults.
      }

      try {
        const cached = await loadLlmConfigs();
        if (cached && Array.isArray(cached)) {
          const merged = DEFAULT_LLM_CONFIGS.map((defaultCfg) => {
            const hit = cached.find((cfg) => cfg.provider === defaultCfg.provider);
            return hit ? { ...defaultCfg, ...hit } : defaultCfg;
          });
          setLlmConfigs(merged);
        }
      } catch {
        // Ignore broken cache and continue with default model settings.
      }

      try {
        const logs = await loadConnectionLogs(50);
        setConnectionLogs(logs);
      } catch {
        // ignore
      }
    })();
  }, []);

  useEffect(() => {
    void saveAgentMessages(agentMessages, 'default');
  }, [agentMessages]);

  const appendInspectionHistory = (row: Omit<InspectionHistoryRow, 'id' | 'inspectTime'>) => {
    const nextRow: InspectionHistoryRow = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      inspectTime: new Date().toLocaleString('zh-CN', { hour12: false }),
      ...row,
    };
    setInspectionHistory((prev) => {
      const next = [nextRow, ...prev].slice(0, 100);
      void dbAppendInspectionHistory({
        inspectTime: nextRow.inspectTime,
        status: nextRow.status,
        count: nextRow.count,
        message: nextRow.message,
      });
      return next;
    });
  };

  const appendAgentMessage = (role: AgentMessage['role'], content: string) => {
    const next: AgentMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      role,
      content,
      time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
    };
    setAgentMessages((prev) => [...prev, next]);
  };

  const appendAgentPlaceholder = () => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const next: AgentMessage = {
      id,
      role: 'agent',
      content: '',
      time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
    };
    setAgentMessages((prev) => [...prev, next]);
    return id;
  };

  const updateAgentMessageContent = (id: string, content: string) => {
    setAgentMessages((prev) => prev.map((msg) => (msg.id === id ? { ...msg, content } : msg)));
  };

  const updateLlmConfig = (provider: LlmProvider, patch: Partial<LlmConfig>) => {
    setLlmConfigs((prev) => prev.map((cfg) => (cfg.provider === provider ? { ...cfg, ...patch } : cfg)));
  };

  const handleSaveLlmConfigs = () => {
    void dbSaveLlmConfigs(llmConfigs);
    setLlmSaveMsg('模型配置已保存到本地数据库（IndexedDB）。');
  };

  const getActiveLlmConfig = (): LlmConfig | null => {
    const active = llmConfigs.find(
      (cfg) => cfg.enabled && cfg.apiKey.trim() && cfg.baseUrl.trim() && cfg.model.trim(),
    );
    if (active) {
      return active;
    }
    // Fallback: allow configured provider even if "enabled" was not checked.
    const configured = llmConfigs.find((cfg) => cfg.apiKey.trim() && cfg.baseUrl.trim() && cfg.model.trim());
    return configured || null;
  };

  const callConfiguredLlm = async (
    prompt: string,
    onChunk?: (chunk: string) => void,
  ): Promise<string> => {
    const cfg = getActiveLlmConfig();
    if (!cfg) {
      return '未配置可用模型。请先在“设置”中填写 Base URL、Model、API Key 并启用至少一个模型。';
    }

    const endpoint = `${cfg.baseUrl.replace(/\/$/, '')}/chat/completions`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.apiKey.trim()}`,
      },
      body: JSON.stringify({
        model: cfg.model.trim(),
        temperature: 0.2,
        stream: true,
        messages: [
          {
            role: 'system',
            content:
              '你是云财务与巡检 Agent。请用中文给出简洁、可执行的分析结论；优先指出风险、影响和下一步行动。',
          },
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`LLM 请求失败（${response.status}）`);
    }

    if (!response.body) {
      const payload = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      return payload.choices?.[0]?.message?.content?.trim() || '模型未返回文本内容。';
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let fullText = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line.startsWith('data:')) {
          continue;
        }
        const data = line.slice(5).trim();
        if (!data || data === '[DONE]') {
          continue;
        }
        try {
          const json = JSON.parse(data) as {
            choices?: Array<{
              delta?: { content?: string };
              message?: { content?: string };
            }>;
          };
          const token = json.choices?.[0]?.delta?.content ?? json.choices?.[0]?.message?.content ?? '';
          if (token) {
            fullText += token;
            onChunk?.(fullText);
          }
        } catch {
          // Ignore non-JSON stream fragments.
        }
      }
    }

    return fullText.trim() || '模型未返回文本内容。';
  };

  const updateCloudTokenValue = (provider: CloudProvider, key: string, value: string) => {
    setCloudTokenConfigs((prev) =>
      prev.map((cfg) =>
        cfg.provider === provider ? { ...cfg, values: { ...cfg.values, [key]: value } } : cfg,
      ),
    );
    if (provider === 'aliyun') {
      if (key === 'csrfToken') {
        setCsrfToken(value);
      }
      if (key === 'cookie') {
        setAliyunCookie(value);
      }
    }
  };

  const handleSaveCloudTokens = () => {
    void dbSaveCloudTokenConfigs(cloudTokenConfigs);
    const aliyunCfg = cloudTokenConfigs.find((cfg) => cfg.provider === 'aliyun');
    if (aliyunCfg) {
      localStorage.setItem(
        ALIYUN_AUTH_CACHE_KEY,
        JSON.stringify({
          csrfToken: (aliyunCfg.values.csrfToken || '').trim(),
          aliyunCookie: (aliyunCfg.values.cookie || '').trim(),
        }),
      );
      setCsrfToken(aliyunCfg.values.csrfToken || '');
      setAliyunCookie(aliyunCfg.values.cookie || '');
    }
    setCloudTokenSaveMsg('多云与 CFM 接入凭据已保存到浏览器缓存。');
  };

  const patchProviderConfig = (provider: CloudProvider, values: Record<string, string>) => {
    setCloudTokenConfigs((prev) =>
      prev.map((cfg) =>
        cfg.provider === provider
          ? {
              ...cfg,
              values: { ...cfg.values, ...values },
            }
          : cfg,
      ),
    );
  };

  const handleImportCredentials = () => {
    const raw = credentialImportText.trim();
    if (!raw) {
      setCredentialImportMsg('请先粘贴扩展复制的 JSON 内容。');
      return;
    }

    try {
      const payload = JSON.parse(raw) as Record<string, unknown>;
      let importedCount = 0;

      if (payload.aliyun && typeof payload.aliyun === 'object') {
        const aliyun = payload.aliyun as Record<string, unknown>;
        patchProviderConfig('aliyun', {
          csrfToken: String(aliyun.csrfToken || aliyun.token || ''),
          cookie: String(aliyun.cookie || ''),
        });
        importedCount += 1;
      }

      if (payload.cfm && typeof payload.cfm === 'object') {
        const cfm = payload.cfm as Record<string, unknown>;
        patchProviderConfig('cfm', {
          apiUrl: String(cfm.apiUrl || ''),
          apiToken: String(cfm.authorization || cfm.token || cfm.csrfToken || ''),
        });
        importedCount += 1;
      }

      if (importedCount === 0 && payload.provider) {
        const provider = String(payload.provider) as CloudProvider;
        if (provider === 'aliyun') {
          patchProviderConfig('aliyun', {
            csrfToken: String(payload.csrfToken || payload.token || ''),
            cookie: String(payload.cookie || ''),
          });
          importedCount += 1;
        } else if (provider === 'cfm') {
          patchProviderConfig('cfm', {
            apiUrl: String(payload.apiUrl || ''),
            apiToken: String(payload.authorization || payload.token || payload.csrfToken || ''),
          });
          importedCount += 1;
        }
      }

      if (importedCount === 0) {
        setCredentialImportMsg('未识别到可导入的阿里云或 CFM 凭据，请检查粘贴内容。');
        return;
      }

      setCredentialImportMsg(`导入成功：已回填 ${importedCount} 项凭据，请点击“保存接入凭据”。`);
      setCredentialImportText('');
    } catch {
      setCredentialImportMsg('JSON 解析失败，请确认粘贴的是扩展复制的完整内容。');
    }
  };

  const handleOpenExtensionInstall = async () => {
    const nextWindow = window.open(EXTENSION_INSTALL_URL, '_blank');
    if (nextWindow) {
      setExtensionInstallMsg('');
      return;
    }
    try {
      await navigator.clipboard.writeText(EXTENSION_INSTALL_URL);
      setExtensionInstallMsg('浏览器限制了自动打开，已复制安装地址，请粘贴到地址栏打开。');
    } catch {
      setExtensionInstallMsg('浏览器限制了自动打开，请在地址栏手动输入 chrome://extensions/');
    }
  };

  const runConnectionTest = async (platform: 'CFM' | '阿里云' | '腾讯云' | 'AWS', ok: boolean, reason: string) => {
    setConnTestState((prev) => ({ ...prev, [platform]: { running: true } }));
    setConnModal({ open: true, platform, phase: 'running', progress: 0 });

    let progress = 0;
    const timer = window.setInterval(() => {
      progress = Math.min(92, progress + Math.max(2, Math.round((92 - progress) * 0.18)));
      setConnModal((prev) => (prev.open && prev.phase === 'running' ? { ...prev, progress } : prev));
    }, 90);

    await new Promise((r) => setTimeout(r, 900));

    const status: 'success' | 'failed' = ok ? 'success' : 'failed';
    const msg = ok ? '连接测试成功' : `连接测试失败：${reason}`;
    setConnTestState((prev) => ({ ...prev, [platform]: { running: false, result: status, message: msg } }));
    window.clearInterval(timer);
    setConnModal({ open: true, platform, phase: 'done', result: status, message: msg, progress: 100 });

    const now = new Date().toLocaleString('zh-CN', { hour12: false });
    void appendConnectionLog({
      time: now,
      platform,
      action: '测试连接',
      status,
      message: msg,
    });
    try {
      const logs = await loadConnectionLogs(50);
      setConnectionLogs(logs);
    } catch {
      // ignore
    }

    window.setTimeout(() => {
      setConnModal((prev) => (prev.open ? { ...prev, open: false } : prev));
    }, 900);
  };

  const runFundInspection = async (): Promise<{ message: string; count: number }> => {
      const effectiveCsrfToken = (csrfToken || extractCsrfTokenFromCookie(aliyunCookie)).trim();
      if (!effectiveCsrfToken) {
        throw new Error('未检测到 CSRF Token，请填写 CSRF Token，或在 Cookie 中包含 c_csrf_token');
      }
      if (!csrfToken && effectiveCsrfToken) {
        setCsrfToken(effectiveCsrfToken);
      }

      const requestUrl = `/api/aliyun/api/income/queryFundFlow.json?_bx-v=2.5.36&sec_token=${encodeURIComponent(
        effectiveCsrfToken,
      )}`;
      const startTime = toRangeTimestamp(dateRange.startDate, false);
      const endTime = toRangeTimestamp(dateRange.endDate, true);

      if (Number.isNaN(startTime) || Number.isNaN(endTime)) {
        throw new Error('日期格式无效，请重新选择开始和结束日期');
      }
      if (startTime > endTime) {
        throw new Error('开始日期不能晚于结束日期');
      }

      const response = await fetch(
        requestUrl,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            accept: 'application/json, text/plain, */*',
            'content-type': 'application/json',
            'x-aliyun-cookie': aliyunCookie,
            'x-aliyun-csrf-token': effectiveCsrfToken,
          },
          body: JSON.stringify({
            currentPage: 1,
            pageSize: 20,
            resourceUserId: '1881210321910167',
            startTime,
            endTime,
            tradeTypeList: ['CHARGE', 'TRANSFER'],
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`请求失败（${response.status}）`);
      }

      const payload = (await response.json()) as AliyunFundFlowResponse;
      const dataBlock = payload.data;
      const rows = Array.isArray(dataBlock)
        ? dataBlock
        : dataBlock?.list || dataBlock?.result || payload.list || [];
      if (!rows.length) {
        setFundRows([]);
        localStorage.setItem(FUND_ROWS_CACHE_KEY, JSON.stringify([]));
        void dbSaveFundFlowRows([]);
        return { message: '巡检完成：未获取到交易流水。', count: 0 };
      }

      const normalizedRows = normalizeFundFlowRows(rows);
      setFundRows(normalizedRows);
      localStorage.setItem(FUND_ROWS_CACHE_KEY, JSON.stringify(normalizedRows));
      void dbSaveFundFlowRows(normalizedRows as unknown[]);
      return { message: `巡检完成：已更新 ${rows.length} 条交易记录。`, count: rows.length };
  };

  const handleInspect = async () => {
    setIsInspecting(true);
    setInspectMsg('');
    try {
      const result = await runFundInspection();
      setInspectMsg(result.message);
      appendInspectionHistory({
        status: 'success',
        count: result.count,
        message: result.message,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误';
      setInspectMsg(`巡检失败：${message}`);
      appendInspectionHistory({
        status: 'failed',
        count: 0,
        message: `巡检失败：${message}`,
      });
    } finally {
      setIsInspecting(false);
    }
  };

  const handleWorkflowRun = async (overridePrompt?: string) => {
    const prompt = (overridePrompt ?? workflowInput).trim();
    if (!prompt || isAgentRunning) {
      return;
    }

    appendAgentMessage('user', prompt);
    setWorkflowInput('');
    setIsAgentRunning(true);

    try {
      const lowerPrompt = prompt.toLowerCase();
      const shouldInspect =
        lowerPrompt.includes('巡检') ||
        lowerPrompt.includes('流水') ||
        lowerPrompt.includes('充值') ||
        lowerPrompt.includes('转账');

      const replyId = appendAgentPlaceholder();

      if (shouldInspect) {
        const result = await runFundInspection();
        appendInspectionHistory({
          status: 'success',
          count: result.count,
          message: `[Agent触发] ${result.message}`,
        });
        const llmSummary = await callConfiguredLlm(
          `用户请求：${prompt}\n巡检结果：${result.message}\n返回条数：${result.count}\n请给出3点内的风险判断和下一步建议。`,
          (partial) =>
            updateAgentMessageContent(
              replyId,
              `${result.message}\n\n已调用工具：queryFundFlow\n日期范围：${dateRange.startDate} 至 ${dateRange.endDate}\n\nLLM分析：\n${partial}`,
            ),
        );
        updateAgentMessageContent(
          replyId,
          `${result.message}\n\n已调用工具：queryFundFlow\n日期范围：${dateRange.startDate} 至 ${dateRange.endDate}\n\nLLM分析：\n${llmSummary}`,
        );
      } else {
        const llmReply = await callConfiguredLlm(prompt, (partial) => updateAgentMessageContent(replyId, partial));
        updateAgentMessageContent(replyId, llmReply);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误';
      appendInspectionHistory({
        status: 'failed',
        count: 0,
        message: `[Agent触发] 巡检失败：${message}`,
      });
      appendAgentMessage('agent', `执行失败：${message}`);
    } finally {
      setIsAgentRunning(false);
    }
  };

  if (activeMenu === 'workflow') {
    const bubbleItems = agentMessages.map((msg) => ({
      key: msg.id,
      role: msg.role === 'user' ? 'user' : 'ai',
      content: msg.content || (msg.role === 'agent' ? '正在思考...' : ''),
      header: <div className="text-[10px] text-[#A1A1AA]">{msg.time}</div>,
      streaming: msg.role === 'agent' && isAgentRunning && !msg.content,
      loading: msg.role === 'agent' && isAgentRunning && !msg.content,
      variant: 'borderless' as const,
    }));

    return (
      <div className="flex-1 overflow-hidden p-4 md:p-8">
        <div className="glass-panel relative h-[calc(100vh-7.5rem)] overflow-hidden rounded-xl p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Bot size={16} className="text-blue-300" />
              <h3 className="text-sm font-semibold tracking-tight">Agent 交互中枢</h3>
            </div>
            <button
              type="button"
              onClick={() => setToolDrawerOpen((v) => !v)}
              className="flex items-center gap-1 rounded border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-[#D4D4D8] transition-colors hover:bg-white/10"
            >
              <Wrench size={13} />
              工具能力
              <PanelRight size={13} />
            </button>
          </div>

          <div className="flex h-[calc(100%-2.25rem)] flex-col">
            <div className="mb-4 flex-1 overflow-hidden rounded-lg border border-white/5 bg-[#111318] p-3">
              <div className="flex h-full flex-col">
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <Bubble.List
                    items={bubbleItems}
                    autoScroll
                    role={{
                      user: {
                        placement: 'end',
                      },
                      ai: {
                        placement: 'start',
                      },
                    }}
                  />
                </div>
              </div>
            </div>

            <Sender
              value={workflowInput}
              onChange={(val) => setWorkflowInput(val)}
              loading={isAgentRunning}
              placeholder="给 Agent 下达任务，例如：巡检最近30天充值和转账流水并给出异常摘要"
              onSubmit={(val) => {
                void handleWorkflowRun(val);
              }}
            />
          </div>

          <aside
            className={`absolute inset-y-0 right-0 z-20 w-[360px] border-l border-white/10 bg-[#0f1422] p-5 transition-transform duration-200 ${
              toolDrawerOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold tracking-tight">工具能力</h3>
              <button
                type="button"
                onClick={() => setToolDrawerOpen(false)}
                className="rounded p-1 text-[#A1A1AA] transition-colors hover:bg-white/10 hover:text-white"
              >
                <X size={14} />
              </button>
            </div>
            <div className="space-y-3 text-xs text-[#A1A1AA]">
              <div className="rounded border border-white/10 bg-[#111318] p-3">
                <p className="mb-1 font-medium text-white">queryFundFlow</p>
                <p>用途：按日期范围拉取充值与转账流水</p>
              </div>
              <div className="rounded border border-white/10 bg-[#111318] p-3">
                <p className="mb-1 font-medium text-white">执行历史联动</p>
                <p>Agent 触发巡检后，自动写入“执行历史”列表</p>
              </div>
              <p className="pt-2 text-[11px] text-zinc-400">
                当前先接入了阿里云资金流水工具，后续可继续接预算分析、飞书通知、工单系统等。
              </p>
            </div>
          </aside>
        </div>
      </div>
    );
  }

  if (activeMenu === 'model-config') {
    return (
      <div className="flex-1 space-y-6 overflow-y-auto p-4 md:p-8">
        <div className="glass-panel rounded-xl p-6">
          <h2 className="mb-2 text-lg font-semibold tracking-tight text-white">模型与 Agent 设置</h2>
          <p className="text-xs text-[#A1A1AA]">
            支持 OpenAI 兼容协议。启用某个模型后，工作流编排会优先调用该模型进行分析与回复。
          </p>
        </div>

        <div className="space-y-4">
          {llmConfigs.map((cfg) => (
            <div key={cfg.provider} className="glass-panel rounded-xl p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">{cfg.label}</h3>
                <label className="flex items-center gap-2 text-xs text-[#A1A1AA]">
                  <input
                    type="checkbox"
                    checked={cfg.enabled}
                    onChange={(e) => updateLlmConfig(cfg.provider, { enabled: e.target.checked })}
                  />
                  启用
                </label>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <input
                  type="text"
                  value={cfg.baseUrl}
                  onChange={(e) => updateLlmConfig(cfg.provider, { baseUrl: e.target.value })}
                  placeholder="Base URL（例如 https://api.openai.com/v1）"
                  className="rounded border border-white/10 bg-[#111318] px-3 py-2 text-xs text-white outline-none placeholder:text-zinc-500 focus:border-white/20"
                />
                <input
                  type="text"
                  value={cfg.model}
                  onChange={(e) => updateLlmConfig(cfg.provider, { model: e.target.value })}
                  placeholder="Model（例如 gpt-4o-mini）"
                  className="rounded border border-white/10 bg-[#111318] px-3 py-2 text-xs text-white outline-none placeholder:text-zinc-500 focus:border-white/20"
                />
                <input
                  type="password"
                  value={cfg.apiKey}
                  onChange={(e) => updateLlmConfig(cfg.provider, { apiKey: e.target.value })}
                  placeholder="API Key（只填原始 Token，不要加 Bearer）"
                  className="md:col-span-2 rounded border border-white/10 bg-[#111318] px-3 py-2 text-xs text-white outline-none placeholder:text-zinc-500 focus:border-white/20"
                />
              </div>
              {cfg.provider === 'tokenplan' && (
                <p className="mt-3 text-[11px] text-amber-300">
                  TokenPlan 格式说明：API Key 输入原始 token（示例 `tp_xxx` 或平台分配值），不要手动加 `Bearer ` 前缀；
                  Base URL 请填写 TokenPlan 提供的 OpenAI 兼容地址（通常以 `/v1` 结尾）。
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="glass-panel rounded-xl p-5">
          <button
            type="button"
            onClick={handleSaveLlmConfigs}
            className="rounded bg-white px-4 py-2 text-xs font-semibold tracking-wide text-black transition-colors hover:bg-zinc-200"
          >
            保存模型配置
          </button>
          {llmSaveMsg && <p className="mt-2 text-xs text-emerald-300">{llmSaveMsg}</p>}
        </div>
      </div>
    );
  }

  const renderCredentialManager = () => (
    <div className="flex-1 space-y-6 overflow-y-auto p-4 md:p-8">
      <div className="glass-panel rounded-xl p-6">
        <h2 className="mb-2 text-lg font-semibold tracking-tight text-white">凭证管理</h2>
        <p className="text-xs text-[#A1A1AA]">
          统一管理多云与 CFM 的访问凭据。数据仅保存在当前浏览器本地缓存（IndexedDB），不会上传到服务器。
        </p>
      </div>

      <div className="glass-panel rounded-xl p-6">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-base font-semibold tracking-tight text-white">插件下载与安装</h3>
            <p className="mt-1 text-xs text-[#A1A1AA]">
              运营同学可先下载插件包，再按安装指引完成「阿里云 + CFM」凭据一键采集。
            </p>
          </div>
          <div className="flex gap-2">
            <a
              href={EXTENSION_REPO_ZIP_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded bg-white px-3 py-2 text-xs font-semibold text-black transition-colors hover:bg-zinc-200"
            >
              下载插件压缩包（zip）
              <ArrowUpRight size={14} />
            </a>
            <button
              type="button"
              onClick={handleOpenExtensionInstall}
              className="inline-flex items-center gap-1 rounded border border-white/20 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/10"
            >
              安装地址
              <ArrowUpRight size={14} />
            </button>
          </div>
        </div>
        <div className="rounded border border-white/10 bg-[#111318] p-3 text-xs text-[#A1A1AA]">
          <p>快速安装：下载插件 zip 后先解压，进入 `dual-credential-capture-extension` 文件夹。</p>
          <p className="mt-1">打开 `chrome://extensions` 开启开发者模式，点击“加载已解压的扩展程序”并选择该文件夹。</p>
          {extensionInstallMsg && <p className="mt-2 text-amber-300">{extensionInstallMsg}</p>}
        </div>
      </div>

      <div className="space-y-4">
        <div className="glass-panel rounded-xl p-5">
          <h3 className="mb-2 text-sm font-semibold text-white">一键导入（扩展复制内容）</h3>
          <p className="mb-3 text-xs text-[#A1A1AA]">
            在扩展里点击“复制 CFM 凭据”或“复制合并 JSON”，粘贴到这里即可自动解析并回填。
          </p>
          <textarea
            value={credentialImportText}
            onChange={(e) => setCredentialImportText(e.target.value)}
            rows={6}
            placeholder="粘贴扩展复制的 JSON..."
            className="w-full rounded border border-white/10 bg-[#111318] px-3 py-2 text-xs text-white outline-none placeholder:text-zinc-500 focus:border-white/20"
          />
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={handleImportCredentials}
              className="rounded bg-white px-4 py-2 text-xs font-semibold tracking-wide text-black transition-colors hover:bg-zinc-200"
            >
              解析并回填
            </button>
            {credentialImportMsg && <p className="text-xs text-emerald-300">{credentialImportMsg}</p>}
          </div>
        </div>

        {cloudTokenConfigs.map((cfg) => (
          <div key={cfg.provider} className="glass-panel rounded-xl p-5">
            <h3 className="mb-3 text-sm font-semibold text-white">{cfg.label}</h3>

            {cfg.provider === 'aliyun' && (
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs text-[#A1A1AA]">CSRF Token</label>
                  <input
                    type="text"
                    value={cfg.values.csrfToken || ''}
                    onChange={(e) => updateCloudTokenValue('aliyun', 'csrfToken', e.target.value)}
                    placeholder="粘贴 x-csrf-token，例如 0gaOAqmo"
                    className="w-full rounded border border-white/10 bg-[#111318] px-3 py-2 text-xs text-white outline-none placeholder:text-zinc-500 focus:border-white/20"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[#A1A1AA]">Cookie</label>
                  <textarea
                    value={cfg.values.cookie || ''}
                    onChange={(e) => updateCloudTokenValue('aliyun', 'cookie', e.target.value)}
                    placeholder="粘贴完整 Cookie（不要包含 -b 前缀）"
                    rows={5}
                    className="w-full rounded border border-white/10 bg-[#111318] px-3 py-2 text-xs text-white outline-none placeholder:text-zinc-500 focus:border-white/20"
                  />
                </div>
              </div>
            )}

            {cfg.provider === 'tencent' && (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <input
                  type="text"
                  value={cfg.values.secretId || ''}
                  onChange={(e) => updateCloudTokenValue('tencent', 'secretId', e.target.value)}
                  placeholder="SecretId"
                  className="rounded border border-white/10 bg-[#111318] px-3 py-2 text-xs text-white outline-none placeholder:text-zinc-500 focus:border-white/20"
                />
                <input
                  type="password"
                  value={cfg.values.secretKey || ''}
                  onChange={(e) => updateCloudTokenValue('tencent', 'secretKey', e.target.value)}
                  placeholder="SecretKey"
                  className="rounded border border-white/10 bg-[#111318] px-3 py-2 text-xs text-white outline-none placeholder:text-zinc-500 focus:border-white/20"
                />
                <input
                  type="text"
                  value={cfg.values.token || ''}
                  onChange={(e) => updateCloudTokenValue('tencent', 'token', e.target.value)}
                  placeholder="临时 Token（可选）"
                  className="md:col-span-2 rounded border border-white/10 bg-[#111318] px-3 py-2 text-xs text-white outline-none placeholder:text-zinc-500 focus:border-white/20"
                />
              </div>
            )}

            {cfg.provider === 'volcengine' && (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <input
                  type="text"
                  value={cfg.values.accessKeyId || ''}
                  onChange={(e) => updateCloudTokenValue('volcengine', 'accessKeyId', e.target.value)}
                  placeholder="AccessKey ID"
                  className="rounded border border-white/10 bg-[#111318] px-3 py-2 text-xs text-white outline-none placeholder:text-zinc-500 focus:border-white/20"
                />
                <input
                  type="password"
                  value={cfg.values.secretAccessKey || ''}
                  onChange={(e) => updateCloudTokenValue('volcengine', 'secretAccessKey', e.target.value)}
                  placeholder="Secret AccessKey"
                  className="rounded border border-white/10 bg-[#111318] px-3 py-2 text-xs text-white outline-none placeholder:text-zinc-500 focus:border-white/20"
                />
                <input
                  type="text"
                  value={cfg.values.sessionToken || ''}
                  onChange={(e) => updateCloudTokenValue('volcengine', 'sessionToken', e.target.value)}
                  placeholder="SessionToken（可选）"
                  className="md:col-span-2 rounded border border-white/10 bg-[#111318] px-3 py-2 text-xs text-white outline-none placeholder:text-zinc-500 focus:border-white/20"
                />
              </div>
            )}

            {cfg.provider === 'aws' && (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <input
                  type="text"
                  value={cfg.values.accessKeyId || ''}
                  onChange={(e) => updateCloudTokenValue('aws', 'accessKeyId', e.target.value)}
                  placeholder="AWS Access Key ID"
                  className="rounded border border-white/10 bg-[#111318] px-3 py-2 text-xs text-white outline-none placeholder:text-zinc-500 focus:border-white/20"
                />
                <input
                  type="password"
                  value={cfg.values.secretAccessKey || ''}
                  onChange={(e) => updateCloudTokenValue('aws', 'secretAccessKey', e.target.value)}
                  placeholder="AWS Secret Access Key"
                  className="rounded border border-white/10 bg-[#111318] px-3 py-2 text-xs text-white outline-none placeholder:text-zinc-500 focus:border-white/20"
                />
                <input
                  type="text"
                  value={cfg.values.sessionToken || ''}
                  onChange={(e) => updateCloudTokenValue('aws', 'sessionToken', e.target.value)}
                  placeholder="AWS Session Token（可选）"
                  className="md:col-span-2 rounded border border-white/10 bg-[#111318] px-3 py-2 text-xs text-white outline-none placeholder:text-zinc-500 focus:border-white/20"
                />
              </div>
            )}

            {cfg.provider === 'cfm' && (
              <div className="grid grid-cols-1 gap-3">
                <input
                  type="text"
                  value={cfg.values.apiUrl || ''}
                  onChange={(e) => updateCloudTokenValue('cfm', 'apiUrl', e.target.value)}
                  placeholder="CFM API URL（例如 https://apiadmin.cycor.io/api/v1）"
                  className="rounded border border-white/10 bg-[#111318] px-3 py-2 text-xs text-white outline-none placeholder:text-zinc-500 focus:border-white/20"
                />
                <input
                  type="password"
                  value={cfg.values.apiToken || ''}
                  onChange={(e) => updateCloudTokenValue('cfm', 'apiToken', e.target.value)}
                  placeholder="CFM Token"
                  className="rounded border border-white/10 bg-[#111318] px-3 py-2 text-xs text-white outline-none placeholder:text-zinc-500 focus:border-white/20"
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="glass-panel rounded-xl p-5">
        <button
          type="button"
          onClick={handleSaveCloudTokens}
          className="rounded bg-white px-4 py-2 text-xs font-semibold tracking-wide text-black transition-colors hover:bg-zinc-200"
        >
          保存接入凭据
        </button>
        {cloudTokenSaveMsg && <p className="mt-2 text-xs text-emerald-300">{cloudTokenSaveMsg}</p>}
      </div>
    </div>
  );

  if (activeMenu === 'token-config' || activeMenu === 'platform-credentials') {
    return (
      renderCredentialManager()
    );
  }

  if (activeMenu === 'platform-overview') {
    const getCfg = (provider: CloudProvider) => cloudTokenConfigs.find((c) => c.provider === provider);
    const hasCfm = Boolean(getCfg('cfm')?.values.apiUrl?.trim() && getCfg('cfm')?.values.apiToken?.trim());
    const hasAliyun = Boolean(getCfg('aliyun')?.values.csrfToken?.trim() && getCfg('aliyun')?.values.cookie?.trim());
    const hasTencent = Boolean(getCfg('tencent')?.values.secretId?.trim() && getCfg('tencent')?.values.secretKey?.trim());
    const hasAws = Boolean(getCfg('aws')?.values.accessKeyId?.trim() && getCfg('aws')?.values.secretAccessKey?.trim());

    const connectedCount = [hasCfm, hasAliyun, hasTencent, hasAws].filter(Boolean).length;

    const platforms: Array<{
      key: string;
      name: string;
      status: PlatformStatus;
      systemType: string;
      accountText: string;
      toolCount: number;
      lastCall: string;
      capabilities: string[];
      actions: Array<{ label: string; primary?: boolean }>;
      onTest?: () => void;
    }> = [
      {
        key: 'cfm',
        name: 'CFM 多云财务',
        status: hasCfm ? 'live' : 'setup',
        systemType: '内部多云财务平台',
        accountText: '38 个云账号',
        toolCount: 5,
        lastCall: '3 分钟前',
        capabilities: ['客户费用查询', '云账号映射', '多云账单汇总', '客户成本分析', '录入前后账单差异核查'],
        actions: [
          { label: '测试连接', primary: true },
          { label: '查看工具' },
          { label: '配置凭证' },
        ],
        onTest: () => runConnectionTest('CFM', hasCfm, hasCfm ? '' : '未配置 API URL 或 Token'),
      },
      {
        key: 'aliyun',
        name: '阿里云',
        status: hasAliyun ? 'live' : 'setup',
        systemType: '云厂商账单平台',
        accountText: '6 个 RAM 账号',
        toolCount: 6,
        lastCall: '8 分钟前',
        capabilities: ['资金流水查询', '充值记录查询', '转账记录查询', '账单明细查询', '异常消费检测'],
        actions: [
          { label: '测试连接', primary: true },
          { label: '查看工具' },
          { label: '配置凭证' },
        ],
        onTest: () => runConnectionTest('阿里云', hasAliyun, hasAliyun ? '' : '未配置 CSRF Token 或 Cookie'),
      },
      {
        key: 'tencent',
        name: '腾讯云',
        status: hasTencent ? 'live' : 'setup',
        systemType: '云厂商账单平台',
        accountText: '0',
        toolCount: 4,
        lastCall: '暂无',
        capabilities: ['账单总览', '产品费用明细', '项目费用统计', '异常增长检测'],
        actions: [{ label: '配置凭证', primary: true }, { label: '启用 Mock' }],
        onTest: () => runConnectionTest('腾讯云', hasTencent, hasTencent ? '' : '未配置 SecretId 或 SecretKey'),
      },
      {
        key: 'aws',
        name: 'AWS',
        status: hasAws ? 'live' : 'mock',
        systemType: '国际云成本平台',
        accountText: '3 个 Linked Account',
        toolCount: 4,
        lastCall: '12 分钟前',
        capabilities: ['Cost Explorer 查询', 'Service Cost Breakdown', 'Linked Account Cost', 'Budget Review'],
        actions: [{ label: '查看 Mock 数据', primary: true }, { label: '配置凭证' }],
        onTest: () => runConnectionTest('AWS', hasAws, hasAws ? '' : '当前为 Mock 或未配置 AccessKey'),
      },
    ];

    return (
      <div className="flex-1 space-y-6 overflow-y-auto p-4 md:p-8">
        <div className="glass-panel rounded-xl p-6">
          <h2 className="mb-2 text-lg font-semibold tracking-tight text-white">平台连接总览</h2>
          <p className="text-xs text-[#A1A1AA]">查看 Agent 已接入的平台、可用工具、连接状态与最近调用情况。</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard title="已连接平台" value={`${connectedCount}`} icon={<Cloud size={18} />} subtext={<>LIVE</>} />
          <StatCard title="云账号数量" value="42" icon={<Cpu size={18} />} subtext={<>跨平台</>} />
          <StatCard title="最近同步" value="5 分钟前" icon={<Clock size={18} />} subtext={<>连接器</>} />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {platforms.map((p) => {
            const statusMeta = platformStatusBadge[p.status];
            const testState = connTestState[p.name.startsWith('CFM') ? 'CFM' : p.name] || { running: false };
            return (
              <div key={p.key} className="glass-panel rounded-xl p-6">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-white">{p.name}</h3>
                      <Badge status={statusMeta.badge}>{statusMeta.label}</Badge>
                      <span className="text-xs text-[#A1A1AA]">{platformStatusText[p.status]}</span>
                    </div>
                    <p className="mt-1 text-xs text-[#A1A1AA]">{p.systemType}</p>
                  </div>
                  <div className="flex gap-2">
                    {p.actions.map((a) => (
                      <button
                        key={a.label}
                        type="button"
                        onClick={() => {
                          if (a.label === '测试连接') {
                            p.onTest?.();
                            return;
                          }
                          if (a.label === '配置凭证') {
                            navigate('/platform-connections/credentials');
                          }
                          if (a.label === '查看工具') {
                            if (p.key === 'cfm') navigate('/platform-connections/cfm');
                            if (p.key === 'aliyun') navigate('/platform-connections/aliyun');
                            if (p.key === 'tencent') navigate('/platform-connections/tencent');
                            if (p.key === 'aws') navigate('/platform-connections/aws');
                          }
                        }}
                        disabled={a.label === '测试连接' && testState.running}
                        className={
                          a.primary
                            ? `rounded bg-white px-3 py-2 text-xs font-semibold text-black hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60`
                            : `rounded border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60`
                        }
                      >
                        {a.label === '测试连接' && testState.running ? '测试中...' : a.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs text-[#A1A1AA] md:grid-cols-4">
                  <div>
                    <div className="text-[10px] text-[#71717A]">账号数量</div>
                    <div className="mt-1 text-white/90">{p.accountText}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#71717A]">可用工具</div>
                    <div className="mt-1 font-mono text-white/90">{p.toolCount}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#71717A]">最近调用</div>
                    <div className="mt-1 text-white/90">{p.lastCall}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#71717A]">状态</div>
                    <div className="mt-1 text-white/90">{platformStatusText[p.status]}</div>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="mb-2 text-[10px] font-semibold tracking-wide text-[#A1A1AA]">主要能力</div>
                  <div className="flex flex-wrap gap-2">
                    {p.capabilities.map((c) => (
                      <span
                        key={c}
                        className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-[#D4D4D8]"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {connModal.open && (
          <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="pointer-events-auto w-full max-w-sm rounded-xl border border-white/10 bg-[#0f1422] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-white">测试连接</div>
                  <div className="mt-1 text-xs text-[#A1A1AA]">{connModal.platform}</div>
                </div>
                {connModal.phase === 'done' && (
                  <Badge status={connModal.result === 'success' ? 'success' : 'danger'}>
                    {connModal.result === 'success' ? 'SUCCESS' : 'ERROR'}
                  </Badge>
                )}
              </div>

              <div className="mt-4">
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className={`h-full transition-all duration-300 ${
                      connModal.phase === 'done'
                        ? connModal.result === 'success'
                          ? 'bg-emerald-400'
                          : 'bg-red-400'
                        : 'bg-blue-400'
                    }`}
                    style={{ width: `${connModal.progress}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-[#A1A1AA]">
                  <span>{connModal.phase === 'running' ? '正在建立连接…' : connModal.message}</span>
                  <span className="font-mono">{connModal.progress}%</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (activeMenu === 'platform-cfm') {
    const cfmCfg = cloudTokenConfigs.find((c) => c.provider === 'cfm');
    const cfmConfigured = Boolean(cfmCfg?.values.apiUrl?.trim() && cfmCfg?.values.apiToken?.trim());
    const cfmStatus: PlatformStatus = cfmConfigured ? 'live' : 'setup';
    const toolRows = [
      { name: '客户费用查询', desc: '按客户维度查询多云费用趋势和费用结构。', perm: 'read:cost', last: '3 分钟前', status: 'LIVE' },
      { name: '云账号映射', desc: '维护客户、云厂商、云账号之间的归属关系。', perm: 'write:mapping', last: '1 小时前', status: 'LIVE' },
      { name: '多云账单汇总', desc: '聚合阿里云、腾讯云、AWS 等平台账单数据。', perm: 'read:bill', last: '8 分钟前', status: 'LIVE' },
      { name: '账单差异核查', desc: '对比云厂商原始账单与 CFM 录入后的费用差异。', perm: 'read:diff', last: '昨天', status: 'LIVE' },
      { name: '成本分析报告', desc: '生成客户月报、运营巡检报告和费用波动归因报告。', perm: 'read:report', last: '12 分钟前', status: 'LIVE' },
    ];

    const capabilities = [
      { title: '客户费用查询', desc: '按客户维度查询多云费用趋势和费用结构。' },
      { title: '云账号映射', desc: '维护客户、云厂商、云账号之间的归属关系。' },
      { title: '多云账单汇总', desc: '聚合阿里云、腾讯云、AWS 等平台账单数据。' },
      { title: '账单差异核查', desc: '对比云厂商原始账单与 CFM 录入后的费用差异。' },
      { title: '成本分析报告', desc: '生成客户月报、运营巡检报告和费用波动归因报告。' },
    ];

    return (
      <div className="flex-1 space-y-6 overflow-y-auto p-4 md:p-8">
        <div className="glass-panel rounded-xl p-6">
          <div className="mb-2 flex items-center gap-2">
            <h2 className="text-lg font-semibold tracking-tight text-white">CFM 多云财务</h2>
            <Badge status={platformStatusBadge[cfmStatus].badge}>{platformStatusBadge[cfmStatus].label}</Badge>
          </div>
          <p className="text-xs text-[#A1A1AA]">
            内部多云财务平台，作为客户、账号、云厂商费用映射的主数据源。
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/platform-connections/credentials')}
              className="rounded border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/10"
            >
              配置凭证
            </button>
            <button
              type="button"
              onClick={() => runConnectionTest('CFM', cfmConfigured, cfmConfigured ? '' : '未配置 API URL 或 Token')}
              disabled={connTestState.CFM?.running}
              className="rounded bg-white px-3 py-2 text-xs font-semibold text-black transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {connTestState.CFM?.running ? '测试中...' : '测试连接'}
            </button>
            <span className="text-xs text-[#A1A1AA]">
              {cfmConfigured ? `已读取凭证：${cfmCfg?.values.apiUrl || ''}` : '未检测到凭证，请先在“凭证管理”完成配置。'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard
            title="连接状态"
            value={cfmConfigured ? '已连接' : '未配置'}
            icon={<Cloud size={18} />}
            subtext={<>{platformStatusBadge[cfmStatus].label}</>}
          />
          <StatCard title="环境" value="tenant_demo_01" icon={<Cpu size={18} />} subtext={<>租户</>} />
          <StatCard title="客户数量" value="12" icon={<Activity size={18} />} subtext={<>主数据</>} />
          <StatCard title="云账号数量" value="38" icon={<Cloud size={18} />} subtext={<>映射</>} />
          <StatCard title="最近同步" value="2026-04-29 17:42" icon={<Clock size={18} />} subtext={<>2026-01 至 2026-04</>} />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {capabilities.map((c) => (
            <div key={c.title} className="glass-panel rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white">{c.title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-[#A1A1AA]">{c.desc}</p>
            </div>
          ))}
        </div>

        <div className="glass-panel overflow-hidden rounded-xl">
          <div className="border-b border-white/5 bg-[#171A20] px-5 py-4">
            <h3 className="text-sm font-semibold tracking-tight">可用工具</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left">
              <thead>
                <tr className="bg-white/[0.02]">
                  <th className="whitespace-nowrap px-5 py-3 text-[10px] font-semibold tracking-wide text-[#A1A1AA]">
                    工具名称
                  </th>
                  <th className="px-5 py-3 text-[10px] font-semibold tracking-wide text-[#A1A1AA]">说明</th>
                  <th className="whitespace-nowrap px-5 py-3 text-[10px] font-semibold tracking-wide text-[#A1A1AA]">
                    权限
                  </th>
                  <th className="whitespace-nowrap px-5 py-3 text-[10px] font-semibold tracking-wide text-[#A1A1AA]">
                    最近调用
                  </th>
                  <th className="whitespace-nowrap px-5 py-3 text-[10px] font-semibold tracking-wide text-[#A1A1AA]">
                    状态
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {toolRows.map((r) => (
                  <tr key={r.name} className="transition-colors hover:bg-white/[0.02]">
                    <td className="whitespace-nowrap px-5 py-3 text-xs text-white/90">{r.name}</td>
                    <td className="px-5 py-3 text-xs text-[#A1A1AA]">{r.desc}</td>
                    <td className="whitespace-nowrap px-5 py-3 font-mono text-xs text-[#A1A1AA]">{r.perm}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-xs text-[#A1A1AA]">{r.last}</td>
                    <td className="whitespace-nowrap px-5 py-3">
                      <Badge status="success">{r.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (activeMenu === 'platform-aliyun') {
    return (
      <div className="flex-1 space-y-6 overflow-y-auto p-4 md:p-8">
        <div className="glass-panel rounded-xl p-6">
          <div className="mb-2 flex items-center gap-2">
            <h2 className="text-lg font-semibold tracking-tight text-white">阿里云</h2>
            <Badge status={platformStatusBadge.live.badge}>{platformStatusBadge.live.label}</Badge>
          </div>
          <p className="text-xs text-[#A1A1AA]">云厂商账单平台，支持账单与资金类巡检工具。</p>
        </div>
        <div className="glass-panel rounded-xl p-6">
          <p className="text-xs text-[#A1A1AA]">
            已接入能力（Mock）：资金流水查询、充值/转账记录、账单明细、异常消费检测。后续会在此页补充工具表与连接测试。
          </p>
        </div>
      </div>
    );
  }

  if (activeMenu === 'platform-tencent') {
    return (
      <div className="flex-1 space-y-6 overflow-y-auto p-4 md:p-8">
        <div className="glass-panel rounded-xl p-6">
          <div className="mb-2 flex items-center gap-2">
            <h2 className="text-lg font-semibold tracking-tight text-white">腾讯云</h2>
            <Badge status={platformStatusBadge.setup.badge}>{platformStatusBadge.setup.label}</Badge>
          </div>
          <p className="text-xs text-[#A1A1AA]">云厂商账单平台，待配置凭证后开启账单与异常增长检测能力。</p>
        </div>
        <div className="glass-panel rounded-xl p-6">
          <p className="text-xs text-[#A1A1AA]">
            请到“凭证管理”配置 SecretId/SecretKey。配置完成后将展示：账单总览、产品费用明细、项目费用统计、异常增长检测等工具。
          </p>
        </div>
      </div>
    );
  }

  if (activeMenu === 'platform-aws') {
    return (
      <div className="flex-1 space-y-6 overflow-y-auto p-4 md:p-8">
        <div className="glass-panel rounded-xl p-6">
          <div className="mb-2 flex items-center gap-2">
            <h2 className="text-lg font-semibold tracking-tight text-white">AWS</h2>
            <Badge status={platformStatusBadge.mock.badge}>{platformStatusBadge.mock.label}</Badge>
          </div>
          <p className="text-xs text-[#A1A1AA]">国际云成本平台，当前为 Mock 接入，后续可切换为真实 Cost Explorer。</p>
        </div>
        <div className="glass-panel rounded-xl p-6">
          <p className="text-xs text-[#A1A1AA]">
            Mock 能力：Cost Explorer 查询、Service Cost Breakdown、Linked Account Cost、Budget Review。后续会补充 mock 数据浏览与真实连接测试。
          </p>
        </div>
      </div>
    );
  }

  if (activeMenu === 'platform-logs') {
    const rows = connectionLogs;

    return (
      <div className="flex-1 space-y-6 overflow-y-auto p-4 md:p-8">
        <div className="glass-panel rounded-xl p-6">
          <h2 className="mb-2 text-lg font-semibold tracking-tight text-white">连接日志</h2>
          <p className="text-xs text-[#A1A1AA]">记录平台连接器与工具调用的最近执行情况（当前为 Mock）。</p>
        </div>
        <div className="glass-panel overflow-hidden rounded-xl">
          <div className="border-b border-white/5 bg-[#171A20] px-5 py-4">
            <h3 className="text-sm font-semibold tracking-tight">最近调用</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left">
              <thead>
                <tr className="bg-white/[0.02]">
                  <th className="whitespace-nowrap px-5 py-3 text-[10px] font-semibold tracking-wide text-[#A1A1AA]">时间</th>
                  <th className="whitespace-nowrap px-5 py-3 text-[10px] font-semibold tracking-wide text-[#A1A1AA]">平台</th>
                  <th className="whitespace-nowrap px-5 py-3 text-[10px] font-semibold tracking-wide text-[#A1A1AA]">动作</th>
                  <th className="whitespace-nowrap px-5 py-3 text-[10px] font-semibold tracking-wide text-[#A1A1AA]">状态</th>
                  <th className="px-5 py-3 text-[10px] font-semibold tracking-wide text-[#A1A1AA]">说明</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rows.map((r) => (
                  <tr key={r.id} className="transition-colors hover:bg-white/[0.02]">
                    <td className="whitespace-nowrap px-5 py-3 font-mono text-xs text-[#A1A1AA]">{r.time}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-xs text-white/90">{r.platform}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-xs text-[#A1A1AA]">{r.action}</td>
                    <td className="whitespace-nowrap px-5 py-3">
                      <Badge status={r.status === 'success' ? 'success' : 'danger'}>
                        {r.status === 'success' ? 'SUCCESS' : 'ERROR'}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-xs text-[#A1A1AA]">{r.message}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-xs text-[#A1A1AA]">
                      暂无日志。你可以在“连接总览/平台详情”点击“测试连接”生成记录。
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (activeMenu === 'execution-history') {
    return (
      <div className="flex-1 space-y-6 overflow-y-auto p-4 md:p-8">
        <div className="glass-panel overflow-hidden rounded-xl">
          <div className="border-b border-white/5 bg-[#171A20] px-5 py-4">
            <h3 className="text-sm font-semibold tracking-tight">执行历史</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left">
              <thead>
                <tr className="bg-white/[0.02]">
                  <th className="whitespace-nowrap px-5 py-3 text-[10px] font-semibold tracking-wide text-[#A1A1AA]">执行时间</th>
                  <th className="whitespace-nowrap px-5 py-3 text-[10px] font-semibold tracking-wide text-[#A1A1AA]">执行状态</th>
                  <th className="whitespace-nowrap px-5 py-3 text-[10px] font-semibold tracking-wide text-[#A1A1AA]">返回条数</th>
                  <th className="whitespace-nowrap px-5 py-3 text-[10px] font-semibold tracking-wide text-[#A1A1AA]">执行说明</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {inspectionHistory.map((row) => (
                  <tr key={row.id} className="transition-colors hover:bg-white/[0.02]">
                    <td className="whitespace-nowrap px-5 py-3 text-xs text-[#A1A1AA]">{row.inspectTime}</td>
                    <td className="whitespace-nowrap px-5 py-3">
                      <Badge status={row.status === 'success' ? 'success' : 'danger'}>
                        {row.status === 'success' ? '成功' : '失败'}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 font-mono text-xs text-[#A1A1AA]">{row.count}</td>
                    <td className="px-5 py-3 text-xs text-[#A1A1AA]">{row.message}</td>
                  </tr>
                ))}
                {inspectionHistory.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-xs text-[#A1A1AA]">
                      暂无执行记录，请先在“阿里云充值和转账”里点击“巡检”。
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (activeMenu === 'aliyun-funds') {
    return (
      <div className="flex-1 space-y-6 overflow-y-auto p-4 md:p-8">
        <div className="glass-panel rounded-xl p-6">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold tracking-tight text-white">阿里云充值和转账</h2>
            <button
              type="button"
              onClick={handleInspect}
              disabled={isInspecting}
              className="rounded bg-white px-4 py-2 text-xs font-semibold tracking-wide text-black transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isInspecting ? '巡检中...' : '巡检'}
            </button>
          </div>
          <div className="space-y-2 text-sm text-[#A1A1AA]">
            <p>
              <span className="text-white">阿里云账号：</span>
              财务管理账号：sappoc@rd-oibw8m.aliyunid.com
            </p>
            <p>
              <span className="text-white">交易类型：</span>
              充值、转账
            </p>
            <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-[#A1A1AA]">开始日期</label>
                <input
                  ref={startDateInputRef}
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) =>
                    setDateRange((prev) => ({
                      ...prev,
                      startDate: e.target.value,
                    }))
                  }
                  onClick={() => startDateInputRef.current?.showPicker?.()}
                  onFocus={() => startDateInputRef.current?.showPicker?.()}
                  max={dateRange.endDate || undefined}
                  className="w-full cursor-pointer rounded border border-white/10 bg-[#111318] px-3 py-2 text-xs text-white outline-none focus:border-white/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-[#A1A1AA]">结束日期</label>
                <input
                  ref={endDateInputRef}
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) =>
                    setDateRange((prev) => ({
                      ...prev,
                      endDate: e.target.value,
                    }))
                  }
                  onClick={() => endDateInputRef.current?.showPicker?.()}
                  onFocus={() => endDateInputRef.current?.showPicker?.()}
                  min={dateRange.startDate || undefined}
                  className="w-full cursor-pointer rounded border border-white/10 bg-[#111318] px-3 py-2 text-xs text-white outline-none focus:border-white/20"
                />
              </div>
            </div>
            {inspectMsg && <p className="text-xs text-blue-300">{inspectMsg}</p>}
          </div>
        </div>

        <div className="glass-panel overflow-hidden rounded-xl">
          <div className="border-b border-white/5 bg-[#171A20] px-5 py-4">
            <h3 className="text-sm font-semibold tracking-tight">交易流水列表</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[2200px] border-collapse text-left">
              <thead>
                <tr className="bg-white/[0.02]">
                  <th className="whitespace-nowrap px-5 py-3 text-[10px] font-semibold tracking-wide text-[#A1A1AA]">流水号</th>
                  <th className="whitespace-nowrap px-5 py-3 text-[10px] font-semibold tracking-wide text-[#A1A1AA]">交易时间</th>
                  <th className="whitespace-nowrap px-5 py-3 text-[10px] font-semibold tracking-wide text-[#A1A1AA]">收支类型</th>
                  <th className="whitespace-nowrap px-5 py-3 text-[10px] font-semibold tracking-wide text-[#A1A1AA]">交易类型</th>
                  <th className="whitespace-nowrap px-5 py-3 text-[10px] font-semibold tracking-wide text-[#A1A1AA]">交易渠道</th>
                  <th className="whitespace-nowrap px-5 py-3 text-[10px] font-semibold tracking-wide text-[#A1A1AA]">金额</th>
                  <th className="whitespace-nowrap px-5 py-3 text-[10px] font-semibold tracking-wide text-[#A1A1AA]">余额</th>
                  <th className="whitespace-nowrap px-5 py-3 text-[10px] font-semibold tracking-wide text-[#A1A1AA]">资金形式</th>
                  <th className="whitespace-nowrap px-5 py-3 text-[10px] font-semibold tracking-wide text-[#A1A1AA]">交易备注</th>
                  <th className="px-5 py-3 text-[10px] font-semibold tracking-wide text-[#A1A1AA]">
                    交易渠道流水号
                  </th>
                  <th className="whitespace-nowrap px-5 py-3 text-[10px] font-semibold tracking-wide text-[#A1A1AA]">交易单号</th>
                  <th className="whitespace-nowrap px-5 py-3 text-[10px] font-semibold tracking-wide text-[#A1A1AA]">账期</th>
                  <th className="whitespace-nowrap px-5 py-3 text-[10px] font-semibold tracking-wide text-[#A1A1AA]">账号</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {fundRows.map((row) => (
                  <tr key={row.serialNo} className="transition-colors hover:bg-white/[0.02]">
                    <td className="whitespace-nowrap px-5 py-3 font-mono text-xs text-white/80">{row.serialNo}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-xs text-[#A1A1AA]">{row.transactionTime}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-xs text-[#A1A1AA]">{row.incomeExpenseType}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-xs text-[#A1A1AA]">{row.transactionType}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-xs text-[#A1A1AA]">{row.transactionChannel}</td>
                    <td className="whitespace-nowrap px-5 py-3 font-mono text-xs text-white/90">{row.amount}</td>
                    <td className="whitespace-nowrap px-5 py-3 font-mono text-xs text-[#A1A1AA]">{row.balance}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-xs text-[#A1A1AA]">{row.fundForm}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-xs text-[#A1A1AA]">{row.remark}</td>
                    <td className="whitespace-nowrap px-5 py-3 font-mono text-xs text-[#A1A1AA]">{row.channelSerialNo}</td>
                    <td className="whitespace-nowrap px-5 py-3 font-mono text-xs text-[#A1A1AA]">{row.transactionOrderNo}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-xs text-[#A1A1AA]">{row.billingPeriod}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-xs text-[#A1A1AA]">{row.account}</td>
                  </tr>
                ))}
                {fundRows.length === 0 && (
                  <tr>
                    <td colSpan={13} className="px-5 py-8 text-center text-xs text-[#A1A1AA]">
                      暂无数据，请点击上方“巡检”拉取最新流水。
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 overflow-y-auto p-4 md:p-8">
      <div className="glass-panel flex items-center justify-between rounded-lg border border-blue-500/10 bg-blue-500/[0.02] p-3">
        <div className="flex items-center gap-3 text-sm text-[#A1A1AA]">
          <Activity size={16} className="text-blue-400" />
          <span>
            巡检 Playbook 与多云财务连接器已就绪。可在工作流中触发 Agent
            执行、查看运行轨迹，并将结果回写工单或通知渠道。
          </span>
        </div>
        <button
          type="button"
          onClick={() => onOpenAsk?.()}
          className="text-xs font-medium text-blue-400 hover:text-blue-300"
        >
          随便问问
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="本月估算成本（多云）"
          value="¥ 328,400"
          subtext={
            <>
              <Clock size={12} /> 较上月同期约 -4.2%
            </>
          }
          icon={<Cloud size={18} />}
          action="成本明细"
        />
        <StatCard
          title="近 30 天 Agent 执行"
          value="12,480"
          subtext={
            <>
              <span className="flex items-center gap-1 text-emerald-400">
                <CheckCircle2 size={12} /> 99.2%
              </span>{' '}
              成功结束
            </>
          }
          icon={<Activity size={18} />}
          primary
        />
        <StatCard
          title="已接入云账号"
          value="13"
          subtext={
            <>
              <Zap size={12} /> 待巡检基线 2 条
            </>
          }
          icon={<Cpu size={18} />}
          action="账号治理"
          primary
        />
        <StatCard
          title="主接入凭据"
          value="ak_***…4f9a"
          subtext={
            <>
              <Clock size={12} /> 轮换剩余 7 天
            </>
          }
          icon={<Key size={18} />}
          action="轮换"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="glass-panel flex flex-col rounded-xl p-5 lg:col-span-2">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-sm font-semibold tracking-tight">巡检与 Agent 执行趋势</h3>
            <div className="flex rounded-md border border-white/5 bg-[#111318] p-1">
              <button
                type="button"
                className="rounded bg-white/10 px-3 py-1 text-[10px] font-semibold text-white"
              >
                24 小时
              </button>
              <button
                type="button"
                className="rounded px-3 py-1 text-[10px] font-semibold text-[#A1A1AA] hover:text-white"
              >
                7 天
              </button>
              <button
                type="button"
                className="rounded px-3 py-1 text-[10px] font-semibold text-[#A1A1AA] hover:text-white"
              >
                30 天
              </button>
            </div>
          </div>

          <div className="flex h-40 flex-1 items-end gap-2 border-b border-white/5 pb-2 pt-4">
            {usageChartHeights.map((h, i) => (
              <div
                key={i}
                className="group relative flex-1 cursor-crosshair rounded-t-sm bg-gradient-to-t from-blue-500/20 to-blue-400/5 hover:from-blue-500/40"
                style={{ height: `${h}%` }}
              >
                <div className="pointer-events-none absolute -top-8 left-1/2 z-10 -translate-x-1/2 rounded border border-white/10 bg-[#171A20] py-1 px-2 font-mono text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                  {h * 120}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between font-mono text-[10px] text-[#A1A1AA]">
            <span>00:00</span>
            <span>12:00</span>
            <span>24:00</span>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="glass-panel flex-1 rounded-xl p-5">
            <h3 className="mb-4 text-sm font-semibold tracking-tight">工作流执行结果分布</h3>
            <div className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-[#A1A1AA]">
                    <div className="h-2 w-2 rounded-full bg-emerald-400" />
                    成功
                  </span>
                  <span className="font-mono">85%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                  <div className="h-full w-[85%] bg-emerald-400" />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-[#A1A1AA]">
                    <div className="h-2 w-2 rounded-full bg-blue-400" />
                    运行中
                  </span>
                  <span className="font-mono">10%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                  <div className="h-full w-[10%] bg-blue-400" />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-[#A1A1AA]">
                    <div className="h-2 w-2 rounded-full bg-red-400" />
                    失败 / 需人工
                  </span>
                  <span className="font-mono">5%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                  <div className="h-full w-[5%] bg-red-400" />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className="glass-panel-interactive flex flex-col items-center justify-center gap-2 rounded-lg p-3 text-sm text-[#A1A1AA] hover:text-white"
            >
              <Workflow size={18} />
              <span>新建工作流</span>
            </button>
            <button
              type="button"
              className="glass-panel-interactive flex flex-col items-center justify-center gap-2 rounded-lg p-3 text-sm text-[#A1A1AA] hover:text-white"
            >
              <FileText size={18} />
              <span>操作手册</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="glass-panel flex flex-col overflow-hidden rounded-xl xl:col-span-2">
          <div className="flex items-center justify-between border-b border-white/5 bg-[#171A20] p-5">
            <h3 className="text-sm font-semibold tracking-tight">最近工作流运行</h3>
            <button
              type="button"
              className="flex items-center gap-1 text-[10px] font-semibold tracking-wide text-[#A1A1AA] hover:text-white"
            >
              全部记录 <ArrowUpRight size={12} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-white/[0.02]">
                  <th className="px-5 py-3 text-[10px] font-semibold tracking-wide text-[#A1A1AA]">
                    运行 ID
                  </th>
                  <th className="px-5 py-3 text-[10px] font-semibold tracking-wide text-[#A1A1AA]">
                    工作流
                  </th>
                  <th className="px-5 py-3 text-[10px] font-semibold tracking-wide text-[#A1A1AA]">
                    状态
                  </th>
                  <th className="px-5 py-3 text-[10px] font-semibold tracking-wide text-[#A1A1AA]">
                    耗时
                  </th>
                  <th className="px-5 py-3 text-[10px] font-semibold tracking-wide text-[#A1A1AA]">
                    开始时间
                  </th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {recentWorkflowRuns.map((run) => (
                  <tr key={run.id} className="group transition-colors hover:bg-white/[0.02]">
                    <td className="px-5 py-3 font-mono text-xs text-white/80">{run.id}</td>
                    <td className="px-5 py-3 text-xs text-[#A1A1AA]">{run.workflowName}</td>
                    <td className="px-5 py-3">
                      <Badge status={taskStatusToBadge(run.status)}>{taskStatusLabel(run.status)}</Badge>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-[#A1A1AA]">{run.duration}</td>
                    <td className="px-5 py-3 text-xs text-[#A1A1AA]">{run.time}</td>
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        className="text-[#A1A1AA] opacity-0 transition-opacity hover:text-white group-hover:opacity-100"
                      >
                        <MoreVertical size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass-panel flex flex-col overflow-hidden rounded-xl">
          <div className="flex items-center justify-between border-b border-white/5 bg-[#171A20] p-5">
            <h3 className="text-sm font-semibold tracking-tight">数据源健康</h3>
            <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          </div>
          <div className="flex-1 overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-white/[0.02]">
                  <th className="px-5 py-3 text-[10px] font-semibold tracking-wide text-[#A1A1AA]">
                    数据源
                  </th>
                  <th className="px-5 py-3 text-[10px] font-semibold tracking-wide text-[#A1A1AA]">
                    状态
                  </th>
                  <th className="px-5 py-3 text-[10px] font-semibold tracking-wide text-[#A1A1AA]">
                    同步
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {dataSourceHealthRows.map((row) => (
                  <tr key={row.name} className="transition-colors hover:bg-white/[0.02]">
                    <td className="px-5 py-4">
                      <div className="mb-1 text-xs font-medium text-white/90">{row.name}</div>
                      <div className="font-mono text-[10px] text-[#A1A1AA]">{row.typeLabel}</div>
                    </td>
                    <td className="px-5 py-4">
                      <Badge status={row.status === 'stable' ? 'success' : 'queued'}>
                        {modelHealthStatusLabel(row.status)}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-xs text-[#A1A1AA]">{row.q}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="h-8" />
    </div>
  );
}
