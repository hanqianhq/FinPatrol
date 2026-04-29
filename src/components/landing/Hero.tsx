import { ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function Hero() {
  const navigate = useNavigate();

  return (
    <section className="relative flex min-h-[100svh] items-center justify-center overflow-hidden bg-black pt-20">
      <div className="absolute inset-0 bg-timeline-grid opacity-60" />
      <div className="abstract-ribbon -left-1/2 top-1/4 h-32 w-[200%] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
      <div className="abstract-ribbon -left-1/4 top-2/4 h-48 w-[200%] bg-gradient-to-r from-transparent via-indigo-500/5 to-transparent blur-2xl" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[60vw] w-[60vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-900/10 blur-[120px]" />
      <div className="film-edge absolute bottom-0 left-6 top-0 hidden w-1 opacity-20 lg:block" />
      <div className="film-edge absolute bottom-0 right-6 top-0 hidden w-1 opacity-20 lg:block" />

      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col items-center px-6 text-center">
        <div className="mb-8 flex flex-col items-center">
          <span className="mb-2 text-[10px] tracking-[0.2em] text-zinc-500">
            阿里云巡检 × 多云财务管理 · Agent 工作流编排
          </span>
        </div>
        <h1 className="text-glow mb-8 flex flex-col items-center text-[10vw] font-black leading-[1.08] tracking-tighter text-white md:text-[5.5rem] md:leading-[1.05]">
          <span>巡检与财务</span>
          <span className="bg-gradient-to-b from-white via-zinc-300 to-zinc-800 bg-clip-text text-transparent">
            交给智能体闭环
          </span>
        </h1>
        <p className="mb-12 max-w-2xl text-lg font-light leading-[1.9] text-zinc-400 md:text-xl">
          在统一画布上编排巡检 Playbook、多云账单拉取与对账、成本异常与预算告警。Agent
          按策略自动执行、留痕与升级，让运维与财务在同一条工作流里协同。
        </p>
        <div className="flex w-full flex-col gap-6 sm:w-auto sm:flex-row">
          <button
            type="button"
            onClick={() => navigate('/overview')}
            className="group flex cursor-pointer items-center justify-center gap-2 bg-white px-10 py-5 text-sm font-bold tracking-wide text-black transition-all hover:bg-zinc-200"
          >
            打开工作台
            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>
          <button
            type="button"
            className="glass-panel cursor-pointer px-10 py-5 text-sm font-bold tracking-wide text-white transition-all hover:bg-white/10"
          >
            了解部署与安全
          </button>
        </div>
      </div>
    </section>
  );
}
