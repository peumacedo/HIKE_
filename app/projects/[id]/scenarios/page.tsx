import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { SectionCard } from '@/components/ui/SectionCard';
import { requireOrgRole, requireSession } from '@/lib/auth/helpers';
import { getProjectById } from '@/lib/data/projects';
import {
  CORE_FINANCIAL_PARAMETERS,
  SCENARIO_DRIVER_KEYS,
  listScenarioOverrides,
  resolveScenarioEffectiveAssumptions,
  upsertScenarioOverride,
} from '@/lib/data/assumptions';
import { archiveProjectScenario, createProjectScenario, listProjectScenarios } from '@/lib/data/scenarios';
import { generateBaseProjectCashFlow, generateScenarioCashFlow } from '@/lib/data/cash-flow';
import { calculateProjectFundingNeed, listFundingLinesForOrganization, simulateProjectFunding } from '@/lib/data/funding';
import { runScenarioSensitivity } from '@/lib/data/sensitivity';

function money(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

function parseOptionalNumber(formData: FormData, fieldName: string) {
  const raw = String(formData.get(fieldName) || '').trim();
  if (!raw) return undefined;
  const parsed = Number(raw);
  return Number.isNaN(parsed) ? undefined : parsed;
}

const DRIVER_PARAMS = CORE_FINANCIAL_PARAMETERS.filter((row) => SCENARIO_DRIVER_KEYS.includes(row.key as never));

type Props = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ scenarioId?: string }>;
};

