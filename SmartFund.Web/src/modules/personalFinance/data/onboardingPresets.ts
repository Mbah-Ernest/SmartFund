export interface PresetCategory {
  name: string;
  type: number; // 1 = Expense, 2 = Income
}

export const PRESET_CATEGORIES: PresetCategory[] = [
  // Income
  { name: 'Salary', type: 2 },
  { name: 'Freelance', type: 2 },
  { name: 'Bonus', type: 2 },
  { name: 'Business Income', type: 2 },
  { name: 'Gift', type: 2 },
  // Expense
  { name: 'Food & Groceries', type: 1 },
  { name: 'Transport', type: 1 },
  { name: 'Airtime & Data', type: 1 },
  { name: 'Rent', type: 1 },
  { name: 'Utilities', type: 1 },
  { name: 'Entertainment', type: 1 },
  { name: 'Shopping', type: 1 },
  { name: 'Health', type: 1 },
  { name: 'Savings Transfer', type: 1 },
  { name: 'Family Support', type: 1 },
];

export const SUPPORTED_CURRENCIES = ['NGN', 'USD', 'GBP', 'EUR'] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];
