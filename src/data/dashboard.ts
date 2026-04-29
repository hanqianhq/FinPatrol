import type { TaskRowStatus } from '@/lib/taskStatus';

/** 工作流运行记录（演示数据） */
export type WorkflowRun = {
  id: string;
  workflowName: string;
  status: TaskRowStatus;
  duration: string;
  time: string;
};

export const recentWorkflowRuns: WorkflowRun[] = [
  {
    id: 'run_9x2b4f1a',
    workflowName: '阿里云·生产基线巡检',
    status: 'completed',
    duration: '3 分 12 秒',
    time: '2 分钟前',
  },
  {
    id: 'run_3v8m0k9p',
    workflowName: '多云账单拉取与科目映射',
    status: 'processing',
    duration: '进行中',
    time: '4 分钟前',
  },
  {
    id: 'run_7l1q5z8w',
    workflowName: '成本异常 Agent 研判',
    status: 'queued',
    duration: '—',
    time: '5 分钟前',
  },
  {
    id: 'run_2n5c9x0r',
    workflowName: '预算阈值巡检 + 飞书通知',
    status: 'completed',
    duration: '48 秒',
    time: '12 分钟前',
  },
  {
    id: 'run_8h4p1m3v',
    workflowName: '渠道对账差异复核',
    status: 'failed',
    duration: '1 分 05 秒',
    time: '15 分钟前',
  },
];

export type DataSourceHealthRow = {
  name: string;
  typeLabel: string;
  status: 'stable' | 'busy';
  q: string;
};

export const dataSourceHealthRows: DataSourceHealthRow[] = [
  { name: '阿里云·财务主账号', typeLabel: '账单 API · 资源目录', status: 'stable', q: '延迟 2 分钟' },
  { name: 'AWS·组织主账号', typeLabel: 'CUR · Cost Categories', status: 'stable', q: '延迟 6 小时' },
  { name: 'Azure·EA 合约', typeLabel: '用量导出 · 标签策略', status: 'stable', q: '延迟 45 分钟' },
  { name: '内部 CMDB', typeLabel: '资产与负责人同步', status: 'busy', q: '队列 12 分钟' },
];

export type AliyunFundTransaction = {
  serialNo: string;
  transactionTime: string;
  incomeExpenseType: string;
  transactionType: string;
  transactionChannel: string;
  amount: string;
  balance: string;
  fundForm: string;
  remark: string;
  channelSerialNo: string;
  transactionOrderNo: string;
  billingPeriod: string;
  account: string;
};

export const usageChartHeights = [40, 25, 60, 35, 80, 45, 90, 65, 50, 75, 40, 85, 55, 70, 45, 95, 60, 80];
