import {
  BarChart2,
  Bot,
  CreditCard,
  FileText,
  History,
  Key,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  Wallet,
  Workflow,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export type DashboardMenuKey = 'overview' | 'aliyun-funds' | 'execution-history' | 'workflow' | 'settings';

type MenuItem = {
  key: DashboardMenuKey | 'other';
  icon: JSX.Element;
  label: string;
};

const menuItems: MenuItem[] = [
  { key: 'overview', icon: <LayoutDashboard size={16} />, label: '总览' },
  { key: 'other', icon: <ShieldCheck size={16} />, label: '巡检中心' },
  { key: 'workflow', icon: <Workflow size={16} />, label: '工作流编排' },
  { key: 'other', icon: <Bot size={16} />, label: 'Agent 模板' },
  { key: 'execution-history', icon: <History size={16} />, label: '执行历史' },
  { key: 'other', icon: <BarChart2 size={16} />, label: '成本分析' },
  { key: 'other', icon: <CreditCard size={16} />, label: '对账中心' },
  { key: 'aliyun-funds', icon: <Wallet size={16} />, label: '阿里云充值和转账' },
  { key: 'other', icon: <Key size={16} />, label: '接入凭据' },
  { key: 'other', icon: <FileText size={16} />, label: '文档' },
  { key: 'settings', icon: <Settings size={16} />, label: '设置' },
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
          <div className="h-4 w-4 rounded-sm bg-[#F4F4F5]" />
          <span className="text-sm font-bold tracking-tight">
            云巡<span className="text-[#A1A1AA]">工作台</span>
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-6">
        <div className="mb-2 px-3 text-[10px] font-semibold tracking-wide text-[#A1A1AA]">主导航</div>
        {menuItems.map((item, idx) => (
          <div key={item.label}>
            {idx === 8 && (
              <div className="mb-2 mt-6 px-3 text-[10px] font-semibold tracking-wide text-[#A1A1AA]">
                集成
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                if (item.key !== 'other') {
                  onMenuChange(item.key);
                }
              }}
              className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors ${
                item.key !== 'other' && activeMenu === item.key
                  ? 'bg-white/10 text-white'
                  : 'text-[#A1A1AA] hover:bg-white/5 hover:text-white'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
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
