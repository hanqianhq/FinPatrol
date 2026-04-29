import { useEffect, useMemo, useRef, useState } from 'react';
import { Bubble, Sender } from '@ant-design/x';
import { loadLlmConfigs, type LlmConfig } from '@/db/repository';

type AskDrawerProps = {
  open: boolean;
  onClose: () => void;
};

type ChatMsg = {
  id: string;
  role: 'user' | 'agent';
  content: string;
  time: string;
};

const pickActiveConfig = (configs: LlmConfig[]): LlmConfig | null => {
  const enabled = configs.find((c) => c.enabled && c.apiKey.trim() && c.baseUrl.trim() && c.model.trim());
  if (enabled) return enabled;
  const configured = configs.find((c) => c.apiKey.trim() && c.baseUrl.trim() && c.model.trim());
  return configured || null;
};

export function AskDrawer({ open, onClose }: AskDrawerProps) {
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      id: 'init',
      role: 'agent',
      content: '随便问我：巡检怎么做、成本异常怎么看、该先接入哪些平台……我会给你可执行的下一步。',
      time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
    },
  ]);
  const [input, setInput] = useState('');
  const [running, setRunning] = useState(false);
  const [cfgs, setCfgs] = useState<LlmConfig[] | null>(null);
  const [cfgErr, setCfgErr] = useState('');
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    void (async () => {
      try {
        const configs = await loadLlmConfigs();
        setCfgs(configs || []);
        setCfgErr('');
      } catch (e) {
        setCfgErr(e instanceof Error ? e.message : '读取模型配置失败');
        setCfgs([]);
      }
    })();
  }, [open]);

  const activeCfg = useMemo(() => (cfgs ? pickActiveConfig(cfgs) : null), [cfgs]);

  const bubbleItems = useMemo(
    () =>
      messages.map((m) => ({
        key: m.id,
        role: m.role === 'user' ? 'user' : 'ai',
        content: m.content,
        header: <div className="text-[10px] text-[#A1A1AA]">{m.time}</div>,
        variant: 'borderless' as const,
      })),
    [messages, running],
  );

  const append = (role: ChatMsg['role'], content: string) => {
    const next: ChatMsg = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      role,
      content,
      time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
    };
    setMessages((prev) => [...prev, next]);
    return next.id;
  };

  const update = (id: string, content: string) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, content } : m)));
  };

  const streamLlm = async (prompt: string, onChunk: (text: string) => void) => {
    if (!activeCfg) {
      throw new Error('未配置可用模型，请先到“集成 → 模型配置”填写 Base URL、Model、API Key');
    }
    const endpoint = `${activeCfg.baseUrl.replace(/\/$/, '')}/chat/completions`;
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${activeCfg.apiKey.trim()}`,
      },
      body: JSON.stringify({
        model: activeCfg.model.trim(),
        temperature: 0.2,
        stream: true,
        messages: [
          {
            role: 'system',
            content:
              '你是云巡工作台的产品与巡检 Agent。请用中文给出简洁、可执行的答案；必要时给出可直接复制的步骤或清单。',
          },
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!resp.ok) {
      throw new Error(`模型请求失败（${resp.status}）`);
    }
    if (!resp.body) {
      const payload = (await resp.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const text = payload.choices?.[0]?.message?.content?.trim() || '';
      onChunk(text);
      return;
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let full = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const raw of lines) {
        const line = raw.trim();
        if (!line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (!data || data === '[DONE]') continue;
        try {
          const json = JSON.parse(data) as { choices?: Array<{ delta?: { content?: string } }> };
          const token = json.choices?.[0]?.delta?.content ?? '';
          if (token) {
            full += token;
            onChunk(full);
          }
        } catch {
          // ignore
        }
      }
    }
  };

  const handleSubmit = async (val: string) => {
    const prompt = val.trim();
    if (!prompt || running) return;

    append('user', prompt);
    setInput('');
    setRunning(true);

    const placeholderId = append('agent', '正在思考...');
    try {
      await streamLlm(prompt, (t) => {
        if (!mountedRef.current) return;
        update(placeholderId, t);
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : '未知错误';
      update(placeholderId, `执行失败：${msg}`);
    } finally {
      if (mountedRef.current) setRunning(false);
    }
  };

  return (
    <aside
      className={`absolute inset-y-0 right-0 z-30 w-full max-w-[560px] border-l border-white/10 bg-[#0f1422] transition-transform duration-200 sm:w-[480px] lg:w-[560px] ${
        open ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div>
            <div className="text-sm font-semibold tracking-tight text-white">随便问问</div>
            <div className="text-[11px] text-[#A1A1AA]">右侧抽屉对话 · 支持流式输出</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded px-2 py-1 text-xs font-semibold text-[#D4D4D8] hover:bg-white/10"
          >
            关闭
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden p-3">
          <div className="flex h-full flex-col rounded-lg border border-white/10 bg-[#111318]">
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              <Bubble.List
                items={bubbleItems}
                autoScroll
                role={{
                  user: { placement: 'end' },
                  ai: { placement: 'start' },
                }}
              />
              {(cfgErr || !activeCfg) && (
                <div className="mt-2 rounded border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                  {cfgErr || '未配置可用模型，请先到“集成 → 模型配置”完成配置。'}
                </div>
              )}
            </div>
            <div className="border-t border-white/10 p-3">
              <Sender
                value={input}
                onChange={(v) => setInput(v)}
                loading={running}
                placeholder="随便问点什么…"
                onSubmit={(v) => {
                  void handleSubmit(v);
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

