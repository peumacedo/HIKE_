import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { requireOrgRole, requireSession } from '@/lib/auth/helpers';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { SectionCard } from '@/components/ui/SectionCard';
import { getProjectById } from '@/lib/data/projects';
import {
  aggregateProjectCashFlowByMonth,
  createOmieReconciliationLink,
  createProjectCashFlowItem,
  deleteProjectCashFlowItem,
  generateBaseProjectCashFlow,
  getOmieReconciliationSummary,
  listOmieStagingCandidatesForProject,
  listProjectCashFlowItems,
  updateProjectCashFlowItem,
} from '@/lib/data/cash-flow';

const lineTypes = ['revenue', 'direct_cost', 'payroll', 'admin_allocation', 'contingency', 'tax', 'other'];

function money(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

function parseBool(value?: string) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
}

type Props = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | undefined>>;
};

export default async function ProjectCashFlowPage({ params, searchParams }: Props) {
  const user = await requireSession();
  const query = (await searchParams) ?? {};
  const { id } = await params;

  const project = await getProjectById(id);
  await requireOrgRole(project.organization_id, ['admin', 'analyst', 'viewer']);

  const [items, monthly, omieCandidates, omieSummary] = await Promise.all([
    listProjectCashFlowItems(id, {
      fromDate: query.fromDate,
      toDate: query.toDate,
      flowDirection: query.flowDirection as 'inflow' | 'outflow' | undefined,
      lineType: query.lineType as typeof lineTypes[number] | undefined,
      sourceLayer: query.sourceLayer as 'generated' | 'manual' | 'imported_omie' | 'adjustment' | undefined,
      isLocked: parseBool(query.isLocked),
    }),
    aggregateProjectCashFlowByMonth(id),
    listOmieStagingCandidatesForProject(id),
    getOmieReconciliationSummary(id),
  ]);

  const totals = monthly.reduce(
    (acc, row) => {
      acc.projectedIn += row.projected_inflows;
      acc.projectedOut += row.projected_outflows;
      acc.actualIn += row.actual_inflows;
      acc.actualOut += row.actual_outflows;
      return acc;
    },
    { projectedIn: 0, projectedOut: 0, actualIn: 0, actualOut: 0 },
  );

  let cumulative = 0;
  let peakNegative = 0;
  const monthlyWithAccum = monthly.map((row) => {
    cumulative += row.projected_net;
    peakNegative = Math.min(peakNegative, cumulative);
    return { ...row, cumulative };
  });

  async function generateBaseAction() {
    'use server';
    await requireOrgRole(project.organization_id, ['admin', 'analyst']);
    await generateBaseProjectCashFlow(project.id, { createdBy: user.id });
    revalidatePath(`/projects/${project.id}/cash-flow`);
  }

  async function regenerateAction() {
    'use server';
    await requireOrgRole(project.organization_id, ['admin', 'analyst']);
    await generateBaseProjectCashFlow(project.id, { regenerate: true, createdBy: user.id });
    revalidatePath(`/projects/${project.id}/cash-flow`);
  }

  async function addManualItemAction(formData: FormData) {
    'use server';
    await requireOrgRole(project.organization_id, ['admin', 'analyst']);
    await createProjectCashFlowItem({
      organizationId: project.organization_id,
      projectId: project.id,
      sourceLayer: 'manual',
      flowDirection: String(formData.get('flowDirection')) as 'inflow' | 'outflow',
      lineType: String(formData.get('lineType')) as never,
      description: String(formData.get('description') || ''),
      categoryName: String(formData.get('categoryName') || ''),
      competenceDate: String(formData.get('competenceDate') || '') || undefined,
      expectedCashDate: String(formData.get('expectedCashDate') || '') || undefined,
      amount: Number(formData.get('amount') || 0),
      isLocked: String(formData.get('isLocked') || '') === 'on',
      originReferenceJson: { created_via: 'manual_form' },
    });
    revalidatePath(`/projects/${project.id}/cash-flow`);
  }

  async function updateItemAction(formData: FormData) {
    'use server';
    await requireOrgRole(project.organization_id, ['admin', 'analyst']);
    await updateProjectCashFlowItem(String(formData.get('id')), {
      flowDirection: String(formData.get('flowDirection')) as 'inflow' | 'outflow',
      lineType: String(formData.get('lineType')) as never,
      description: String(formData.get('description') || ''),
      categoryName: String(formData.get('categoryName') || ''),
      competenceDate: String(formData.get('competenceDate') || '') || null,
      expectedCashDate: String(formData.get('expectedCashDate') || '') || null,
      amount: Number(formData.get('amount') || 0),
      isLocked: String(formData.get('isLocked') || '') === 'on',
    });
    revalidatePath(`/projects/${project.id}/cash-flow`);
  }

  async function deleteItemAction(formData: FormData) {
    'use server';
    await requireOrgRole(project.organization_id, ['admin', 'analyst']);
    await deleteProjectCashFlowItem(String(formData.get('id')));
    revalidatePath(`/projects/${project.id}/cash-flow`);
  }

  async function linkOmieAction(formData: FormData) {
    'use server';
    await requireOrgRole(project.organization_id, ['admin', 'analyst']);
    await createOmieReconciliationLink({
      organizationId: project.organization_id,
      projectId: project.id,
      omieSourceTable: String(formData.get('sourceTable')) as 'payables' | 'receivables' | 'financial_movements',
      omieStagingRecordId: String(formData.get('recordId')),
      reconciliationStatus: String(formData.get('status')) as 'pending' | 'matched' | 'ignored',
      inferredLineType: (String(formData.get('inferredLineType') || '') || undefined) as never,
      notes: String(formData.get('notes') || ''),
    });
    revalidatePath(`/projects/${project.id}/cash-flow`);
  }

  return (
    <AppShell>
      <PageHeader
        title={`Fluxo de caixa • ${project.code}`}
        description="Separação entre projetado (gerado/manual/ajustes) e realizado importado com consolidação mensal."
        actions={
          <div className="flex gap-2">
            <Link href={`/projects/${project.id}`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800">
              Voltar ao projeto
            </Link>
          </div>
        }
      />
      <div className="grid gap-4 p-6">
        <SectionCard title="Resumo executivo">
          <div className="grid gap-3 md:grid-cols-5 text-sm">
            <div className="rounded border p-3">Entradas projetadas<br /><strong>{money(totals.projectedIn)}</strong></div>
            <div className="rounded border p-3">Saídas projetadas<br /><strong>{money(totals.projectedOut)}</strong></div>
            <div className="rounded border p-3">Saldo líquido projetado<br /><strong>{money(totals.projectedIn - totals.projectedOut)}</strong></div>
            <div className="rounded border p-3">Pico negativo acumulado<br /><strong>{money(peakNegative)}</strong></div>
            <div className="rounded border p-3">Realizado importado líquido<br /><strong>{money(totals.actualIn - totals.actualOut)}</strong></div>
          </div>
        </SectionCard>

        <SectionCard title="Ações">
          <div className="flex flex-wrap gap-2">
            <form action={generateBaseAction}><button className="rounded bg-slate-900 px-3 py-2 text-sm text-white">Gerar cronograma base</button></form>
            <form action={regenerateAction}><button className="rounded border border-slate-400 px-3 py-2 text-sm">Regenerar (preserva manual/ajuste/importado/travado)</button></form>
          </div>
          <form action={addManualItemAction} className="mt-4 grid gap-2 md:grid-cols-6 text-sm">
            <select name="flowDirection" className="rounded border px-2 py-1"><option value="inflow">inflow</option><option value="outflow">outflow</option></select>
            <select name="lineType" className="rounded border px-2 py-1">{lineTypes.map((type) => <option key={type}>{type}</option>)}</select>
            <input name="categoryName" placeholder="Categoria" className="rounded border px-2 py-1" />
            <input name="description" placeholder="Descrição" className="rounded border px-2 py-1" />
            <input name="amount" type="number" step="0.01" placeholder="Valor" className="rounded border px-2 py-1" required />
            <input name="competenceDate" type="date" className="rounded border px-2 py-1" />
            <input name="expectedCashDate" type="date" className="rounded border px-2 py-1" />
            <label className="flex items-center gap-2"><input type="checkbox" name="isLocked" />travado</label>
            <button className="rounded bg-slate-700 px-3 py-2 text-white">Adicionar linha manual</button>
          </form>
        </SectionCard>

        <SectionCard title="Visão mensal consolidada">
          <table className="w-full text-sm">
            <thead><tr className="text-left"><th>Mês</th><th>Entradas proj.</th><th>Saídas proj.</th><th>Saldo proj.</th><th>Acumulado proj.</th><th>Entradas real.</th><th>Saídas real.</th><th>Saldo real.</th><th>Desvio</th></tr></thead>
            <tbody>
              {monthlyWithAccum.map((row) => (
                <tr key={row.month} className="border-t">
                  <td>{row.month}</td><td>{money(row.projected_inflows)}</td><td>{money(row.projected_outflows)}</td><td>{money(row.projected_net)}</td><td>{money(row.cumulative)}</td><td>{money(row.actual_inflows)}</td><td>{money(row.actual_outflows)}</td><td>{money(row.actual_net)}</td><td>{money(row.variance_net)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>

        <SectionCard title="Linhas de fluxo">
          <form method="get" className="mb-3 grid gap-2 md:grid-cols-6 text-sm">
            <input type="date" name="fromDate" defaultValue={query.fromDate ?? ''} className="rounded border px-2 py-1" />
            <input type="date" name="toDate" defaultValue={query.toDate ?? ''} className="rounded border px-2 py-1" />
            <select name="flowDirection" defaultValue={query.flowDirection ?? ''} className="rounded border px-2 py-1"><option value="">direção</option><option value="inflow">inflow</option><option value="outflow">outflow</option></select>
            <select name="lineType" defaultValue={query.lineType ?? ''} className="rounded border px-2 py-1"><option value="">tipo</option>{lineTypes.map((type) => <option key={type}>{type}</option>)}</select>
            <select name="sourceLayer" defaultValue={query.sourceLayer ?? ''} className="rounded border px-2 py-1"><option value="">origem</option>{['generated', 'manual', 'imported_omie', 'adjustment'].map((source) => <option key={source}>{source}</option>)}</select>
            <button className="rounded border px-2 py-1">Filtrar</button>
          </form>
          <div className="space-y-2">
            {items.map((item) => (
              <form key={item.id} action={updateItemAction} className="grid gap-2 rounded border p-2 text-xs md:grid-cols-12">
                <input type="hidden" name="id" value={item.id} />
                <input name="description" defaultValue={item.description ?? ''} className="rounded border px-2 py-1 md:col-span-2" />
                <select name="flowDirection" defaultValue={item.flow_direction} className="rounded border px-2 py-1"><option value="inflow">inflow</option><option value="outflow">outflow</option></select>
                <select name="lineType" defaultValue={item.line_type} className="rounded border px-2 py-1">{lineTypes.map((type) => <option key={type}>{type}</option>)}</select>
                <input name="categoryName" defaultValue={item.category_name ?? ''} className="rounded border px-2 py-1" />
                <input name="competenceDate" type="date" defaultValue={item.competence_date ?? ''} className="rounded border px-2 py-1" />
                <input name="expectedCashDate" type="date" defaultValue={item.expected_cash_date ?? ''} className="rounded border px-2 py-1" />
                <input name="amount" type="number" step="0.01" defaultValue={item.amount} className="rounded border px-2 py-1" />
                <label className="flex items-center gap-1"><input type="checkbox" name="isLocked" defaultChecked={item.is_locked} />travado</label>
                <div className="text-[11px] text-slate-500 md:col-span-2">origem: <strong>{item.source_layer}</strong> | tipo: {item.line_type}</div>
                <button className="rounded border px-2 py-1">Salvar</button>
                <button formAction={deleteItemAction} className="rounded border border-red-400 px-2 py-1 text-red-600" disabled={item.source_layer === 'imported_omie'}>Excluir</button>
              </form>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Ponte Omie">
          <div className="mb-3 grid gap-3 md:grid-cols-4 text-sm">
            <div className="rounded border p-2">Candidatos staging<br /><strong>{omieCandidates.payables.length + omieCandidates.receivables.length + omieCandidates.financial_movements.length}</strong></div>
            <div className="rounded border p-2">Pendentes<br /><strong>{omieSummary.pending}</strong></div>
            <div className="rounded border p-2">Matched<br /><strong>{omieSummary.matched}</strong></div>
            <div className="rounded border p-2">Ignored<br /><strong>{omieSummary.ignored}</strong></div>
          </div>
          <div className="space-y-3 text-sm">
            {[
              { key: 'receivables', label: 'Recebíveis', rows: omieCandidates.receivables },
              { key: 'payables', label: 'Pagáveis', rows: omieCandidates.payables },
              { key: 'financial_movements', label: 'Movimentos', rows: omieCandidates.financial_movements },
            ].map((section) => (
              <div key={section.key} className="rounded border p-2">
                <div className="mb-2 font-medium">{section.label} ({section.rows.length})</div>
                <div className="space-y-2">
                  {section.rows.slice(0, 6).map((row: Record<string, unknown>) => (
                    <form key={String(row.id)} action={linkOmieAction} className="grid gap-2 md:grid-cols-6">
                      <input type="hidden" name="sourceTable" value={section.key} />
                      <input type="hidden" name="recordId" value={String(row.id)} />
                      <div className="md:col-span-2">{String(row.document_number ?? row.description ?? row.id)}</div>
                      <div>{String(row.amount ?? '')}</div>
                      <select name="status" defaultValue="pending" className="rounded border px-2 py-1"><option value="pending">pending</option><option value="matched">matched</option><option value="ignored">ignored</option></select>
                      <select name="inferredLineType" className="rounded border px-2 py-1"><option value="">line type</option>{lineTypes.map((type) => <option key={type}>{type}</option>)}</select>
                      <button className="rounded border px-2 py-1">Salvar vínculo</button>
                    </form>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}
