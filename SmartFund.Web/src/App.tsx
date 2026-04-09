/// <reference path="./shims-react-router-dom.d.ts" />

import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import RequireAuth from './auth/RequireAuth';
import RequireOnboarded from './auth/RequireOnboarded';
import BaseLayout from './layouts/BaseLayout';
import SettingsPage from './pages/SettingsPage';
import ActivityLogPage from './pages/ActivityLogPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import OnboardingPage from './pages/OnboardingPage';
import LoanApplicationPage from './pages/LoanApplicationPage';
import MyLoansPage from './pages/MyLoansPage';
import AdminLoanReviewPage from './pages/AdminLoanReviewPage';
import AdminUsersPage from './pages/AdminUsersPage';
import PersonalDashboard from './modules/personalFinance/pages/PersonalDashboard';
import TransactionsPage from './modules/personalFinance/pages/TransactionsPage';
import BudgetPage from './modules/personalFinance/pages/BudgetPage';
import GoalsPage from './modules/personalFinance/pages/GoalsPage';
import CategoriesPage from './modules/personalFinance/pages/CategoriesPage';
import DebtsPage from './modules/personalFinance/pages/DebtsPage';
import BankConnectionPage from './modules/personalFinance/pages/BankConnectionPage';
import BankInboxPage from './modules/personalFinance/pages/BankInboxPage';
import BankRulesPage from './modules/personalFinance/pages/BankRulesPage';
import AiChatPage from './modules/personalFinance/pages/AiChatPage';
import { getUserRole } from './auth/authStorage';

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const role = getUserRole();
  if (role !== 'Admin') return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />
      <Route path="register" element={<RegisterPage />} />

      {/* Onboarding: auth required, no sidebar, no onboarding check (prevents redirect loop) */}
      <Route element={<RequireAuth><Outlet /></RequireAuth>}>
        <Route path="onboarding" element={<OnboardingPage />} />
      </Route>

      {/* App routes: auth + onboarding check + sidebar */}
      <Route
        element={
          <RequireAuth>
            <RequireOnboarded>
              <BaseLayout />
            </RequireOnboarded>
          </RequireAuth>
        }
      >
        <Route index element={<PersonalDashboard />} />
        <Route path="activity-log" element={<ActivityLogPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="finance/dashboard" element={<PersonalDashboard />} />
        <Route path="finance/transactions" element={<TransactionsPage />} />
        <Route path="finance/budgets" element={<BudgetPage />} />
        <Route path="finance/goals" element={<GoalsPage />} />
        <Route path="finance/categories" element={<CategoriesPage />} />
        <Route path="finance/debts" element={<DebtsPage />} />
        <Route path="finance/bank" element={<BankConnectionPage />} />
        <Route path="finance/bank/inbox" element={<BankInboxPage />} />
        <Route path="finance/bank/rules" element={<BankRulesPage />} />
        <Route path="finance/bank-test" element={<BankConnectionPage />} />
        <Route path="finance/ai-chat" element={<AiChatPage />} />

        {/* Member loan routes */}
        <Route path="loans/apply" element={<LoanApplicationPage />} />
        <Route path="loans/my" element={<MyLoansPage />} />

        {/* Admin-only routes */}
        <Route path="admin/loans" element={<RequireAdmin><AdminLoanReviewPage /></RequireAdmin>} />
        <Route path="admin/users" element={<RequireAdmin><AdminUsersPage /></RequireAdmin>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
