import { Hero } from '@/components/landing/Hero';
import { InfrastructureSection } from '@/components/landing/InfrastructureSection';
import { LandingNavbar } from '@/components/landing/LandingNavbar';
import { ModelsSection } from '@/components/landing/ModelsSection';
import { UseCasesSection } from '@/components/landing/UseCasesSection';

export function LandingPage() {
  return (
    <div className="h-screen w-full overflow-y-auto bg-black text-white selection:bg-zinc-800 selection:text-white">
      <LandingNavbar />
      <main>
        <Hero />
        <ModelsSection />
        <InfrastructureSection />
        <UseCasesSection />
      </main>
    </div>
  );
}
