import { useEffect, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { getPersonalFinanceSettings } from '../modules/personalFinance/services/personalFinanceApi';
import { Spinner } from '@/components/ui/spinner';

type Status = 'loading' | 'configured' | 'unconfigured';

export default function RequireOnboarded({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');

  useEffect(() => {
    getPersonalFinanceSettings()
      .then((s) => setStatus(s.isConfigured ? 'configured' : 'unconfigured'))
      .catch(() => setStatus('configured')); // fail open — never lock out existing users
  }, []);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  if (status === 'unconfigured') {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
