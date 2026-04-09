/// <reference path="../shims-react-router-dom.d.ts" />

import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ArrowLeftRight,
  PiggyBank,
  Target,
  Tags,
  Building2,
  Inbox,
  GitBranch,
  HandCoins,
  FileText,
  Users,
  FileCheck,
  Activity,
  Settings,
  LogOut,
  ChevronDown,
  Bot,
  CreditCard,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuBadge,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar';
import { SmartFundLogo } from '@/components/smart-fund-logo';
import { getUserRole, clearAuthToken } from '@/auth/authStorage';
import { getBankInboxCount } from '@/modules/personalFinance/services/personalFinanceApi';

// ── Navigation config ───────────────────────────────────────────────────────

const personalFinanceItems = [
  { title: 'Dashboard', href: '/finance/dashboard', icon: LayoutDashboard },
  { title: 'Transactions', href: '/finance/transactions', icon: ArrowLeftRight },
  { title: 'Budgets', href: '/finance/budgets', icon: PiggyBank },
  { title: 'Goals & Wallets', href: '/finance/goals', icon: Target },
  { title: 'Categories', href: '/finance/categories', icon: Tags },
  { title: 'Debts', href: '/finance/debts', icon: CreditCard },
];

const bankItems = [
  { title: 'Bank', href: '/finance/bank', icon: Building2 },
  { title: 'Bank Inbox', href: '/finance/bank/inbox', icon: Inbox },
  { title: 'Bank Rules', href: '/finance/bank/rules', icon: GitBranch },
];

const loanItems = [
  { title: 'Apply for a Loan', href: '/loans/apply', icon: HandCoins },
  { title: 'My Loans', href: '/loans/my', icon: FileText },
];

const adminItems = [
  { title: 'Loan Applications', href: '/admin/loans', icon: FileCheck },
  { title: 'Members', href: '/admin/users', icon: Users },
];

const bottomItems = [
  { title: 'Activity Log', href: '/activity-log', icon: Activity },
  { title: 'Settings', href: '/settings', icon: Settings },
];

// ── NavItem ─────────────────────────────────────────────────────────────────

interface NavItemProps {
  item: {
    title: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
  };
  isActive: boolean;
  badge?: number;
}

function NavItem({ item, isActive, badge }: NavItemProps) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
        <Link to={item.href}>
          <item.icon className="h-4 w-4" />
          <span>{item.title}</span>
        </Link>
      </SidebarMenuButton>
      {badge !== undefined && badge > 0 && (
        <SidebarMenuBadge>
          <Badge
            variant="secondary"
            className="h-5 min-w-5 rounded-full px-1.5 text-xs bg-warning/20 text-warning border-warning/30"
          >
            {badge}
          </Badge>
        </SidebarMenuBadge>
      )}
    </SidebarMenuItem>
  );
}

// ── AppSidebar ───────────────────────────────────────────────────────────────

export function AppSidebar() {
  const location = useLocation();
  const pathname = location.pathname;
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  const role = getUserRole();
  const isAdmin = role === 'Admin';
  const isMember = role === 'Member' || role === 'Admin';

  const [inboxCount, setInboxCount] = useState(0);

  useEffect(() => {
    getBankInboxCount().then(setInboxCount).catch(() => {});
    const id = setInterval(() => {
      getBankInboxCount().then(setInboxCount).catch(() => {});
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  const handleSignOut = () => {
    clearAuthToken();
    window.location.href = '/login';
  };

  // Derive initials from JWT username claim if available; fallback to "SF"
  const initials = 'SF';

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      {/* Header */}
      <SidebarHeader className="border-b border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/finance/dashboard" className="flex items-center gap-2">
                <SmartFundLogo showText={!isCollapsed} />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* Personal Finance */}
        <SidebarGroup>
          <SidebarGroupLabel>Personal Finance</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {personalFinanceItems.map((item) => (
                <NavItem key={item.href} item={item} isActive={pathname === item.href} />
              ))}
              {/* AI Assistant */}
              <NavItem
                item={{ title: 'AI Assistant', href: '/finance/ai-chat', icon: Bot }}
                isActive={pathname === '/finance/ai-chat'}
              />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Bank — collapsible */}
        <Collapsible defaultOpen className="group/collapsible">
          <SidebarGroup>
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="cursor-pointer hover:bg-sidebar-accent rounded-md transition-colors">
                <span>Bank</span>
                <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {bankItems.map((item) => (
                    <NavItem
                      key={item.href}
                      item={item}
                      isActive={pathname === item.href}
                      badge={item.href === '/finance/bank/inbox' ? inboxCount : undefined}
                    />
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        {/* Loans — members only */}
        {isMember && (
          <SidebarGroup>
            <SidebarGroupLabel>Loans</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {loanItems.map((item) => (
                  <NavItem key={item.href} item={item} isActive={pathname === item.href} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Admin — admins only */}
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <NavItem key={item.href} item={item} isActive={pathname === item.href} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Bottom */}
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              {bottomItems.map((item) => (
                <NavItem key={item.href} item={item} isActive={pathname === item.href} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer / User menu */}
      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="w-full">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className={cn('flex flex-col items-start text-left', isCollapsed && 'hidden')}>
                    <span className="text-sm font-medium truncate max-w-[140px]">
                      {role === 'Admin' ? 'Admin' : 'Member'}
                    </span>
                    <span className="text-xs text-muted-foreground truncate max-w-[140px]">
                      SmartFund
                    </span>
                  </div>
                  <ChevronDown
                    className={cn('ml-auto h-4 w-4 text-muted-foreground', isCollapsed && 'hidden')}
                  />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" side="top" className="w-56">
                <DropdownMenuItem asChild>
                  <Link to="/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
