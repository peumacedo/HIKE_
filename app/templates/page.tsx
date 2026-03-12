import Link from 'next/link';
import { getUserMemberships, requireSession } from '@/lib/auth/helpers';
import { listTemplates } from '@/lib/data/templates';

export default async function TemplatesPage() {
  await requireSession();
  const memberships = await getUserMemberships();
  const orgId = memberships?.[0]?.organization_id;

  const templates = orgId ? await listTemplates(orgId) : [];

  return (
    <main>
      <h1>Templates</h1>
      <Link href="/dashboard">← Dashboard</Link>
      <ul>
        {templates.map((template) => (
          <li key={template.id}>
            <strong>{template.code}</strong> — {template.name} {template.active ? '(ativo)' : '(inativo)'}
          </li>
        ))}
      </ul>
    </main>
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';

export default function TemplatesPage() {
  return (
    <AppShell>
      <PageHeader
        title="Templates de Projeto"
        description="Camada 2 da hierarquia: parâmetros por tipologia de projeto para acelerar setup com controle."
      />
      <div className="p-6">
        <EmptyState
          title="Módulo em fundação"
          description="No bloco 3 será possível criar templates e associar parâmetros padrão por tipo de projeto."
        />
      </div>
    </AppShell>
  );
}
