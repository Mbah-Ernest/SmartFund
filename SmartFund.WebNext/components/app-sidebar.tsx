'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
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
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
} from '@/components/ui/sidebar'
import { SmartFundLogo } from '@/components/smart-fund-logo'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/apiClient'

const personalFinanceItems = [
  { title: 'Dashboard', href: '/finance/dashboard', icon: LayoutDashboard },
  { title: 'Transactions', href: '/finance/transactions', icon: ArrowLeftRight },
  { title: 'Budgets', href: '/finance/budgets', icon: PiggyBank },
  { title: 'Goals & Wallets', href: '/finance/goals', icon: Target },
  { title: 'Categories', href: '/finance/categories', icon: Tags },
]

const loanItems = [
  { title: 'Apply for a Loan', href: '/loans/apply', icon: HandCoins },
  { title: 'My Loans', href: '/loans/my', icon: FileText },
]

const adminItems = [
  { title: 'Loan Applications', href: '/admin/loans', icon: FileCheck },
  { title: 'Members', href: '/admin/users', icon: Users },
]

const bottomItems = [
  { title: 'Activity Log', href: '/activity-log', icon: Activity },
  { title: 'Settings', href: '/settings', icon: Settings },
]

interface NavItemProps {
  item: {
    title: string
    href: string
    icon: React.ComponentType<{ className?: string }>
    badge?: number
  }
  isActive: boolean
}

function NavItem({ item, isActive }: NavItemProps) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
        <Link href={item.href}>
          <item.icon className="h-4 w-4" />
          <span>{item.title}</span>
        </Link>
      </SidebarMenuButton>
      {item.badge !== undefined && item.badge > 0 && (
        <SidebarMenuBadge>
          <Badge variant="secondary" className="h-5 min-w-5 rounded-full px-1.5 text-xs bg-warning/20 text-warning">
            {item.badge}
          </Badge>
        </SidebarMenuBadge>
      )}
    </SidebarMenuItem>
  )
}

export function AppSidebar() {
  const pathname = usePathname()
  const { state } = useSidebar()
  const isCollapsed = state === 'collapsed'
  const { user, logout } = useAuth()
  const [inboxCount, setInboxCount] = useState(0)

  useEffect(() => {
    api.get('/api/bank/inbox/count')
      .then(res => setInboxCount(res.data?.count ?? 0))
      .catch(() => {})
  }, [])

  const bankItems = [
    { title: 'Bank', href: '/finance/bank', icon: Building2 },
    { title: 'Bank Inbox', href: '/finance/bank/inbox', icon: Inbox, badge: inboxCount },
    { title: 'Bank Rules', href: '/finance/bank/rules', icon: GitBranch },
  ]

  const isAdmin = user?.role?.toLowerCase() === 'admin'
  const displayName = user?.name ?? 'User'
  const displayEmail = user?.email ?? ''
  const initials = displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/finance/dashboard" className="flex items-center gap-2">
                <SmartFundLogo showText={!isCollapsed} className="h-8" />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* Personal Finance Section */}
        <SidebarGroup>
          <SidebarGroupLabel>Personal Finance</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {personalFinanceItems.map((item) => (
                <NavItem
                  key={item.href}
                  item={item}
                  isActive={pathname === item.href}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Bank Section - Collapsible */}
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
                    />
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        {/* Loans Section */}
        <SidebarGroup>
          <SidebarGroupLabel>Loans</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {loanItems.map((item) => (
                <NavItem
                  key={item.href}
                  item={item}
                  isActive={pathname === item.href}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin Section - Only for admins */}
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <NavItem
                    key={item.href}
                    item={item}
                    isActive={pathname === item.href}
                  />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Bottom Section */}
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              {bottomItems.map((item) => (
                <NavItem
                  key={item.href}
                  item={item}
                  isActive={pathname === item.href}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="w-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="" alt={displayName} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className={cn(
                    "flex flex-col items-start text-left",
                    isCollapsed && "hidden"
                  )}>
                    <span className="text-sm font-medium truncate max-w-[140px]">
                      {displayName}
                    </span>
                    <span className="text-xs text-muted-foreground truncate max-w-[140px]">
                      {displayEmail}
                    </span>
                  </div>
                  <ChevronDown className={cn(
                    "ml-auto h-4 w-4 text-muted-foreground",
                    isCollapsed && "hidden"
                  )} />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" side="top" className="w-56">
                <DropdownMenuItem asChild>
                  <Link href="/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive cursor-pointer"
                  onClick={logout}
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
  )
}
