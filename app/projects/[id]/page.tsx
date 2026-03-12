import Link from 'next/link';
import { getProjectById } from '@/lib/data/projects';
import { requireSession } from '@/lib/auth/helpers';

type ProjectPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProjectDetailPage({ params }: ProjectPageProps) {
  await requireSession();
  const { id } = await params;
  const project = await getProjectById(id);

  return (
    <main>
      <h1>Projeto {project.code}</h1>
      <Link href="/projects">← Voltar para lista</Link>

      <section>
        <h2>Identificação</h2>
        <p>
          <strong>Nome:</strong> {project.name}
        </p>
        <p>
          <strong>Status:</strong> {project.status}
        </p>
      </section>

      <section>
        <h2>Template vinculado</h2>
        <p>{project.project_templates ? `${project.project_templates.code} - ${project.project_templates.name}` : 'Sem template'}</p>
      </section>

      <section>
        <h2>Cliente e contrato</h2>
        <p>
          <strong>Cliente:</strong> {project.client_name ?? 'Não informado'}
        </p>
        <p>
          <strong>Valor contratual:</strong> {project.contract_value ?? 'Não informado'}
        </p>
      </section>

      <section>
        <h2>Datas</h2>
        <p>
          <strong>Início:</strong> {project.start_date ?? 'Não informado'}
        </p>
        <p>
          <strong>Fim:</strong> {project.end_date ?? 'Não informado'}
        </p>
      </section>

      <section>
        <h2>Descrição</h2>
        <p>{project.description ?? 'Sem descrição.'}</p>
      </section>
    </main>
  );
}
