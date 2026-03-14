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
import { archiveProjectScenario, createProjectScenario, listProjectScenarios, updateProjectScenario } from '@/lib/data/scenarios';
import { aggregateProjectCashFlowByMonth, generateBaseProjectCashFlow, generateScenarioCashFlow } from '@/lib/data/cash-flow';
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

const SCENARIO_PRESETS: Array<{
  type: 'base' | 'conservative' | 'stress';
  name: string;
  description: string;
  deltas: Record<string, number>;
}> = [
  {
    type: 'base',
    name: 'Base',
    description: 'Sem ajustes adicionais sobre a base do projeto.',
    deltas: {},
  },
  {
    type: 'conservative',
    name: 'Conservador',
    description: 'Pressiona custo direto e prazo de recebimento.',
    deltas: {
      direct_cost_pct: 5,
      receipt_cycle_days: 10,
    },
  },
  {
    type: 'stress',
    name: 'Stress',
    description: 'Pressiona custos, recebimento e contingência.',
    deltas: {
      direct_cost_pct: 10,
      receipt_cycle_days: 20,
      contingency_pct: 5,
      payroll_weight_pct: 5,
    },
  },
];

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

  const [baseMonthlyFlow, selectedScenarioMonthlyFlow] = await Promise.all([
    aggregateProjectCashFlowByMonth(id, null),
    selectedScenario ? aggregateProjectCashFlowByMonth(id, selectedScenario.id) : Promise.resolve([]),
  ]);

  const flowByMonth = baseMonthlyFlow.map((baseRow) => {
    const scenarioRow = selectedScenarioMonthlyFlow.find((row) => row.month === baseRow.month);
    return {
      month: baseRow.month,
      baseNet: baseRow.projected_net,
      scenarioNet: scenarioRow?.projected_net ?? 0,
      deltaNet: (scenarioRow?.projected_net ?? 0) - baseRow.projected_net,
    };
  });

  const worstFundingScenario = scenarioComparisons.reduce<typeof scenarioComparisons[number] | null>((acc, row) => {
    if (!acc) return row;
    return row.need.maxFundingNeed > acc.need.maxFundingNeed ? row : acc;
  }, null);

  const bestResultScenario = scenarioComparisons.reduce<typeof scenarioComparisons[number] | null>((acc, row) => {
    if (!acc) return row;
    return row.resultAfterFunding > acc.resultAfterFunding ? row : acc;
  }, null);

  const highestPressureDriver = sensitivity?.rows.reduce<typeof sensitivity.rows[number] | null>((acc, row) => {
    if (!acc) return row;
    return row.max_funding_need > acc.max_funding_need ? row : acc;
  }, null);

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

    const presetValues = SCENARIO_PRESETS.find((item) => item.type === preset)?.deltas ?? {};

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

  async function createPresetAction(formData: FormData) {
    'use server';
    await requireOrgRole(project.organization_id, ['admin', 'analyst']);
    const presetType = String(formData.get('presetType') || '') as 'base' | 'conservative' | 'stress';
    const preset = SCENARIO_PRESETS.find((item) => item.type === presetType);
    if (!preset) return;

    const scenario = await createProjectScenario({
      organizationId: project.organization_id,
      projectId: id,
      name: preset.name,
      scenarioType: preset.type,
      description: preset.description,
      baseReference: `preset:${preset.type}`,
    });

    await Promise.all(
      Object.entries(preset.deltas).map(([assumptionKey, delta]) =>
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

  async function updateScenarioAction(formData: FormData) {
    'use server';
    await requireOrgRole(project.organization_id, ['admin', 'analyst']);
    const scenarioId = String(formData.get('scenarioId') || '');
    await updateProjectScenario(scenarioId, {
      name: String(formData.get('name') || ''),
      scenarioType: String(formData.get('scenarioType') || 'custom') as 'base' | 'conservative' | 'stress' | 'custom',
      description: String(formData.get('description') || ''),
      baseReference: String(formData.get('baseReference') || '') || undefined,
      active: String(formData.get('active') || 'true') === 'true',
    });
    revalidatePath(`/projects/${id}/scenarios?scenarioId=${scenarioId}`);
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

        <SectionCard title="B.1 Criação rápida dos cenários padrão">
          <div className="grid gap-2 md:grid-cols-3">
            {SCENARIO_PRESETS.map((preset) => (
              <form key={preset.type} action={createPresetAction} className="rounded border p-3 text-sm">
                <input type="hidden" name="presetType" value={preset.type} />
                <div className="font-medium">{preset.name}</div>
                <p className="mt-1 text-xs text-slate-600">{preset.description}</p>
                <button className="mt-2 rounded border px-2 py-1">Criar {preset.name}</button>
              </form>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="B.2 Edição de cenário selecionado">
          {!selectedScenario ? (
            <p className="text-sm text-slate-600">Selecione um cenário para editar metadados.</p>
          ) : (
            <form action={updateScenarioAction} className="grid gap-2 text-sm md:grid-cols-5">
              <input type="hidden" name="scenarioId" value={selectedScenario.id} />
              <input name="name" defaultValue={selectedScenario.name} className="rounded border px-2 py-1" required />
              <select name="scenarioType" defaultValue={selectedScenario.scenario_type} className="rounded border px-2 py-1">
                {['base', 'conservative', 'stress', 'custom'].map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              <input name="description" defaultValue={selectedScenario.description ?? ''} className="rounded border px-2 py-1" placeholder="Descrição" />
              <input name="baseReference" defaultValue={selectedScenario.base_reference ?? ''} className="rounded border px-2 py-1" placeholder="Base reference" />
              <div className="flex gap-2">
                <select name="active" defaultValue={selectedScenario.active ? 'true' : 'false'} className="rounded border px-2 py-1">
                  <option value="true">Ativo</option>
                  <option value="false">Arquivado</option>
                </select>
                <button className="rounded bg-slate-900 px-3 py-1 text-white">Salvar</button>
              </div>
            </form>
          )}
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

        <SectionCard title="D.1 Leitura executiva comparativa">
          <div className="space-y-1 text-sm text-slate-700">
            <p>
              Base do projeto: resultado operacional <strong>{money(baseNeed.operationalResultBeforeFunding)}</strong> e necessidade máxima de funding <strong>{money(baseNeed.maxFundingNeed)}</strong>.
            </p>
            <p>
              Melhor resultado após funding entre cenários simulados:{' '}
              <strong>{bestResultScenario ? `${bestResultScenario.scenario.name} (${money(bestResultScenario.resultAfterFunding)})` : 'sem cenários simulados'}</strong>.
            </p>
            <p>
              Cenário com maior pressão de funding:{' '}
              <strong>{worstFundingScenario ? `${worstFundingScenario.scenario.name} (${money(worstFundingScenario.need.maxFundingNeed)})` : 'sem cenários simulados'}</strong>.
            </p>
            <p>
              Driver com maior pressão na sensibilidade:{' '}
              <strong>{highestPressureDriver ? `${highestPressureDriver.driver_key} (${highestPressureDriver.variation_label})` : 'sensibilidade indisponível'}</strong>.
            </p>
          </div>
        </SectionCard>

        <SectionCard title="D.2 Impacto no fluxo (base x cenário selecionado)">
          {!selectedScenario ? (
            <p className="text-sm text-slate-600">Selecione um cenário para comparar o fluxo mensal com a base.</p>
          ) : (
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left">
                  <tr>
                    <th className="p-2">Mês</th>
                    <th className="p-2">Net base</th>
                    <th className="p-2">Net cenário</th>
                    <th className="p-2">Delta</th>
                  </tr>
                </thead>
                <tbody>
                  {flowByMonth.map((row) => (
                    <tr key={row.month} className="border-t">
                      <td className="p-2">{row.month}</td>
                      <td className="p-2">{money(row.baseNet)}</td>
                      <td className="p-2">{money(row.scenarioNet)}</td>
                      <td className="p-2">{money(row.deltaNet)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
