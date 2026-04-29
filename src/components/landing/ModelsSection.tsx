const capabilities = [
  {
    id: '01',
    name: '阿里云巡检 Playbook',
    desc: '按账号、资源组与合规基线自动巡检，发现配置漂移、闲置与风险项，并生成可追踪的整改工单。',
  },
  {
    id: '02',
    name: '多云财务与对账',
    desc: '汇聚阿里云、AWS、Azure 等账单与分摊规则，支持科目映射、多币种与渠道对账，减少人工核对。',
  },
  {
    id: '03',
    name: 'Agent 工作流编排',
    desc: '用可视化流程串联「数据采集 → 规则引擎 → LLM 研判 → 通知/工单」，支持人工复核与版本回滚。',
  },
] as const;

export function ModelsSection() {
  return (
    <section id="capabilities" className="relative border-t border-white/5 bg-black py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-20">
          <h2 className="mb-4 text-5xl font-bold tracking-tighter text-white md:text-7xl">
            一条链路
            <br />
            <span className="text-zinc-600">打通巡检与财务</span>
          </h2>
          <p className="text-xs tracking-widest text-zinc-500">可编排 · 可审计 · 可扩展到更多云</p>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {capabilities.map((item) => (
            <div
              key={item.id}
              className="glass-panel group p-8 transition-colors hover:bg-white/[0.03]"
            >
              <div className="mb-8 text-5xl font-black tracking-tighter text-zinc-700 transition-colors group-hover:text-zinc-500">
                {item.id}
              </div>
              <h3 className="mb-3 text-xl font-bold tracking-wide text-white">{item.name}</h3>
              <p className="text-sm font-light leading-relaxed text-zinc-400">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
