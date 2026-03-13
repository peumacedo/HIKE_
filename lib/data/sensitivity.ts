import {
  CORE_FINANCIAL_PARAMETERS,
  listScenarioOverrides,
  resolveScenarioEffectiveAssumptions,
  upsertScenarioOverride,
} from '@/lib/data/assumptions';
import { generateScenarioCashFlow } from '@/lib/data/cash-flow';
import { calculateProjectFundingNeed, simulateProjectFunding } from '@/lib/data/funding';
import { getProjectById } from '@/lib/data/projects';

type DriverVariation = { key: string; label: string; delta: number; mode: 'absolute' | 'days' };

const DEFAULT_VARIATIONS: DriverVariation[] = [
  { key: 'direct_cost_pct', label: '+5 p.p. custo direto', delta: 5, mode: 'absolute' },
  { key: 'receipt_cycle_days', label: '+10 dias recebimento', delta: 10, mode: 'days' },
  { key: 'payroll_weight_pct', label: '+5 p.p. folha', delta: 5, mode: 'absolute' },
  { key: 'contingency_pct', label: '+5 p.p. contingência', delta: 5, mode: 'absolute' },
  { key: 'advance_percentage', label: '-10 p.p. entrada inicial', delta: -10, mode: 'absolute' },
];

function assumptionLabelFor(key: string) {
  return CORE_FINANCIAL_PARAMETERS.find((parameter) => parameter.key === key)?.label ?? key;
}

export async function runScenarioSensitivity(projectId: string, scenarioId: string, fundingLineId?: string) {
  const project = await getProjectById(projectId);
  const [originalOverrides, effective] = await Promise.all([
    listScenarioOverrides(scenarioId),
    resolveScenarioEffectiveAssumptions(projectId, scenarioId),
  ]);
  const originalMap = new Map(originalOverrides.map((row) => [row.assumption_key, row]));
  const effectiveMap = new Map(effective.map((row) => [row.assumption_key, row.effective_value]));

  const baseFundingNeed = await calculateProjectFundingNeed(projectId, scenarioId);
  const baseSimulation = fundingLineId ? await simulateProjectFunding(projectId, fundingLineId, { scenarioId }) : null;

  const rows: Array<{
    driver_key: string;
    variation_label: string;
    operational_result: number;
    peak_negative_cash: number;
    max_funding_need: number;
    total_funding_cost: number;
  }> = [];

  for (const variation of DEFAULT_VARIATIONS) {
    const original = originalMap.get(variation.key);
    const originalNumeric = Number(original?.value_numeric ?? effectiveMap.get(variation.key) ?? 0);
    const newValue = variation.mode === 'days' ? originalNumeric + variation.delta : originalNumeric + variation.delta;

    await upsertScenarioOverride({
      organizationId: project.organization_id,
      scenarioId,
      assumptionKey: variation.key,
      assumptionLabel: assumptionLabelFor(variation.key),
      value_numeric: newValue,
      unit: variation.mode === 'days' ? 'dias' : '%',
    });

    await generateScenarioCashFlow(projectId, scenarioId, { regenerate: true });

    const need = await calculateProjectFundingNeed(projectId, scenarioId);
    const simulation = fundingLineId ? await simulateProjectFunding(projectId, fundingLineId, { scenarioId }) : null;

    rows.push({
      driver_key: variation.key,
      variation_label: variation.label,
      operational_result: need.operationalResultBeforeFunding,
      peak_negative_cash: need.peakNegativeCash,
      max_funding_need: need.maxFundingNeed,
      total_funding_cost: simulation?.totalFundingCost ?? 0,
    });

    await upsertScenarioOverride({
      organizationId: project.organization_id,
      scenarioId,
      assumptionKey: variation.key,
      assumptionLabel: assumptionLabelFor(variation.key),
      unit: original?.unit ?? (variation.mode === 'days' ? 'dias' : '%'),
      value_numeric: original?.value_numeric ?? null,
      value_text: original?.value_text ?? null,
      value_json: original?.value_json ?? null,
    });
  }

  await generateScenarioCashFlow(projectId, scenarioId, { regenerate: true });

  return {
    base: {
      operational_result: baseFundingNeed.operationalResultBeforeFunding,
      peak_negative_cash: baseFundingNeed.peakNegativeCash,
      max_funding_need: baseFundingNeed.maxFundingNeed,
      total_funding_cost: baseSimulation?.totalFundingCost ?? 0,
    },
    rows,
  };
}
