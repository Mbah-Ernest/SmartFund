import { useEffect, useState } from 'react';
import { applyTheme, getStoredTheme, setStoredTheme } from '../theme/theme';
import {
  getPersonalFinanceSettings,
  updatePersonalFinanceSettings,
  resetPersonalFinanceData
} from '../modules/personalFinance/services/personalFinanceApi';
import type { PersonalFinanceSettingsDto } from '../modules/personalFinance/types/financeTypes';

export default function SettingsPage() {
  const [mode, setMode] = useState<'light' | 'dark'>(() => getStoredTheme() ?? 'light');

  // ── Personal Finance Settings ─────────────────────────────────────────────
  const [pfSettings, setPfSettings] = useState<PersonalFinanceSettingsDto | null>(null);
  const [pfLoading, setPfLoading] = useState(true);
  const [launchDate, setLaunchDate] = useState('');
  const [savingDate, setSavingDate] = useState(false);
  const [dateMsg, setDateMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // ── Reset ─────────────────────────────────────────────────────────────────
  const [resetConfirm, setResetConfirm] = useState('');
  const [resetting, setResetting] = useState(false);
  const [resetMsg, setResetMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    applyTheme(mode);
    setStoredTheme(mode);
  }, [mode]);

  useEffect(() => {
    getPersonalFinanceSettings()
      .then((s) => {
        setPfSettings(s);
        setLaunchDate(s.launchDateUtc.slice(0, 10));
      })
      .catch(() => { /* non-critical — keep defaults */ })
      .finally(() => setPfLoading(false));
  }, []);

  async function handleSaveLaunchDate(e: React.FormEvent) {
    e.preventDefault();
    setSavingDate(true);
    setDateMsg(null);
    try {
      if (!launchDate) throw new Error('Pick a date.');
      await updatePersonalFinanceSettings(launchDate);
      setDateMsg({ ok: true, text: 'Launch date saved.' });
      const updated = await getPersonalFinanceSettings();
      setPfSettings(updated);
    } catch (err: unknown) {
      setDateMsg({ ok: false, text: err instanceof Error ? err.message : 'Failed to save.' });
    } finally {
      setSavingDate(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (resetConfirm !== 'RESET') return;
    setResetting(true);
    setResetMsg(null);
    try {
      const result = await resetPersonalFinanceData();
      setResetMsg({ ok: true, text: result.message });
      setResetConfirm('');
      // Refresh settings to show updated lastResetAtUtc
      const updated = await getPersonalFinanceSettings();
      setPfSettings(updated);
    } catch (err: unknown) {
      setResetMsg({ ok: false, text: err instanceof Error ? err.message : 'Reset failed.' });
    } finally {
      setResetting(false);
    }
  }

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

      {/* ── Appearance ── */}
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

      {/* ── Personal Finance Settings ── */}
      <div className="rounded-2xl bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(59,130,246,0.04)] ring-1 ring-slate-200/60 dark:bg-slate-900 dark:ring-slate-800 space-y-5">
        <div>
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">Personal Finance Settings</h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Control how far back bank sync should fetch transactions on first connect.
          </p>
        </div>

        {pfLoading ? (
          <div className="h-8 w-40 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
        ) : (
          <form onSubmit={handleSaveLaunchDate} className="flex flex-wrap items-end gap-4">
            <label className="block">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Launch Date (backfill from)
              </span>
              <input
                type="date"
                value={launchDate}
                onChange={(e) => setLaunchDate(e.target.value)}
                max={new Date().toISOString().slice(0, 10)}
                className="mt-1 block rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
              />
            </label>
            <button
              type="submit"
              disabled={savingDate}
              className="rounded-xl bg-blue-500 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-blue-600 disabled:opacity-50"
            >
              {savingDate ? 'Saving…' : 'Save'}
            </button>
          </form>
        )}

        {dateMsg && (
          <p className={`text-xs font-medium ${dateMsg.ok ? 'text-emerald-600' : 'text-rose-600'}`}>
            {dateMsg.text}
          </p>
        )}

        {pfSettings?.lastResetAtUtc && (
          <p className="text-xs text-slate-400">
            Last reset:{' '}
            {new Date(pfSettings.lastResetAtUtc).toLocaleString('en-NG', {
              dateStyle: 'medium',
              timeStyle: 'short'
            })}
          </p>
        )}
      </div>

      {/* ── Danger Zone: Reset ── */}
      <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-6 dark:border-rose-900/40 dark:bg-rose-950/10 space-y-4">
        <div>
          <h2 className="text-sm font-bold text-rose-700 dark:text-rose-400">Danger Zone</h2>
          <p className="mt-0.5 text-xs text-rose-600/80 dark:text-rose-400/70">
            Reset personal finance data. This will permanently delete:
          </p>
          <ul className="mt-2 list-disc pl-4 text-xs text-rose-600/80 dark:text-rose-400/70 space-y-0.5">
            <li>All imported bank transactions (inbox)</li>
            <li>All personal transactions created from bank imports (with their ledger entries)</li>
            <li>All sync counters — accounts will re-sync from the launch date</li>
          </ul>
          <p className="mt-2 text-xs font-medium text-rose-700 dark:text-rose-400">
            Manual transactions you recorded yourself are NOT deleted.
          </p>
        </div>

        <form onSubmit={handleReset} className="space-y-3">
          <label className="block">
            <span className="text-xs font-medium text-rose-700 dark:text-rose-400">
              Type <strong>RESET</strong> to confirm
            </span>
            <input
              type="text"
              value={resetConfirm}
              onChange={(e) => setResetConfirm(e.target.value)}
              placeholder="RESET"
              className="mt-1 block w-full max-w-xs rounded-lg border border-rose-300 bg-white px-3 py-2 text-sm placeholder-rose-300 focus:border-rose-400 focus:ring-1 focus:ring-rose-400 dark:border-rose-900/50 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-rose-900"
            />
          </label>

          <button
            type="submit"
            disabled={resetting || resetConfirm !== 'RESET'}
            className="rounded-xl bg-rose-600 px-5 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {resetting ? 'Resetting…' : 'Reset Personal Finance Data'}
          </button>
        </form>

        {resetMsg && (
          <p className={`text-xs font-medium ${resetMsg.ok ? 'text-emerald-600' : 'text-rose-600'}`}>
            {resetMsg.text}
          </p>
        )}
      </div>
    </div>
  );
}
