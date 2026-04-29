import { ArrowUpRight } from 'lucide-react';
import type { ReactNode } from 'react';

type StatCardProps = {
  title: string;
  value: string;
  subtext: ReactNode;
  icon: ReactNode;
  action?: string;
  primary?: boolean;
};

export function StatCard({ title, value, subtext, icon, action, primary }: StatCardProps) {
  return (
    <div className="glass-panel flex flex-col justify-between rounded-xl p-5">
      <div className="mb-4 flex items-start justify-between">
        <div className="rounded-lg bg-white/5 p-2 text-[#A1A1AA]">{icon}</div>
        {action && (
          <button
            type="button"
            className="flex items-center gap-1 text-[10px] font-semibold tracking-wide text-[#A1A1AA] hover:text-white"
          >
            {action} <ArrowUpRight size={12} />
          </button>
        )}
      </div>
      <div>
        <h3 className="mb-1 text-xs font-semibold tracking-wide text-[#A1A1AA]">{title}</h3>
        <div className="mb-1 flex items-baseline gap-2">
          <span className={`text-2xl font-semibold tracking-tight ${primary ? '' : 'font-mono'}`}>{value}</span>
        </div>
        <p className="flex items-center gap-1 text-[11px] text-[#A1A1AA]">{subtext}</p>
      </div>
    </div>
  );
}
