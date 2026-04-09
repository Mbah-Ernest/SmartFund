/// <reference path="../shims-react-router-dom.d.ts" />

import { Outlet, useLocation } from 'react-router-dom';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { ThemeToggle } from '@/components/theme-toggle';
import { AppSidebar } from '@/components/app-sidebar';
import ChatWidget from '@/components/ChatWidget';
import { usePrivacy } from '@/contexts/PrivacyContext';
import { Eye, EyeOff } from 'lucide-react';

const ROUTE_LABELS: Record<string, string> = {
  '/finance/dashboard': 'Dashboard',
  '/finance/transactions': 'Transactions',
  '/finance/budgets': 'Budgets',
  '/finance/goals': 'Goals & Wallets',
  '/finance/categories': 'Categories',
  '/finance/debts': 'Debts',
  '/finance/bank': 'Bank',
  '/finance/bank/inbox': 'Bank Inbox',
  '/finance/bank/rules': 'Bank Rules',
  '/finance/ai-chat': 'AI Assistant',
  '/loans/apply': 'Apply for a Loan',
  '/loans/my': 'My Loans',
  '/admin/loans': 'Loan Applications',
  '/admin/users': 'Members',
  '/activity-log': 'Activity Log',
  '/settings': 'Settings',
};

export default function BaseLayout() {
  const { isPrivate, toggle } = usePrivacy();
  const location = useLocation();
  const pageLabel = ROUTE_LABELS[location.pathname];

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="h-svh overflow-hidden overflow-x-hidden">
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-4">
          {pageLabel && (
            <span className="text-sm text-muted-foreground font-medium truncate">
              {pageLabel}
            </span>
          )}
          <div className="flex-1" />
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={toggle}
              className="inline-flex items-center justify-center rounded-md h-9 w-9 hover:bg-accent hover:text-accent-foreground transition-colors"
              aria-label={isPrivate ? 'Show amounts' : 'Hide amounts'}
              title={isPrivate ? 'Privacy mode on — click to reveal' : 'Hide sensitive amounts'}
            >
              {isPrivate ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 flex flex-col overflow-hidden overflow-x-hidden">
          <Outlet />
        </main>
      </SidebarInset>
      <ChatWidget />
    </SidebarProvider>
  );
}
