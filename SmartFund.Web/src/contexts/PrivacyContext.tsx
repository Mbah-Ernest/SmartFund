import { createContext, useContext, useEffect, useState } from 'react';

const STORAGE_KEY = 'sf_privacy_mode';

interface PrivacyContextValue {
  isPrivate: boolean;
  toggle: () => void;
}

const PrivacyContext = createContext<PrivacyContextValue>({
  isPrivate: false,
  toggle: () => {},
});

export function PrivacyProvider({ children }: { children: React.ReactNode }) {
  const [isPrivate, setIsPrivate] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(isPrivate));
    } catch {
      // ignore
    }
  }, [isPrivate]);

  function toggle() {
    setIsPrivate((v) => !v);
  }

  return (
    <PrivacyContext.Provider value={{ isPrivate, toggle }}>
      {children}
    </PrivacyContext.Provider>
  );
}

export function usePrivacy() {
  return useContext(PrivacyContext);
}
