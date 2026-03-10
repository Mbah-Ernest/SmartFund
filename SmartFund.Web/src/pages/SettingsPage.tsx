import { useEffect, useState } from 'react';
import { applyTheme, getStoredTheme, setStoredTheme } from '../theme/theme';

export default function SettingsPage() {
  const [mode, setMode] = useState<'light' | 'dark'>(() => getStoredTheme() ?? 'light');

  useEffect(() => {
    applyTheme(mode);
    setStoredTheme(mode);
  }, [mode]);

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up">
        <h1 className="text-[26px] font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
          Settings
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Personalize SmartFund.
        </p>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(59,130,246,0.04)] ring-1 ring-slate-200/60 dark:bg-slate-900 dark:ring-slate-800">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">Appearance</h2>
            <p className="mt-0.5 text-xs text-slate-400">Toggle light/dark theme</p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode('light')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                mode === 'light'
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Light
            </button>
            <button
              type="button"
              onClick={() => setMode('dark')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                mode === 'dark'
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Dark
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
