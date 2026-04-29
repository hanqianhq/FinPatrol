import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { DashboardMain } from '@/components/dashboard/DashboardMain';
import { Header } from '@/components/dashboard/Header';
import { Sidebar, type DashboardMenuKey } from '@/components/dashboard/Sidebar';

export function DashboardPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const menuToPath: Record<DashboardMenuKey, string> = {
    overview: '/overview',
    workflow: '/workflow',
    'execution-history': '/execution-history',
    'aliyun-funds': '/aliyun-funds',
    'model-config': '/model-config',
    'token-config': '/token-config',
  };

  const pathToMenu: Record<string, DashboardMenuKey> = {
    '/overview': 'overview',
    '/overview/': 'overview',
    '/workflow': 'workflow',
    '/execution-history': 'execution-history',
    '/aliyun-funds': 'aliyun-funds',
    '/model-config': 'model-config',
    '/token-config': 'token-config',
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
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[#0B0D10]">
        <Header />
        <DashboardMain activeMenu={activeMenu || 'overview'} />
      </main>
    </div>
  );
}
