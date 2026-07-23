import { useState } from 'react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import Login from '@/pages/Login';
import Layout, { Page } from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import Patients from '@/pages/Patients';
import Appointments from '@/pages/Appointments';
import Consultations from '@/pages/Consultations';
import Plans from '@/pages/Plans';
import FollowUps from '@/pages/FollowUps';
import { Loader2 } from 'lucide-react';

function AppContent() {
  const { session, loading } = useAuth();
  const [page, setPage] = useState<Page>('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F2E8]">
        <Loader2 className="animate-spin text-[#4F4E3A]" size={40} />
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  return (
    <Layout currentPage={page} onNavigate={setPage}>
      {page === 'dashboard' && <Dashboard onNavigate={setPage} />}
      {page === 'patients' && <Patients />}
      {page === 'appointments' && <Appointments />}
      {page === 'consultations' && <Consultations />}
      {page === 'plans' && <Plans />}
      {page === 'followups' && <FollowUps />}
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
