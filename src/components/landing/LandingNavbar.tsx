import { useNavigate } from 'react-router-dom';

export function LandingNavbar() {
  const navigate = useNavigate();

  return (
    <nav className="fixed top-0 z-50 flex w-full items-center justify-between border-b-0 border-white/5 bg-black/40 px-6 py-4 backdrop-blur-md glass-panel">
      <div className="flex items-center gap-2">
        <div className="h-4 w-4 rounded-sm bg-white" />
        <span className="text-lg font-bold tracking-tight text-white">
          云巡<span className="text-zinc-500">Agent</span>
        </span>
      </div>
      <div className="hidden gap-8 text-xs font-medium tracking-wide text-zinc-400 md:flex">
        <a href="#capabilities" className="transition-colors hover:text-white">
          核心能力
        </a>
        <a href="#platform" className="transition-colors hover:text-white">
          平台特性
        </a>
        <a href="#scenarios" className="transition-colors hover:text-white">
          适用场景
        </a>
      </div>
      <button
        type="button"
        onClick={() => navigate('/dashboard')}
        className="cursor-pointer bg-white px-5 py-2.5 text-xs font-bold tracking-wide text-black transition-colors hover:bg-zinc-200"
      >
        进入工作台
      </button>
    </nav>
  );
}
