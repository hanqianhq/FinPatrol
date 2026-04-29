import type { ReactNode } from 'react';

export type BadgeStatus = 'success' | 'processing' | 'queued' | 'danger' | 'neutral';

const styles: Record<BadgeStatus, string> = {
  success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  processing: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  queued: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  danger: 'bg-red-500/10 text-red-400 border-red-500/20',
  neutral: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
};

type BadgeProps = {
  children: ReactNode;
  status: BadgeStatus;
};

export function Badge({ children, status }: BadgeProps) {
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide ${styles[status]}`}
    >
      {children}
    </span>
  );
}
