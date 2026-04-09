/// <reference path="../shims-react-router-dom.d.ts" />

import { Outlet } from 'react-router-dom';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { ThemeToggle } from '@/components/theme-toggle';
import { AppSidebar } from '@/components/app-sidebar';
import ChatWidget from '@/components/ChatWidget';
import { usePrivacy } from '@/contexts/PrivacyContext';
import { Eye, EyeOff } from 'lucide-react';

export default function BaseLayout() {
  const { isPrivate, toggle } = usePrivacy();

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex-1" />
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
        </header>
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </SidebarInset>
      <ChatWidget />
    </SidebarProvider>
  );
}
