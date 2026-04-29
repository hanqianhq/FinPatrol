import { Box } from 'lucide-react';

const cases = [
  { title: '云运维与合规', subtitle: '基线巡检 · 变更留痕' },
  { title: '财务与采购协同', subtitle: '账单分摊 · 对账闭环' },
  { title: 'FinOps 成本治理', subtitle: '预算 · 异常 · 优化建议' },
  { title: 'MSP 与渠道交付', subtitle: '多客户隔离 · 可复用模板' },
];

export function UseCasesSection() {
  return (
    <section id="scenarios" className="relative overflow-hidden bg-zinc-950 py-32">
      <div className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 select-none whitespace-nowrap opacity-[0.02]">
        <h2 className="text-[20vw] font-black tracking-tighter text-white">适用场景</h2>
      </div>
      <div className="relative z-10 mx-auto max-w-7xl px-6">
        <div className="mb-20 text-center">
          <h2 className="mb-4 text-5xl font-bold tracking-tighter text-white md:text-7xl">
            从运维到财务，
            <br />
            同一套 Agent 底座。
          </h2>
          <p className="text-xs tracking-widest text-zinc-500">按角色授权 · 按场景装配工作流</p>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {cases.map((uc, idx) => (
            <div
              key={idx}
              className="group flex cursor-pointer flex-col items-center border border-white/10 p-8 text-center transition-colors hover:bg-white/5"
            >
              <Box className="mb-6 h-8 w-8 text-zinc-700 transition-colors group-hover:text-white" />
              <h3 className="mb-2 text-lg font-bold tracking-wide text-white">{uc.title}</h3>
              <p className="text-[10px] tracking-widest text-zinc-500">{uc.subtitle}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
