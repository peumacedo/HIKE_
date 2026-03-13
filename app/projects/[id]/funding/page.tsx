import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { requireOrgRole, requireSession } from '@/lib/auth/helpers';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { SectionCard } from '@/components/ui/SectionCard';
import { getProjectById } from '@/lib/data/projects';
import {
  calculateProjectFundingNeed,
  getActiveProjectFundingSimulation,
  getFundingSimulationById,
  listFundingLinesForOrganization,
  listProjectFundingSimulations,
  saveProjectFundingSimulation,
  setActiveFundingSimulation,
  simulateProjectFunding,
} from '@/lib/data/funding';

function money(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

type Props = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ simulationId?: string }>;
};

export default async function ProjectFundingPage({ params, searchParams }: Props) {
  const user = await requireSession();
  const { id } = await params;
  const query = await searchParams;

  const project = await getProjectById(id);
  await requireOrgRole(project.organization_id, ['admin', 'analyst', 'viewer']);

  const [fundingNeed, fundingLines, simulations, activeSimulation] = await Promise.all([
    calculateProjectFundingNeed(id),
    listFundingLinesForOrganization(project.organization_id),
    listProjectFundingSimulations(id),
    getActiveProjectFundingSimulation(id),
  ]);

  const selectedSimulationId = query?.simulationId ?? activeSimulation?.simulation?.id ?? simulations[0]?.id;
  const selectedSimulation = selectedSimulationId ? await getFundingSimulationById(selectedSimulationId) : null;

  const selectedLineId = selectedSimulation?.simulation?.funding_line_id ?? fundingLines.find((line) => line.active)?.id ?? fundingLines[0]?.id;
  const preview = selectedLineId ? await simulateProjectFunding(id, selectedLineId) : null;

  const latestMonth = selectedSimulation?.months.at(-1);

  async function runSimulationAction(formData: FormData) {
    'use server';
    await requireOrgRole(project.organization_id, ['admin', 'analyst']);
    const fundingLineId = String(formData.get('fundingLineId') || '');
    const simulationName = String(formData.get('simulationName') || 'Simulação base');
    const notes = String(formData.get('notes') || '');
    const shouldActivate = String(formData.get('activate') || '') === 'on';

    const result = await simulateProjectFunding(id, fundingLineId);
    await saveProjectFundingSimulation({
      projectId: id,
      fundingLineId,
      simulationName,
      notes,
      status: shouldActivate ? 'active' : 'draft',
      createdBy: user.id,
      simulationResult: result,
    });

    revalidatePath(`/projects/${id}/funding`);
    revalidatePath(`/projects/${id}`);
  }

  async function setActiveAction(formData: FormData) {
    'use server';
    await requireOrgRole(project.organization_id, ['admin', 'analyst']);
    await setActiveFundingSimulation(String(formData.get('simulationId') || ''));
    revalidatePath(`/projects/${id}/funding`);
    revalidatePath(`/projects/${id}`);
  }

  return (
    <AppShell>
      <PageHeader
        title={`Funding • ${project.code}`}
        description="Capital de giro e custo financeiro orientados pelo fluxo mensal do projeto."
        actions={<Link href={`/projects/${id}`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800">Voltar ao projeto</Link>}
      />

      <div className="grid gap-4 p-6">
        <SectionCard title="A. Resumo do projeto">
          <div className="grid gap-3 md:grid-cols-4 text-sm">
            <div className="rounded border p-3">Pico negativo de caixa<br /><strong>{money(fundingNeed.peakNegativeCash)}</strong></div>
            <div className="rounded border p-3">Necessidade máxima de funding<br /><strong>{money(fundingNeed.maxFundingNeed)}</strong></div>
            <div className="rounded border p-3">Custo financeiro total (simulação ativa)<br /><strong>{money(activeSimulation?.simulation.total_funding_cost ?? 0)}</strong></div>
            <div className="rounded border p-3">Saldo financiado final (ativa)<br /><strong>{money(activeSimulation?.months.at(-1)?.closing_funding_balance ?? 0)}</strong></div>
          </div>
        </SectionCard>

        <SectionCard title="B. Linhas disponíveis">
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left">
                <tr>
                  <th className="p-2">Nome</th>
                  <th className="p-2">Instituição</th>
                  <th className="p-2">Taxa</th>
                  <th className="p-2">Carência</th>
                  <th className="p-2">Prazo</th>
                  <th className="p-2">IOF</th>
                  <th className="p-2">Limites</th>
                  <th className="p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {fundingLines.map((line) => (
                  <tr key={line.id} className="border-t">
                    <td className="p-2">{line.name}</td>
                    <td className="p-2">{line.lender_name ?? '—'}</td>
                    <td className="p-2">{line.rate_value}% ({line.rate_type})</td>
                    <td className="p-2">{line.grace_days ?? 0} dias</td>
                    <td className="p-2">{line.term_days ?? 0} dias</td>
                    <td className="p-2">{line.iof_tax_pct ?? line.io_f_tax_pct ?? 0}%</td>
                    <td className="p-2">{money(Number(line.minimum_amount ?? 0))} - {line.maximum_amount ? money(Number(line.maximum_amount)) : 'sem teto'}</td>
                    <td className="p-2">{line.active ? 'ativo' : 'inativo'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard title="C. Ações">
          <form action={runSimulationAction} className="grid gap-2 md:grid-cols-5 text-sm">
            <select name="fundingLineId" defaultValue={selectedLineId} className="rounded border px-2 py-1 md:col-span-2">
              {fundingLines.map((line) => <option key={line.id} value={line.id}>{line.name} • {line.lender_name ?? 'Sem instituição'}</option>)}
            </select>
            <input name="simulationName" placeholder="Nome da simulação" defaultValue={`Simulação ${new Date().toISOString().slice(0, 10)}`} className="rounded border px-2 py-1" />
            <input name="notes" placeholder="Observações" className="rounded border px-2 py-1" />
            <label className="flex items-center gap-2 rounded border px-2 py-1"><input type="checkbox" name="activate" defaultChecked />Marcar como ativa</label>
            <button className="rounded bg-slate-900 px-3 py-2 font-medium text-white md:col-span-5">Rodar simulação e salvar</button>
          </form>

          <div className="mt-4 space-y-2 text-sm">
            {simulations.map((sim) => {
              const fundingLineName = Array.isArray(sim.funding_lines)
                ? sim.funding_lines[0]?.name ?? 'Linha'
                : ((sim.funding_lines as { name?: string } | null)?.name ?? 'Linha');

              return (
                <div key={sim.id} className="flex flex-wrap items-center justify-between gap-2 rounded border p-2">
                  <div>
                    <strong>{sim.simulation_name}</strong> • {fundingLineName} • custo {money(Number(sim.total_funding_cost ?? 0))} • status {sim.status}
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/projects/${id}/funding?simulationId=${sim.id}`} className="rounded border px-2 py-1">Ver</Link>
                    {sim.status !== 'active' ? (
                      <form action={setActiveAction}>
                        <input type="hidden" name="simulationId" value={sim.id} />
                        <button className="rounded border border-emerald-500 px-2 py-1 text-emerald-700">Definir ativa</button>
                      </form>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard title="D. Resultado mensal da simulação">
          {!selectedSimulation ? (
            <p className="text-sm text-slate-600">Ainda não há simulação salva.</p>
          ) : (
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left">
                  <tr>
                    <th className="p-2">Mês</th>
                    <th className="p-2">Net projected cash</th>
                    <th className="p-2">Cumulative cash before funding</th>
                    <th className="p-2">Drawdown</th>
                    <th className="p-2">Saldo financiado</th>
                    <th className="p-2">Juros</th>
                    <th className="p-2">IOF</th>
                    <th className="p-2">Amortização</th>
                    <th className="p-2">Saldo financiado final</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedSimulation.months.map((month) => (
                    <tr key={month.id} className="border-t">
                      <td className="p-2">{String(month.month_ref).slice(0, 7)}</td>
                      <td className="p-2">{money(Number(month.projected_net_cash))}</td>
                      <td className="p-2">{money(Number(month.projected_cumulative_cash))}</td>
                      <td className="p-2">{money(Number(month.funding_drawdown))}</td>
                      <td className="p-2">{money(Number(month.funding_outstanding_balance))}</td>
                      <td className="p-2">{money(Number(month.interest_cost))}</td>
                      <td className="p-2">{money(Number(month.iof_cost))}</td>
                      <td className="p-2">{money(Number(month.principal_repayment))}</td>
                      <td className="p-2">{money(Number(month.closing_funding_balance))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        <SectionCard title="E. Leitura executiva">
          <p className="text-sm text-slate-700">
            {preview?.firstNegativeMonth
              ? `O projeto entra em caixa negativo em ${preview.firstNegativeMonth}.`
              : 'O fluxo projetado não entra em caixa negativo no horizonte atual.'}{' '}
            O pico de exposição é {money(Math.abs(preview?.peakNegativeCash ?? 0))} e a necessidade máxima estimada é {money(preview?.maxFundingNeed ?? 0)}.{' '}
            Com a linha simulada, o custo financeiro total é {money(preview?.totalFundingCost ?? 0)} (juros {money(preview?.totalInterestCost ?? 0)} + IOF {money(preview?.totalIofCost ?? 0)}),
            levando o resultado do projeto de {money(preview?.operationalResultBeforeFunding ?? 0)} para {money(preview?.resultAfterFunding ?? 0)}.
            {preview && preview.totalFundingCost > preview.maxFundingNeed * 0.15
              ? ' A linha parece pesada para a estrutura de caixa do projeto.'
              : ' A linha parece viável no contexto do fluxo atual.'}
          </p>
          {latestMonth ? (
            <p className="mt-2 text-xs text-slate-500">Saldo financiado de fechamento na simulação selecionada: {money(Number(latestMonth.closing_funding_balance))}.</p>
          ) : null}
        </SectionCard>
      </div>
    </AppShell>
  );
}
