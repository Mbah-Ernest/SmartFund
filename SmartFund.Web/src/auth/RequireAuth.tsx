import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { getAuthToken } from './authStorage';

export default function RequireAuth({ children }: { children: ReactNode }) {
  const token = getAuthToken();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
