import { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { login } from '../api/authApi';
import { toApiClientError } from '../api/apiError';
import { getAuthToken, setAuthToken } from '../auth/authStorage';

export default function LoginPage() {
  const existing = getAuthToken();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin');

  const canSubmit = useMemo(() => {
    return username.trim().length > 0 && password.length > 0 && !saving;
  }, [password, saving, username]);

  async function submit() {
    setError(null);
    if (!canSubmit) return;

    setSaving(true);
    try {
      const result = await login({
        username: username.trim(),
        password
      });

      setAuthToken(result.token);

      window.location.assign('/');
    } catch (e) {
      setError(toApiClientError(e).message);
    } finally {
      setSaving(false);
    }
  }

  if (existing) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h1 className="text-lg font-semibold text-slate-900">Sign in</h1>
          <p className="text-sm text-slate-600">SmartFund</p>
        </div>

        <div className="px-6 py-5 space-y-4">
          {error ? (
            <div className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Username</label>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              autoComplete="username"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Password</label>
            <input
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              type="password"
              autoComplete="current-password"
            />
          </div>

          <button
            type="button"
            onClick={() => void submit()}
            className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            disabled={!canSubmit}
          >
            {saving ? 'Signing in…' : 'Sign in'}
          </button>

          <div className="text-xs text-slate-500">
            Default dev credentials are configured in `SmartFund.API/appsettings.json`.
          </div>
        </div>
      </div>
    </div>
  );
}
