import { Badge } from '@/components/dashboard/Badge';

export function Header() {
  return (
    <header className="glass-panel sticky top-0 z-10 flex h-16 items-center justify-between border-x-0 border-t-0 px-6">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold tracking-tight">运营总览</h1>
        <div className="h-4 w-px bg-white/10" />
        <Badge status="success">调度与连接器正常</Badge>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-semibold tracking-wide text-[#A1A1AA]">本月估算成本</span>
          <span className="font-mono text-sm font-medium">¥ 328,400</span>
        </div>
        <button
          type="button"
          className="rounded bg-white px-3 py-1.5 text-xs font-semibold tracking-wide text-black transition-colors hover:bg-zinc-200"
        >
          同步账单
        </button>
      </div>
    </header>
  );
}
