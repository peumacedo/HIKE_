import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUserMemberships, requireOrgRole, requireSession } from '@/lib/auth/helpers';
import { createProject } from '@/lib/data/projects';
import { listTemplates } from '@/lib/data/templates';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { SectionCard } from '@/components/ui/SectionCard';

export default async function NewProjectPage() {
  const user = await requireSession();
  const memberships = await getUserMemberships();
  const orgId = memberships?.[0]?.organization_id;

  if (!orgId) {
    return (
      <AppShell>
        <PageHeader title="Novo projeto" description="Criação de projeto." />
        <div className="p-6">
          <SectionCard title="Sem organização vinculada">
            <p className="text-sm text-slate-600">Seu usuário não possui membership ativo.</p>
          </SectionCard>
        </div>
      </AppShell>
    );
  }

  await requireOrgRole(orgId, ['admin', 'analyst']);
  const templates = await listTemplates(orgId);

  async function createProjectAction(formData: FormData) {
    'use server';

    const project = await createProject(
      {
        organizationId: orgId,
        templateId: String(formData.get('templateId') || '') || undefined,
        name: String(formData.get('name') || ''),
        code: String(formData.get('code') || ''),
        clientName: String(formData.get('clientName') || ''),
        contractValue: Number(formData.get('contractValue') || 0) || undefined,
        startDate: String(formData.get('startDate') || '') || undefined,
        endDate: String(formData.get('endDate') || '') || undefined,
        description: String(formData.get('description') || ''),
      },
      user.id,
    );

    redirect(`/projects/${project.id}`);
  }

  return (
    <AppShell>
      <PageHeader
        title="Novo projeto"
        description="Cadastre os dados básicos para criar um projeto financeiro."
        actions={
          <Link href="/projects" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800">
            Voltar
          </Link>
        }
      />
      <div className="p-6">
        <SectionCard title="Dados do projeto">
          <form action={createProjectAction} className="grid gap-3">
            <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" name="name" placeholder="Nome" required />
            <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" name="code" placeholder="Código" required />
            <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" name="clientName" placeholder="Cliente" />
            <input
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              name="contractValue"
              placeholder="Valor contratual"
              type="number"
              step="0.01"
            />
            <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" name="startDate" type="date" />
            <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" name="endDate" type="date" />
            <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" name="templateId" defaultValue="">
              <option value="">Sem template</option>
              {templates.map((template) => (
                <option value={template.id} key={template.id}>
                  {template.code} - {template.name}
                </option>
              ))}
            </select>
            <textarea
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              name="description"
              placeholder="Descrição"
              rows={4}
            />
            <button type="submit" className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white">
              Criar projeto
            </button>
          </form>
        </SectionCard>
      </div>
    </AppShell>
  );
}
