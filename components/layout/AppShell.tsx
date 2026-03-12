import { ReactNode } from 'react';
import { SidebarNav } from './SidebarNav';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px]">
        <SidebarNav />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
