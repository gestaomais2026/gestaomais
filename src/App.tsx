import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import AuthFlow from '@/pages/AuthFlow';
import ResetPassword from '@/pages/ResetPassword';
import AnamnesePage from '@/pages/AnamnesePage';
import Layout, { Page } from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import Patients from '@/pages/Patients';
import Appointments from '@/pages/Appointments';
import Consultations from '@/pages/Consultations';
import Doctors from '@/pages/Doctors';
import Financeiro from '@/pages/Financeiro';
import ContasAPagar from '@/pages/ContasAPagar';
import { Loader2 } from 'lucide-react';

function isAnamneseRoute() {
  return window.location.pathname.replace(/\/+$/, '').endsWith('/anamnese');
}

function AppContent() {
  const { session, loading } = useAuth();
  const [page, setPage] = useState<Page>('dashboard');
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const [anamneseRoute, setAnamneseRoute] = useState(isAnamneseRoute());

  useEffect(() => {
    const handler = () => setPasswordRecovery(true);
    window.addEventListener('auth:password-recovery', handler);
    return () => window.removeEventListener('auth:password-recovery', handler);
  }, []);

  useEffect(() => {
    const handler = () => setAnamneseRoute(isAnamneseRoute());
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);

  if (anamneseRoute) {
    return <AnamnesePage />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F2E8]">
        <Loader2 className="animate-spin text-[#4F4E3A]" size={40} />
      </div>
    );
  }

  if (passwordRecovery) {
    return <ResetPassword />;
  }

  if (!session) {
    return <AuthFlow />;
  }

  return (
    <Layout currentPage={page} onNavigate={setPage}>
      {page === 'dashboard' && <Dashboard onNavigate={setPage} />}
      {page === 'patients' && <Patients />}
      {page === 'appointments' && <Appointments />}
      {page === 'consultations' && <Consultations />}
      {page === 'doctors' && <Doctors />}
      {page === 'financeiro' && <Financeiro />}
      {page === 'contasapagar' && <ContasAPagar />}
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
