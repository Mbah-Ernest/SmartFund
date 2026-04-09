import { useState } from 'react';
import {
  updatePersonalFinanceSettings,
  createWallet,
  bulkCreateCategories,
} from '../services/personalFinanceApi';
import type { PresetCategory } from '../data/onboardingPresets';

export type OnboardingStep = 0 | 1 | 2 | 3 | 4;

export interface WalletDraft {
  name: string;
  currency: string;
}

function defaultStartDate(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 3);
  return d.toISOString().split('T')[0];
}

export function useOnboardingState() {
  const [step, setStep] = useState<OnboardingStep>(0);
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [wallets, setWallets] = useState<WalletDraft[]>([]);
  const [newWalletName, setNewWalletName] = useState('');
  const [newWalletCurrency, setNewWalletCurrency] = useState('NGN');
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    () => new Set()
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function goBack() {
    if (step > 0) setStep((s) => (s - 1) as OnboardingStep);
  }

  function skipStep() {
    setError(null);
    if (step < 4) setStep((s) => (s + 1) as OnboardingStep);
  }

  function addWallet() {
    const name = newWalletName.trim();
    if (!name) return;
    setWallets((prev) => [...prev, { name, currency: newWalletCurrency }]);
    setNewWalletName('');
    setNewWalletCurrency('NGN');
  }

  function removeWallet(index: number) {
    setWallets((prev) => prev.filter((_, i) => i !== index));
  }

  function toggleCategory(key: string) {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function selectAllCategories(presets: PresetCategory[]) {
    setSelectedCategories(new Set(presets.map((p) => `${p.name}:${p.type}`)));
  }

  function clearAllCategories() {
    setSelectedCategories(new Set());
  }

  async function submitStep1() {
    setError(null);
    setSaving(true);
    try {
      await updatePersonalFinanceSettings(startDate);
      setStep(2);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  }

  async function submitStep2() {
    setError(null);
    if (wallets.length === 0) {
      setStep(3);
      return;
    }
    setSaving(true);
    try {
      for (const w of wallets) {
        await createWallet({ name: w.name, currency: w.currency });
      }
      setStep(3);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create wallet.');
    } finally {
      setSaving(false);
    }
  }

  async function submitStep3() {
    setError(null);
    if (selectedCategories.size === 0) {
      setStep(4);
      return;
    }
    setSaving(true);
    try {
      const categories = Array.from(selectedCategories).map((key) => {
        const [name, typeStr] = key.split(':');
        return { name, type: parseInt(typeStr, 10) };
      });
      await bulkCreateCategories(categories);
      setStep(4);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create categories.');
    } finally {
      setSaving(false);
    }
  }

  return {
    step,
    startDate,
    setStartDate,
    wallets,
    newWalletName,
    setNewWalletName,
    newWalletCurrency,
    setNewWalletCurrency,
    addWallet,
    removeWallet,
    selectedCategories,
    toggleCategory,
    selectAllCategories,
    clearAllCategories,
    saving,
    error,
    goBack,
    skipStep,
    submitStep1,
    submitStep2,
    submitStep3,
  };
}
