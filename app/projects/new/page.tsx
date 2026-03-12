import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUserMemberships, requireOrgRole, requireSession } from '@/lib/auth/helpers';
import { createProject } from '@/lib/data/projects';
import { listTemplates } from '@/lib/data/templates';

export default async function NewProjectPage() {
  const user = await requireSession();
  const memberships = await getUserMemberships();
  const orgId = memberships?.[0]?.organization_id;

  if (!orgId) {
    return <p>Nenhuma organização vinculada.</p>;
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
    <main>
      <h1>Novo projeto</h1>
      <Link href="/projects">← Voltar</Link>

      <form action={createProjectAction} style={{ display: 'grid', gap: '0.75rem', maxWidth: 640, marginTop: '1rem' }}>
        <input name="name" placeholder="Nome" required />
        <input name="code" placeholder="Código" required />
        <input name="clientName" placeholder="Cliente" />
        <input name="contractValue" placeholder="Valor contratual" type="number" step="0.01" />
        <input name="startDate" type="date" />
        <input name="endDate" type="date" />
        <select name="templateId" defaultValue="">
          <option value="">Sem template</option>
          {templates.map((template) => (
            <option value={template.id} key={template.id}>
              {template.code} - {template.name}
            </option>
          ))}
        </select>
        <textarea name="description" placeholder="Descrição" rows={4} />
        <button type="submit">Criar projeto</button>
      </form>
    </main>
  );
}
