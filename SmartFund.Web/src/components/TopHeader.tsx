import { clearAuthToken, getAuthToken } from '../auth/authStorage';

export default function TopHeader() {
  const token = getAuthToken();

  function logout() {
    clearAuthToken();
    window.location.assign('/login');
  }

  return (
    <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between dark:bg-slate-950 dark:border-slate-800">
      <div className="text-sm text-slate-600 dark:text-slate-300">Dashboard</div>
      <div className="flex items-center gap-3">
        {token ? (
          <button
            type="button"
            onClick={logout}
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Logout
          </button>
        ) : null}
        <div className="text-xs text-slate-500 dark:text-slate-400">SmartFund.Web</div>
      </div>
    </header>
  );
}
