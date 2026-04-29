import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AskDrawer } from '@/components/dashboard/AskDrawer';
import { DashboardMain } from '@/components/dashboard/DashboardMain';
import { Header } from '@/components/dashboard/Header';
import { Sidebar, type DashboardMenuKey } from '@/components/dashboard/Sidebar';

export function DashboardPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [askOpen, setAskOpen] = useState(false);

  const menuToPath: Record<DashboardMenuKey, string> = {
    overview: '/overview',
    workflow: '/workflow',
    'execution-history': '/execution-history',
    'aliyun-funds': '/aliyun-funds',
    'model-config': '/model-config',
    'token-config': '/token-config',
    'platform-overview': '/platform-connections',
    'platform-cfm': '/platform-connections/cfm',
    'platform-aliyun': '/platform-connections/aliyun',
    'platform-tencent': '/platform-connections/tencent',
    'platform-aws': '/platform-connections/aws',
    'platform-credentials': '/platform-connections/credentials',
    'platform-logs': '/platform-connections/logs',
  };

  const pathToMenu: Record<string, DashboardMenuKey> = {
    '/overview': 'overview',
    '/overview/': 'overview',
    '/workflow': 'workflow',
    '/execution-history': 'execution-history',
    '/aliyun-funds': 'aliyun-funds',
    '/model-config': 'model-config',
    '/token-config': 'platform-credentials',
    '/platform-connections': 'platform-overview',
    '/platform-connections/': 'platform-overview',
    '/platform-connections/cfm': 'platform-cfm',
    '/platform-connections/aliyun': 'platform-aliyun',
    '/platform-connections/tencent': 'platform-tencent',
    '/platform-connections/aws': 'platform-aws',
    '/platform-connections/credentials': 'platform-credentials',
    '/platform-connections/logs': 'platform-logs',
  };

  const activeMenu = pathToMenu[location.pathname];

  useEffect(() => {
    if (!activeMenu) {
      navigate('/overview', { replace: true });
    }
  }, [activeMenu, navigate]);

  const handleMenuChange = (menu: DashboardMenuKey) => {
    navigate(menuToPath[menu]);
  };

  return (
    <div className="flex h-screen w-full">
      <Sidebar activeMenu={activeMenu || 'overview'} onMenuChange={handleMenuChange} />
      <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-[#0B0D10]">
        <Header />
        <DashboardMain
          activeMenu={activeMenu || 'overview'}
          onOpenAsk={() => setAskOpen(true)}
        />
        <AskDrawer open={askOpen} onClose={() => setAskOpen(false)} />
      </main>
    </div>
  );
}
