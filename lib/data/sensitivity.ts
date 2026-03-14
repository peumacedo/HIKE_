import {
  CORE_FINANCIAL_PARAMETERS,
  resolveScenarioEffectiveAssumptions,
  resolveScenarioEffectiveAssumptionsWithTransientOverrides,
} from '@/lib/data/assumptions';
import { buildCashFlowProjectionFromResolvedAssumptions } from '@/lib/data/cash-flow';
import {
  calculateFundingNeedFromMonthlyProjection,
  getFundingLineById,
  simulateFundingFromMonthlyProjection,
} from '@/lib/data/funding';

type DriverVariation = { key: string; label: string; delta: number; mode: 'absolute' | 'days' };

const DEFAULT_VARIATIONS: DriverVariation[] = [
  { key: 'direct_cost_pct', label: '+5 p.p. custo direto', delta: 5, mode: 'absolute' },
  { key: 'receipt_cycle_days', label: '+10 dias recebimento', delta: 10, mode: 'days' },
  { key: 'payroll_weight_pct', label: '+5 p.p. folha', delta: 5, mode: 'absolute' },
  { key: 'contingency_pct', label: '+5 p.p. contingência', delta: 5, mode: 'absolute' },
  { key: 'advance_percentage', label: '-10 p.p. entrada inicial', delta: -10, mode: 'absolute' },
];

export async function runScenarioSensitivity(projectId: string, scenarioId: string, fundingLineId?: string) {
  const [baseResolvedAssumptions, fundingLine] = await Promise.all([
    resolveScenarioEffectiveAssumptions(projectId, scenarioId),
    fundingLineId ? getFundingLineById(fundingLineId) : Promise.resolve(null),
  ]);

  const baseProjection = await buildCashFlowProjectionFromResolvedAssumptions(projectId, baseResolvedAssumptions);
  const baseFundingNeed = calculateFundingNeedFromMonthlyProjection(projectId, baseProjection);
  const baseSimulation = fundingLine ? simulateFundingFromMonthlyProjection(projectId, fundingLine, baseProjection) : null;

  const effectiveMap = new Map(baseResolvedAssumptions.map((row) => [row.assumption_key, row.effective_value]));

  const rows: Array<{
    driver_key: string;
    variation_label: string;
    operational_result: number;
    peak_negative_cash: number;
    max_funding_need: number;
    total_funding_cost: number | null;
  }> = [];

  for (const variation of DEFAULT_VARIATIONS) {
    const originalNumeric = Number(effectiveMap.get(variation.key) ?? 0);
    const newValue = variation.mode === 'days' ? originalNumeric + variation.delta : originalNumeric + variation.delta;

    const transientResolvedAssumptions = await resolveScenarioEffectiveAssumptionsWithTransientOverrides(projectId, scenarioId, [
      {
        assumptionKey: variation.key,
        valueNumeric: newValue,
      },
    ]);

    const transientProjection = await buildCashFlowProjectionFromResolvedAssumptions(projectId, transientResolvedAssumptions);
    const need = calculateFundingNeedFromMonthlyProjection(projectId, transientProjection);
    const simulation = fundingLine ? simulateFundingFromMonthlyProjection(projectId, fundingLine, transientProjection) : null;

    rows.push({
      driver_key: variation.key,
      variation_label: variation.label,
      operational_result: need.operationalResultBeforeFunding,
      peak_negative_cash: need.peakNegativeCash,
      max_funding_need: need.maxFundingNeed,
      total_funding_cost: simulation?.totalFundingCost ?? null,
    });
  }

  return {
    base: {
      operational_result: baseFundingNeed.operationalResultBeforeFunding,
      peak_negative_cash: baseFundingNeed.peakNegativeCash,
      max_funding_need: baseFundingNeed.maxFundingNeed,
      total_funding_cost: baseSimulation?.totalFundingCost ?? null,
    },
    rows,
  };
}
