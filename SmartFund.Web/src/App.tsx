/// <reference path="./shims-react-router-dom.d.ts" />

import { Navigate, Route, Routes } from 'react-router-dom';
import RequireAuth from './auth/RequireAuth';
import BaseLayout from './layouts/BaseLayout';
import Dashboard from './pages/Dashboard';
import InvestorsPage from './pages/InvestorsPage';
import DealsPage from './pages/DealsPage';
import TranchesPage from './pages/TranchesPage';
import InsurancePage from './pages/InsurancePage';
import LedgerPage from './pages/LedgerPage';
import SettingsPage from './pages/SettingsPage';
import ActivityLogPage from './pages/ActivityLogPage';
import LoginPage from './pages/LoginPage';
import PersonalDashboard from './modules/personalFinance/pages/PersonalDashboard';
import TransactionsPage from './modules/personalFinance/pages/TransactionsPage';
import BudgetPage from './modules/personalFinance/pages/BudgetPage';
import GoalsPage from './modules/personalFinance/pages/GoalsPage';
import CategoriesPage from './modules/personalFinance/pages/CategoriesPage';
import BankConnectionPage from './modules/personalFinance/pages/BankConnectionPage';
import BankInboxPage from './modules/personalFinance/pages/BankInboxPage';
import BankRulesPage from './modules/personalFinance/pages/BankRulesPage';
import AiChatPage from './modules/personalFinance/pages/AiChatPage';

export default function App() {
  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />

      <Route
        element={
          <RequireAuth>
            <BaseLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="investors" element={<InvestorsPage />} />
        <Route path="deals" element={<DealsPage />} />
        <Route path="tranches" element={<TranchesPage />} />
        <Route path="insurance" element={<InsurancePage />} />
        <Route path="ledger" element={<LedgerPage />} />
        <Route path="activity-log" element={<ActivityLogPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="finance/dashboard" element={<PersonalDashboard />} />
        <Route path="finance/transactions" element={<TransactionsPage />} />
        <Route path="finance/budgets" element={<BudgetPage />} />
        <Route path="finance/goals" element={<GoalsPage />} />
        <Route path="finance/categories" element={<CategoriesPage />} />
        <Route path="finance/bank" element={<BankConnectionPage />} />
        <Route path="finance/bank/inbox" element={<BankInboxPage />} />
        <Route path="finance/bank/rules" element={<BankRulesPage />} />
        <Route path="finance/bank-test" element={<BankConnectionPage />} />
        <Route path="finance/ai-chat" element={<AiChatPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
