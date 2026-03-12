import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUserMemberships, requireSession } from '@/lib/auth/helpers';
import { createClient } from '@/lib/supabase/server';

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
    <main>
      <h1>Dashboard</h1>
      <p>Usuário autenticado: {user.email}</p>
      <p>
        Organização ativa: <strong>{currentOrg?.organizations?.name ?? 'Sem organização'}</strong>
      </p>
      <p>Papel: {currentOrg?.role ?? 'N/A'}</p>

      <nav style={{ display: 'flex', gap: '1rem' }}>
        <Link href="/templates">Templates</Link>
        <Link href="/projects">Projetos</Link>
      </nav>

      <form action={signOut} style={{ marginTop: '1rem' }}>
        <button type="submit">Sair</button>
      </form>
    </main>
  );
}
