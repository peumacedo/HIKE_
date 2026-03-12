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
  );
}
