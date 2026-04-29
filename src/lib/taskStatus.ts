import type { BadgeStatus } from '@/components/dashboard/Badge';

export type TaskRowStatus = 'completed' | 'processing' | 'queued' | 'failed';

export function taskStatusToBadge(status: TaskRowStatus): BadgeStatus {
  const map: Record<TaskRowStatus, BadgeStatus> = {
    completed: 'success',
    processing: 'processing',
    queued: 'queued',
    failed: 'danger',
  };
  return map[status];
}

const taskLabels: Record<TaskRowStatus, string> = {
  completed: '已完成',
  processing: '运行中',
  queued: '排队中',
  failed: '失败',
};

export function taskStatusLabel(status: TaskRowStatus): string {
  return taskLabels[status];
}

export function modelHealthStatusLabel(status: 'stable' | 'busy'): string {
  return status === 'stable' ? '稳定' : '繁忙';
}
