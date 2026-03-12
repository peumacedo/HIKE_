import { getUserMemberships, requireSession } from '@/lib/auth/helpers';
import { listTemplates } from '@/lib/data/templates';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { SectionCard } from '@/components/ui/SectionCard';

export default async function TemplatesPage() {
  await requireSession();
  const memberships = await getUserMemberships();
  const orgId = memberships?.[0]?.organization_id;
  const templates = orgId ? await listTemplates(orgId) : [];

  return (
    <AppShell>
      <PageHeader
        title="Templates"
        description="Base de templates por organização para padronizar a criação dos projetos."
      />
      <div className="grid gap-4 p-6">
        {templates.length === 0 ? (
          <SectionCard title="Nenhum template cadastrado">
            <p className="text-sm text-slate-600">Cadastre templates para acelerar a abertura de projetos.</p>
          </SectionCard>
        ) : (
          templates.map((template) => (
            <SectionCard key={template.id} title={`${template.code} — ${template.name}`}>
              <p className="text-sm text-slate-600">{template.description ?? 'Sem descrição.'}</p>
              <p className="mt-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                Status: {template.active ? 'Ativo' : 'Inativo'}
              </p>
            </SectionCard>
          ))
        )}
      </div>
    </AppShell>
  );
}
