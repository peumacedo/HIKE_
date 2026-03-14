import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUserMemberships, requireSession } from '@/lib/auth/helpers';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { SectionCard } from '@/components/ui/SectionCard';

export const dynamic = 'force-dynamic';
export default async function DashboardPage() {
  const user = await requireSession();
  const memberships = await getUserMemberships();
  const currentOrg = memberships?.[0];

  async function signOut() {
    'use server';

    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect('/login');
  }

  return (
    <AppShell>
      <PageHeader
        title="Dashboard"
        description="Visão inicial da sessão autenticada e atalhos para os módulos essenciais."
      />
      <div className="grid gap-4 p-6 md:grid-cols-2">
        <SectionCard title="Sessão">
          <p className="text-sm text-slate-700">Usuário: {user.email}</p>
          <p className="text-sm text-slate-700">
            Organização ativa: <strong>{currentOrg?.organizations?.name ?? 'Sem organização'}</strong>
          </p>
          <p className="text-sm text-slate-700">Papel: {currentOrg?.role ?? 'N/A'}</p>
        </SectionCard>

        <SectionCard title="Ações rápidas">
          <div className="flex flex-wrap gap-2">
            <Link className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white" href="/templates">
              Ver templates
            </Link>
            <Link className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white" href="/projects">
              Ver projetos
            </Link>
          </div>
          <form action={signOut} className="mt-4">
            <button type="submit" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800">
              Sair
            </button>
          </form>
        </SectionCard>
      </div>
    </AppShell>
  );
}