export default async function ProjectScenariosPage({ params, searchParams }: Props) {
  await requireSession();
  const { id } = await params;
  const query = await searchParams;

  const project = await getProjectById(id);
  await requireOrgRole(project.organization_id, ['admin', 'analyst', 'viewer']);

  const [scenarios, fundingLines] = await Promise.all([
    listProjectScenarios(id),
    listFundingLinesForOrganization(project.organization_id),
  ]);

  const selectedScenarioId = query?.scenarioId ?? scenarios[0]?.id;
  const selectedScenario = scenarios.find((scenario) => scenario.id === selectedScenarioId) ?? null;
  const selectedFundingLine = fundingLines.find((line) => line.active)?.id ?? fundingLines[0]?.id;

  const [baseNeed, scenarioComparisons, selectedOverrides, selectedEffective, sensitivity] = await Promise.all([
    calculateProjectFundingNeed(id, null),
    Promise.all(
      scenarios.map(async (scenario) => {
        const need = await calculateProjectFundingNeed(id, scenario.id);
        const simulation = selectedFundingLine ? await simulateProjectFunding(id, selectedFundingLine, { scenarioId: scenario.id }) : null;
        return {
          scenario,
          need,
          simulation,
          resultAfterFunding: need.operationalResultBeforeFunding - (simulation?.totalFundingCost ?? 0),
        };
      }),
    ),
    selectedScenario ? listScenarioOverrides(selectedScenario.id) : Promise.resolve([]),
    selectedScenario ? resolveScenarioEffectiveAssumptions(id, selectedScenario.id) : Promise.resolve([]),
    selectedScenario && selectedFundingLine ? runScenarioSensitivity(id, selectedScenario.id, selectedFundingLine) : Promise.resolve(null),
  ]);

  async function createScenarioAction(formData: FormData) {
    'use server';
    await requireOrgRole(project.organization_id, ['admin', 'analyst']);
    const scenarioType = String(formData.get('scenarioType') || 'custom') as 'base' | 'conservative' | 'stress' | 'custom';
    const preset = String(formData.get('preset') || 'none');

    const scenario = await createProjectScenario({
      organizationId: project.organization_id,
      projectId: id,
      name: String(formData.get('name') || ''),
      scenarioType,
      description: String(formData.get('description') || ''),
      baseReference: String(formData.get('baseReference') || '') || undefined,
    });

    const presetValues: Record<string, number> = {};
    if (preset === 'conservative') {
      presetValues.direct_cost_pct = 5;
      presetValues.receipt_cycle_days = 10;
    }
    if (preset === 'stress') {
      presetValues.direct_cost_pct = 10;
      presetValues.receipt_cycle_days = 20;
      presetValues.contingency_pct = 5;
      presetValues.payroll_weight_pct = 5;
    }

    await Promise.all(
      Object.entries(presetValues).map(([assumptionKey, delta]) =>
        upsertScenarioOverride({
          organizationId: project.organization_id,
          scenarioId: scenario.id,
          assumptionKey,
          assumptionLabel: CORE_FINANCIAL_PARAMETERS.find((row) => row.key === assumptionKey)?.label ?? assumptionKey,
          value_numeric: delta,
          unit: CORE_FINANCIAL_PARAMETERS.find((row) => row.key === assumptionKey)?.unit ?? null,
        }),
      ),
    );

    await generateScenarioCashFlow(id, scenario.id, { regenerate: true });
    revalidatePath(`/projects/${id}/scenarios`);
  }

  async function updateOverrideAction(formData: FormData) {
    'use server';
    await requireOrgRole(project.organization_id, ['admin', 'analyst']);
    const scenarioId = String(formData.get('scenarioId') || '');
    const assumptionKey = String(formData.get('assumptionKey') || '');
    await upsertScenarioOverride({
      organizationId: project.organization_id,
      scenarioId,
      assumptionKey,
      assumptionLabel: String(formData.get('assumptionLabel') || assumptionKey),
      unit: String(formData.get('unit') || '') || undefined,
      value_numeric: parseOptionalNumber(formData, 'valueNumeric') ?? null,
    });
    await generateScenarioCashFlow(id, scenarioId, { regenerate: true });
    revalidatePath(`/projects/${id}/scenarios?scenarioId=${scenarioId}`);
  }

  async function toggleScenarioAction(formData: FormData) {
    'use server';
    await requireOrgRole(project.organization_id, ['admin', 'analyst']);
    const scenarioId = String(formData.get('scenarioId') || '');
    const active = String(formData.get('active') || '') === 'true';
    await archiveProjectScenario(scenarioId, active);
    revalidatePath(`/projects/${id}/scenarios`);
  }

  async function regenerateBaseAction() {
    'use server';
    await requireOrgRole(project.organization_id, ['admin', 'analyst']);
    await generateBaseProjectCashFlow(id, { regenerate: true });
    revalidatePath(`/projects/${id}/scenarios`);
  }

  return (
    <AppShell>
      <PageHeader
        title={`Cenários • ${project.code}`}
        description="Cenários como camada de override sobre a base do projeto (global → template → projeto → cenário)."
        actions={
          <div className="flex gap-2">
            <Link href={`/projects/${id}`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800">
              Voltar ao projeto
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 p-6">
        <SectionCard title="A. Lista de cenários">
          <div className="space-y-2 text-sm">
            {scenarios.map((scenario) => (
              <div key={scenario.id} className="flex flex-wrap items-center justify-between gap-2 rounded border p-2">
                <div>
                  <strong>{scenario.name}</strong> • {scenario.scenario_type} • {scenario.active ? 'ativo' : 'arquivado'}
                </div>
                <div className="flex gap-2">
                  <Link href={`/projects/${id}/scenarios?scenarioId=${scenario.id}`} className="rounded border px-2 py-1">
                    Abrir
                  </Link>
                  <form action={toggleScenarioAction}>
                    <input type="hidden" name="scenarioId" value={scenario.id} />
                    <input type="hidden" name="active" value={scenario.active ? 'false' : 'true'} />
                    <button className="rounded border px-2 py-1">{scenario.active ? 'Arquivar' : 'Ativar'}</button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="B. Criação de cenário">
          <form action={createScenarioAction} className="grid gap-2 text-sm md:grid-cols-5">
            <input name="name" placeholder="Nome" className="rounded border px-2 py-1" required />
            <select name="scenarioType" className="rounded border px-2 py-1">
              {['base', 'conservative', 'stress', 'custom'].map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            <input name="description" placeholder="Descrição" className="rounded border px-2 py-1" />
            <select name="preset" className="rounded border px-2 py-1">
              <option value="none">Sem preset</option>
              <option value="conservative">Preset Conservador</option>
              <option value="stress">Preset Stress</option>
            </select>
            <button className="rounded bg-slate-900 px-3 py-2 font-medium text-white">Criar cenário</button>
          </form>
        </SectionCard>

        <SectionCard title="C. Override de cenário">
          {!selectedScenario ? (
            <p className="text-sm text-slate-600">Selecione um cenário para editar drivers.</p>
          ) : (
            <div className="space-y-2">
              {DRIVER_PARAMS.map((parameter) => {
                const override = selectedOverrides.find((row) => row.assumption_key === parameter.key);
                const effective = selectedEffective.find((row) => row.assumption_key === parameter.key);
                return (
                  <form key={parameter.key} action={updateOverrideAction} className="grid gap-2 rounded border p-2 text-sm md:grid-cols-7">
                    <input type="hidden" name="scenarioId" value={selectedScenario.id} />
                    <input type="hidden" name="assumptionKey" value={parameter.key} />
                    <input type="hidden" name="assumptionLabel" value={parameter.label} />
                    <input type="hidden" name="unit" value={parameter.unit ?? ''} />
                    <div className="font-medium md:col-span-2">{parameter.label}</div>
                    <input name="valueNumeric" type="number" step="0.01" defaultValue={override?.value_numeric ?? ''} className="rounded border px-2 py-1" placeholder="override" />
                    <div className="text-xs text-slate-500">efetivo: {String(effective?.effective_value ?? '—')}</div>
                    <div className="text-xs text-slate-500">fonte: {String(effective?.source_layer ?? '—')}</div>
                    <div className="text-xs text-slate-500">unidade: {parameter.unit ?? '—'}</div>
                    <button className="rounded border px-2 py-1">Salvar</button>
                  </form>
                );
              })}
            </div>
          )}
        </SectionCard>

        <SectionCard title="D. Comparativo executivo entre cenários">
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left">
                <tr>
                  <th className="p-2">Cenário</th>
                  <th className="p-2">Resultado operacional</th>
                  <th className="p-2">Pico negativo</th>
                  <th className="p-2">Funding need máximo</th>
                  <th className="p-2">Custo financeiro</th>
                  <th className="p-2">Resultado após funding</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t">
                  <td className="p-2">Base (sem cenário)</td>
                  <td className="p-2">{money(baseNeed.operationalResultBeforeFunding)}</td>
                  <td className="p-2">{money(baseNeed.peakNegativeCash)}</td>
                  <td className="p-2">{money(baseNeed.maxFundingNeed)}</td>
                  <td className="p-2">{money(0)}</td>
                  <td className="p-2">{money(baseNeed.operationalResultBeforeFunding)}</td>
                </tr>
                {scenarioComparisons.map((row) => (
                  <tr key={row.scenario.id} className="border-t">
                    <td className="p-2">{row.scenario.name}</td>
                    <td className="p-2">{money(row.need.operationalResultBeforeFunding)}</td>
                    <td className="p-2">{money(row.need.peakNegativeCash)}</td>
                    <td className="p-2">{money(row.need.maxFundingNeed)}</td>
                    <td className="p-2">{money(row.simulation?.totalFundingCost ?? 0)}</td>
                    <td className="p-2">{money(row.resultAfterFunding)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard title="E. Sensibilidade simples (1 driver por vez)">
          {!sensitivity ? (
            <p className="text-sm text-slate-600">Selecione um cenário e configure ao menos uma linha de funding ativa para análise de sensibilidade.</p>
          ) : (
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left">
                  <tr>
                    <th className="p-2">Driver</th>
                    <th className="p-2">Variação</th>
                    <th className="p-2">Resultado operacional</th>
                    <th className="p-2">Pico negativo</th>
                    <th className="p-2">Funding máximo</th>
                    <th className="p-2">Custo financeiro</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t bg-slate-50">
                    <td className="p-2" colSpan={2}>Base do cenário</td>
                    <td className="p-2">{money(sensitivity.base.operational_result)}</td>
                    <td className="p-2">{money(sensitivity.base.peak_negative_cash)}</td>
                    <td className="p-2">{money(sensitivity.base.max_funding_need)}</td>
                    <td className="p-2">{money(sensitivity.base.total_funding_cost)}</td>
                  </tr>
                  {sensitivity.rows.map((row) => (
                    <tr key={row.variation_label} className="border-t">
                      <td className="p-2">{row.driver_key}</td>
                      <td className="p-2">{row.variation_label}</td>
                      <td className="p-2">{money(row.operational_result)}</td>
                      <td className="p-2">{money(row.peak_negative_cash)}</td>
                      <td className="p-2">{money(row.max_funding_need)}</td>
                      <td className="p-2">{money(row.total_funding_cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Ações de geração">
          <div className="flex gap-2 text-sm">
            <form action={regenerateBaseAction}><button className="rounded border px-3 py-2">Regenerar fluxo base</button></form>
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}
