import { Navigate, Route, Routes } from 'react-router-dom';
import { DashboardPage } from '@/pages/DashboardPage';
import { LandingPage } from '@/pages/LandingPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/overview" element={<DashboardPage />} />
      <Route path="/workflow" element={<DashboardPage />} />
      <Route path="/execution-history" element={<DashboardPage />} />
      <Route path="/aliyun-funds" element={<DashboardPage />} />
      <Route path="/model-config" element={<DashboardPage />} />
      <Route path="/token-config" element={<DashboardPage />} />
      <Route path="/platform-connections" element={<DashboardPage />} />
      <Route path="/platform-connections/cfm" element={<DashboardPage />} />
      <Route path="/platform-connections/aliyun" element={<DashboardPage />} />
      <Route path="/platform-connections/tencent" element={<DashboardPage />} />
      <Route path="/platform-connections/aws" element={<DashboardPage />} />
      <Route path="/platform-connections/credentials" element={<DashboardPage />} />
      <Route path="/platform-connections/logs" element={<DashboardPage />} />
      <Route path="/settings" element={<Navigate to="/model-config" replace />} />
      <Route path="/dashboard/*" element={<Navigate to="/overview" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
