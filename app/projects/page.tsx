import Link from 'next/link';
import { getUserMemberships, requireSession } from '@/lib/auth/helpers';
import { listProjects } from '@/lib/data/projects';

export default async function ProjectsPage() {
  await requireSession();
  const memberships = await getUserMemberships();
  const orgId = memberships?.[0]?.organization_id;

  const projects = orgId ? await listProjects(orgId) : [];

  return (
    <main>
      <h1>Projetos</h1>
      <nav style={{ display: 'flex', gap: '1rem' }}>
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/projects/new">Novo projeto</Link>
      </nav>

      <ul>
        {projects.map((project) => (
          <li key={project.id}>
            <Link href={`/projects/${project.id}`}>
              {project.code} — {project.name}
            </Link>{' '}
            ({project.status})
          </li>
        ))}
      </ul>
    </main>
  );
}
