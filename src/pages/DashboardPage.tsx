import { useState } from 'react';
import { DashboardMain } from '@/components/dashboard/DashboardMain';
import { Header } from '@/components/dashboard/Header';
import { Sidebar, type DashboardMenuKey } from '@/components/dashboard/Sidebar';

export function DashboardPage() {
  const [activeMenu, setActiveMenu] = useState<DashboardMenuKey>('overview');

  return (
    <div className="flex h-screen w-full">
      <Sidebar activeMenu={activeMenu} onMenuChange={setActiveMenu} />
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[#0B0D10]">
        <Header />
        <DashboardMain activeMenu={activeMenu} />
      </main>
    </div>
  );
}
