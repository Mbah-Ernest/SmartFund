export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'smartfund.theme';

export function getStoredTheme(): ThemeMode | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw === 'dark' || raw === 'light' ? raw : null;
}

export function setStoredTheme(mode: ThemeMode) {
  localStorage.setItem(STORAGE_KEY, mode);
}

export function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  if (mode === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');
}

export function initTheme() {
  const stored = getStoredTheme();
  const mode: ThemeMode = stored ?? 'light';
  applyTheme(mode);
  return mode;
}
