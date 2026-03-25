/// <reference path="../shims-react-router-dom.d.ts" />

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { getBankInboxCount } from '../modules/personalFinance/services/personalFinanceApi';

const SIDEBAR_COLLAPSED_KEY = 'smartfund.sidebar.collapsed';

const linkBase =
  'group flex items-center gap-3 rounded px-3 py-2 text-sm font-medium hover:bg-slate-800 hover:text-white';

const linkActive = 'bg-slate-800 text-white';
const linkInactive = 'text-slate-200';

function SideLink(props: {
  to: string;
  label: string;
  icon: ReactNode;
  collapsed: boolean;
  end?: boolean;
  badge?: number;
}) {
  return (
    <NavLink
      to={props.to}
      end={props.end}
      className={({ isActive }: { isActive: boolean }) =>
        [linkBase, isActive ? linkActive : linkInactive].join(' ')
      }
      title={props.label}
      aria-label={props.label}
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-800/60 text-slate-200 group-hover:bg-slate-700/70">
        {props.icon}
      </span>
      {props.collapsed ? null : (
        <span className="flex flex-1 items-center justify-between truncate">
          <span className="truncate">{props.label}</span>
          {props.badge != null && props.badge > 0 && (
            <span className="ml-2 shrink-0 rounded-full bg-orange-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
              {props.badge > 99 ? '99+' : props.badge}
            </span>
          )}
        </span>
      )}
    </NavLink>
  );
}

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(() =>
    localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1'
  );
  const [investmentOpen, setInvestmentOpen] = useState(true);
  const [personalFinanceOpen, setPersonalFinanceOpen] = useState(true);
  const [inboxCount, setInboxCount] = useState(0);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? '1' : '0');
  }, [collapsed]);

  useEffect(() => {
    getBankInboxCount().then(setInboxCount).catch(() => {});
    const id = setInterval(() => {
      getBankInboxCount().then(setInboxCount).catch(() => {});
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  type NavItem = { to: string; label: string; icon: ReactNode; end?: boolean; badge?: number };

  const mainItems: NavItem[] = [
    { to: '/', label: 'Dashboard', icon: <HomeIcon />, end: true },
    { to: '/investors', label: 'Investors', icon: <UsersIcon /> },
    { to: '/deals', label: 'Deals', icon: <BriefcaseIcon /> },
    { to: '/tranches', label: 'Tranches', icon: <LayersIcon /> },
    { to: '/insurance', label: 'Insurance', icon: <ShieldIcon /> },
    { to: '/ledger', label: 'Ledger', icon: <BookIcon /> }
  ];

  const personalItems: NavItem[] = [
    { to: '/finance/dashboard', label: 'My Dashboard', icon: <SparkIcon /> },
    { to: '/finance/transactions', label: 'Transactions', icon: <ArrowsIcon /> },
    { to: '/finance/budgets', label: 'Budgets', icon: <TargetIcon /> },
    { to: '/finance/goals', label: 'Goals & Wallets', icon: <WalletIcon /> },
    { to: '/finance/categories', label: 'Categories', icon: <TagIcon /> },
    { to: '/finance/bank', label: 'Bank', icon: <BankTestIcon /> },
    { to: '/finance/bank/inbox', label: 'Bank Inbox', icon: <InboxIcon />, badge: inboxCount },
    { to: '/finance/bank/rules', label: 'Bank Rules', icon: <RulesIcon /> },
    { to: '/finance/ai-chat', label: 'AI Assistant', icon: <AiIcon /> },
  ];

  return (
    <aside
      className={`bg-slate-900 text-white p-4 flex flex-col gap-6 h-screen sticky top-0 overflow-hidden transition-[width] duration-300 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="text-lg font-semibold tracking-tight">
          {collapsed ? 'SF' : 'SmartFund'}
        </div>
        <button
          type="button"
          onClick={() => setCollapsed(v => !v)}
          className="rounded-md p-2 text-slate-300 hover:bg-slate-800 hover:text-white"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <span aria-hidden>{collapsed ? '»' : '«'}</span>
        </button>
      </div>

      {collapsed ? (
        <div className="mt-2 h-px bg-slate-800" />
      ) : (
        <button
          type="button"
          onClick={() => setInvestmentOpen(v => !v)}
          className="flex items-center justify-between text-left text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-300"
        >
          <span>Investment Management</span>
          <span className="text-slate-400">{investmentOpen ? '▾' : '▸'}</span>
        </button>
      )}

      {collapsed || investmentOpen ? (
        <nav className="flex flex-col gap-1">
          {mainItems.map(i => (
            <SideLink
              key={i.to}
              to={i.to}
              label={i.label}
              icon={i.icon}
              end={i.end}
              collapsed={collapsed}
            />
          ))}
        </nav>
      ) : null}

      {collapsed ? (
        <div className="mt-2 h-px bg-slate-800" />
      ) : (
        <button
          type="button"
          onClick={() => setPersonalFinanceOpen(v => !v)}
          className="mt-2 flex items-center justify-between text-left text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-300"
        >
          <span>Personal Finance</span>
          <span className="text-slate-400">{personalFinanceOpen ? '▾' : '▸'}</span>
        </button>
      )}

      {collapsed || personalFinanceOpen ? (
        <nav className="flex flex-col gap-1">
          {personalItems.map(i => (
            <SideLink
              key={i.to}
              to={i.to}
              label={i.label}
              icon={i.icon}
              collapsed={collapsed}
              badge={i.badge}
            />
          ))}
        </nav>
      ) : null}

      <div className="mt-auto space-y-3">
        <nav className="flex flex-col gap-1">
          <SideLink
            to="/activity-log"
            label="Activity Log"
            icon={<ClockIcon />}
            collapsed={collapsed}
          />
          <SideLink
            to="/settings"
            label="Settings"
            icon={<CogIcon />}
            collapsed={collapsed}
          />
        </nav>
        {collapsed ? null : (
          <div className="text-xs text-slate-400">API: https://localhost:7274/api</div>
        )}
      </div>
    </aside>
  );
}

function HomeIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10.5L12 3l9 7.5V21a.75.75 0 01-.75.75H3.75A.75.75 0 013 21V10.5z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 21V12h6v9" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 21v-1a4 4 0 00-4-4H6a4 4 0 00-4 4v1" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7a4 4 0 11-8 0 4 4 0 018 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M22 21v-1a4 4 0 00-3-3.87" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}

function BriefcaseIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6V5a2 2 0 012-2h0a2 2 0 012 2v1" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16v14H4V7z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 12h16" />
    </svg>
  );
}

function LayersIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2l9 5-9 5-9-5 9-5z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l9 5 9-5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 17l9 5 9-5" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2l8 4v6c0 5-3.5 9.5-8 10-4.5-.5-8-5-8-10V6l8-4z" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 19a2 2 0 002 2h14" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a2 2 0 012-2h14v18H6a2 2 0 01-2-2V5z" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 14l.75 2.25L8 17l-2.25.75L5 20l-.75-2.25L2 17l2.25-.75L5 14z" />
    </svg>
  );
}

function ArrowsIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h10M7 7l3-3M7 7l3 3" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 17H7m10 0l-3-3m3 3l-3 3" />
    </svg>
  );
}

function TargetIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 13a1 1 0 100-2 1 1 0 000 2z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12h-4" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18v14H3V7z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7l2-3h14l2 3" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 14h5" />
    </svg>
  );
}

function TagIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.59 13.41L11 3H4v7l9.59 9.59a2 2 0 002.82 0l4.18-4.18a2 2 0 000-2.82z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01" />
    </svg>
  );
}

function CogIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15.5a3.5 3.5 0 110-7 3.5 3.5 0 010 7z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.4 15a7.8 7.8 0 00.1-1 7.8 7.8 0 00-.1-1l2-1.6-2-3.4-2.4 1a7.6 7.6 0 00-1.7-1l-.4-2.6h-4l-.4 2.6a7.6 7.6 0 00-1.7 1l-2.4-1-2 3.4 2 1.6a7.8 7.8 0 00-.1 1 7.8 7.8 0 00.1 1l-2 1.6 2 3.4 2.4-1c.5.4 1.1.7 1.7 1l.4 2.6h4l.4-2.6c.6-.3 1.2-.6 1.7-1l2.4 1 2-3.4-2-1.6z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function BankTestIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2l9 4v2H3V6l9-4z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 8v10M9 8v10M15 8v10M19 8v10" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 18h18v2H3v-2z" />
    </svg>
  );
}

function InboxIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2 12l2-7h16l2 7" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2 12h4l2 3h8l2-3h4v7a1 1 0 01-1 1H3a1 1 0 01-1-1v-7z" />
    </svg>
  );
}

function RulesIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h10M4 18h7" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 15l2 2 4-4" />
    </svg>
  );
}

function AiIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
    </svg>
  );
}
