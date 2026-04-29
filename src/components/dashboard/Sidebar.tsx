import {
  BarChart2,
  Cloud,
  FileText,
  History,
  Key,
  LayoutDashboard,
  MoreVertical,
  Settings,
  ShieldCheck,
  Wallet,
  Workflow,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export type DashboardMenuKey =
  | 'overview'
  | 'aliyun-funds'
  | 'execution-history'
  | 'workflow'
  | 'model-config'
  | 'token-config';

type MenuItem = {
  key: DashboardMenuKey | 'other';
  icon: JSX.Element;
  label: string;
};

type MenuGroup = {
  label: string;
  items: MenuItem[];
};

const menuGroups: MenuGroup[] = [
  {
    label: '工作台',
    items: [{ key: 'overview', icon: <LayoutDashboard size={16} />, label: '总览' }],
  },
  {
    label: '智能巡检',
    items: [
      { key: 'aliyun-funds', icon: <Wallet size={16} />, label: '资金流水巡检' },
      { key: 'other', icon: <ShieldCheck size={16} />, label: '月度账单巡检' },
      { key: 'other', icon: <ShieldCheck size={16} />, label: '异常消费排查' },
    ],
  },
  {
    label: '多云费用',
    items: [
      { key: 'other', icon: <BarChart2 size={16} />, label: '客户费用分析' },
      { key: 'other', icon: <BarChart2 size={16} />, label: '云厂商对比' },
      { key: 'other', icon: <BarChart2 size={16} />, label: '费用波动归因' },
    ],
  },
  {
    label: '报告中心',
    items: [
      { key: 'other', icon: <FileText size={16} />, label: '巡检报告' },
      { key: 'other', icon: <FileText size={16} />, label: '客户月报' },
    ],
  },
  {
    label: '平台连接',
    items: [
      { key: 'other', icon: <Cloud size={16} />, label: 'CFM' },
      { key: 'other', icon: <Cloud size={16} />, label: '阿里云' },
      { key: 'other', icon: <Cloud size={16} />, label: '腾讯云' },
      { key: 'other', icon: <Cloud size={16} />, label: 'AWS' },
    ],
  },
  {
    label: '规则中心',
    items: [
      { key: 'other', icon: <Workflow size={16} />, label: '费用口径' },
      { key: 'other', icon: <Workflow size={16} />, label: '巡检规则' },
      { key: 'other', icon: <Workflow size={16} />, label: '报表模板' },
    ],
  },
  {
    label: '执行记录',
    items: [
      { key: 'execution-history', icon: <History size={16} />, label: '任务历史' },
      { key: 'other', icon: <MoreVertical size={16} />, label: '工具调用日志' },
    ],
  },
  {
    label: '集成',
    items: [
      { key: 'other', icon: <FileText size={16} />, label: '文档' },
      { key: 'model-config', icon: <Settings size={16} />, label: '模型配置' },
      { key: 'token-config', icon: <Key size={16} />, label: '接入凭据' },
    ],
  },
];

type SidebarProps = {
  activeMenu: DashboardMenuKey;
  onMenuChange: (menu: DashboardMenuKey) => void;
};

export function Sidebar({ activeMenu, onMenuChange }: SidebarProps) {
  const navigate = useNavigate();

  return (
    <aside className="hidden h-screen w-56 shrink-0 flex-col border-r border-white/5 bg-[#111318] md:flex">
      <div className="flex h-16 items-center border-b border-white/5 px-6">
        <div className="flex items-center gap-2">
          <img
            src="/finpatrol.svg"
            alt="FinPatrol"
            className="h-5 w-5"
            draggable={false}
          />
          <span className="text-sm font-bold tracking-tight">
            云巡<span className="text-[#A1A1AA]">工作台</span>
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-6">
        {menuGroups.map((group) => (
          <div key={group.label} className="mb-4">
            <div className="mb-2 px-3 text-[10px] font-semibold tracking-wide text-[#A1A1AA]">
              {group.label}
            </div>
            <div className="flex flex-col gap-1">
              {group.items.map((item) => {
                const isDisabled = item.key === 'other';
                const isActive = !isDisabled && activeMenu === item.key;
                return (
                  <button
                    key={`${group.label}-${item.label}`}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => {
                      if (item.key !== 'other') {
                        onMenuChange(item.key);
                      }
                    }}
                    className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors ${
                      isDisabled
                        ? 'cursor-not-allowed text-[#52525B] opacity-70'
                        : isActive
                          ? 'bg-white/10 text-white'
                          : 'text-[#A1A1AA] hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="px-3 pb-4">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-white/5 py-2 text-xs font-semibold tracking-wide text-[#A1A1AA] transition-colors hover:bg-white/10 hover:text-white"
        >
          ← 返回官网
        </button>
      </div>

      <div className="border-t border-white/5 p-4">
        <div className="flex items-center gap-3 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-gradient-to-tr from-zinc-700 to-zinc-500 text-xs font-bold">
            财
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium">FinOps 演示</span>
            <span className="font-mono text-[10px] text-[#A1A1AA]">tenant_demo_01</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
