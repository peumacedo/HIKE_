'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/premissas', label: 'Premissas' },
  { href: '/templates', label: 'Templates' },
  { href: '/projects', label: 'Projetos' },
  { href: '/fluxo-caixa', label: 'Fluxo de Caixa' },
  { href: '/funding', label: 'Funding' },
  { href: '/cenarios', label: 'Cenários' },
  { href: '/integracoes', label: 'Integrações' },
  { href: '/relatorios', label: 'Relatórios' },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 border-r border-slate-200 bg-slate-975 text-slate-100 lg:flex lg:flex-col">
      <div className="border-b border-slate-800 px-6 py-6">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Hike Advisory</p>
        <h1 className="mt-2 text-lg font-semibold">Cockpit</h1>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'block rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-900 hover:text-white',
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
