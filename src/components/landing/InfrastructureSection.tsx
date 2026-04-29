import { Activity, Cpu, Globe, Layers } from 'lucide-react';

const features = [
  {
    icon: <Activity className="h-6 w-6" />,
    title: '多账号与多租户隔离',
    desc: '主账号、RAM、资源目录与财务单元可分层授权，满足集团与企业多 BU 隔离诉求。',
  },
  {
    icon: <Globe className="h-6 w-6" />,
    title: '多云连接器',
    desc: '标准化接入账单、用量与标签数据；可扩展自定义数据源与内部 CMDB 对齐。',
  },
  {
    icon: <Layers className="h-6 w-6" />,
    title: '策略与审批内置',
    desc: '预算阈值、异常成本、巡检红线可绑定审批流与外部工单系统，减少「只告警不闭环」。',
  },
  {
    icon: <Cpu className="h-6 w-6" />,
    title: 'Agent 运行时与观测',
    desc: '执行轨迹、提示词版本、工具调用与成本可观测，便于合规审计与问题复盘。',
  },
];

export function InfrastructureSection() {
  return (
    <section id="platform" className="relative bg-zinc-950 py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-20 flex flex-col items-start justify-between gap-8 md:flex-row md:items-end">
          <div>
            <h2 className="mb-4 text-5xl font-bold tracking-tighter text-white md:text-7xl">
              面向企业
              <br />
              <span className="text-zinc-600">治理与 FinOps</span>
            </h2>
            <p className="text-xs tracking-widest text-zinc-500">安全合规 · 可扩展 · 可运营</p>
          </div>
          <p className="max-w-md text-sm font-light leading-relaxed text-zinc-400">
            不是零散脚本集合，而是一套可治理的平台：谁能在什么范围触发 Agent、数据落在哪里、如何留痕与追责，都有清晰边界。
          </p>
        </div>
        <div className="grid grid-cols-1 gap-px bg-zinc-800/50 md:grid-cols-2">
          {features.map((feat, idx) => (
            <div key={idx} className="group flex flex-col justify-between bg-black p-12">
              <div className="mb-16 text-zinc-600 transition-colors duration-500 group-hover:text-white">
                {feat.icon}
              </div>
              <div>
                <h3 className="mb-4 text-2xl font-bold tracking-tight text-white">{feat.title}</h3>
                <p className="text-sm font-light text-zinc-400">{feat.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
