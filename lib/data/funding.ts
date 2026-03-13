import { aggregateProjectCashFlowByMonth } from '@/lib/data/cash-flow';
import { getProjectById } from '@/lib/data/projects';
import { createClient } from '@/lib/supabase/server';

export type FundingNeedMonth = {
  monthRef: string;
  projectedInflows: number;
  projectedOutflows: number;
  projectedNetCash: number;
  projectedCumulativeCash: number;
  fundingNeed: number;
};

export type FundingNeedResult = {
  projectId: string;
  monthlySeries: FundingNeedMonth[];
  firstNegativeMonth: string | null;
  peakNegativeCash: number;
  maxFundingNeed: number;
  operationalResultBeforeFunding: number;
};

export type FundingSimulationMonth = {
  monthRef: string;
  projectedNetCash: number;
  projectedCumulativeCash: number;
  fundingDrawdown: number;
  fundingOutstandingBalance: number;
  interestCost: number;
  principalRepayment: number;
  iofCost: number;
  closingFundingBalance: number;
};

export type FundingSimulationResult = {
  projectId: string;
  fundingLineId: string;
  fundingLineName: string;
  rateType: string;
  monthlyRatePct: number;
  graceMonths: number;
  termMonths: number;
  iofTaxPct: number;
  peakNegativeCash: number;
  maxFundingNeed: number;
  totalInterestCost: number;
  totalIofCost: number;
  totalFundingCost: number;
  operationalResultBeforeFunding: number;
  resultAfterFunding: number;
  finalFundingBalance: number;
  firstNegativeMonth: string | null;
  monthlySeries: FundingSimulationMonth[];
};

function round2(value: number) {
  return Number(value.toFixed(2));
}

function monthToDate(monthRef: string) {
  return `${monthRef}-01`;
}

function daysToMonths(days?: number | null) {
  if (!days || days <= 0) return 0;
  return Math.ceil(days / 30);
}

function toMonthlyRate(rateType: string, rateValue: number) {
  const safeRate = rateValue ?? 0;
  if (rateType === 'daily') return safeRate * 30;
  if (rateType === 'annual') return safeRate / 12;
  return safeRate;
}

export async function listFundingLinesForOrganization(organizationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('funding_lines')
    .select(
      'id, name, lender_name, rate_type, rate_value, grace_days, term_days, io_f_tax_pct, iof_tax_pct, minimum_amount, maximum_amount, requires_guarantee, active, notes',
    )
    .eq('organization_id', organizationId)
    .order('active', { ascending: false })
    .order('name', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function listFundingLines(organizationId: string) {
  return listFundingLinesForOrganization(organizationId);
}

export async function calculateProjectFundingNeed(projectId: string, scenarioId?: string | null): Promise<FundingNeedResult> {
  const monthly = await aggregateProjectCashFlowByMonth(projectId, scenarioId);

  let cumulativeCash = 0;
  let peakNegativeCash = 0;
  let firstNegativeMonth: string | null = null;
  let operationalResultBeforeFunding = 0;

  const monthlySeries: FundingNeedMonth[] = monthly.map((row) => {
    cumulativeCash += row.projected_net;
    operationalResultBeforeFunding += row.projected_net;

    if (cumulativeCash < 0 && firstNegativeMonth == null) {
      firstNegativeMonth = row.month;
    }

    peakNegativeCash = Math.min(peakNegativeCash, cumulativeCash);

    return {
      monthRef: row.month,
      projectedInflows: round2(row.projected_inflows),
      projectedOutflows: round2(row.projected_outflows),
      projectedNetCash: round2(row.projected_net),
      projectedCumulativeCash: round2(cumulativeCash),
      fundingNeed: round2(cumulativeCash < 0 ? Math.abs(cumulativeCash) : 0),
    };
  });

  return {
    projectId,
    monthlySeries,
    firstNegativeMonth,
    peakNegativeCash: round2(peakNegativeCash),
    maxFundingNeed: round2(Math.abs(peakNegativeCash)),
    operationalResultBeforeFunding: round2(operationalResultBeforeFunding),
  };
}

export async function simulateProjectFunding(
  projectId: string,
  fundingLineId: string,
  options?: {
    overrideGraceMonths?: number;
    overrideTermMonths?: number;
    simulationName?: string;
    scenarioId?: string | null;
  },
): Promise<FundingSimulationResult> {
  const supabase = await createClient();
  const [fundingNeed, { data: fundingLine, error: fundingLineError }] = await Promise.all([
    calculateProjectFundingNeed(projectId, options?.scenarioId),
    supabase
      .from('funding_lines')
      .select('id, name, rate_type, rate_value, grace_days, term_days, io_f_tax_pct, iof_tax_pct')
      .eq('id', fundingLineId)
      .single(),
  ]);

  if (fundingLineError) throw fundingLineError;

  const monthlyRatePct = toMonthlyRate(String(fundingLine.rate_type), Number(fundingLine.rate_value));
  const graceMonths = options?.overrideGraceMonths ?? daysToMonths(fundingLine.grace_days);
  const termMonths = options?.overrideTermMonths ?? daysToMonths(fundingLine.term_days);
  const iofTaxPct = Number(fundingLine.iof_tax_pct ?? fundingLine.io_f_tax_pct ?? 0);

  let outstanding = 0;
  let cashAfterFunding = 0;
  let totalInterestCost = 0;
  let totalIofCost = 0;
  let totalFundingCost = 0;

  const monthlySeries: FundingSimulationMonth[] = fundingNeed.monthlySeries.map((month, index) => {
    const openingBalance = outstanding;

    cashAfterFunding += month.projectedNetCash;

    let fundingDrawdown = 0;
    if (cashAfterFunding < 0) {
      fundingDrawdown = Math.abs(cashAfterFunding);
      cashAfterFunding = 0;
    }

    const iofCost = fundingDrawdown > 0 ? round2((fundingDrawdown * iofTaxPct) / 100) : 0;
    outstanding = openingBalance + fundingDrawdown + iofCost;

    const interestCost = round2((outstanding * monthlyRatePct) / 100);
    outstanding += interestCost;

    const inGracePeriod = index < graceMonths;
    const termEnded = termMonths > 0 && index >= termMonths;

    let principalRepayment = 0;
    if (!inGracePeriod && cashAfterFunding > 0 && outstanding > 0) {
      principalRepayment = Math.min(outstanding, cashAfterFunding);
      if (termEnded) {
        principalRepayment = Math.min(outstanding, cashAfterFunding + month.projectedInflows);
      }
    }

    outstanding = round2(outstanding - principalRepayment);
    cashAfterFunding = round2(Math.max(0, cashAfterFunding - principalRepayment));

    totalInterestCost += interestCost;
    totalIofCost += iofCost;
    totalFundingCost += interestCost + iofCost;

    return {
      monthRef: month.monthRef,
      projectedNetCash: month.projectedNetCash,
      projectedCumulativeCash: month.projectedCumulativeCash,
      fundingDrawdown: round2(fundingDrawdown),
      fundingOutstandingBalance: round2(openingBalance),
      interestCost,
      principalRepayment: round2(principalRepayment),
      iofCost,
      closingFundingBalance: outstanding,
    };
  });

  return {
    projectId,
    fundingLineId,
    fundingLineName: fundingLine.name,
    rateType: fundingLine.rate_type,
    monthlyRatePct: round2(monthlyRatePct),
    graceMonths,
    termMonths,
    iofTaxPct: round2(iofTaxPct),
    peakNegativeCash: fundingNeed.peakNegativeCash,
    maxFundingNeed: fundingNeed.maxFundingNeed,
    totalInterestCost: round2(totalInterestCost),
    totalIofCost: round2(totalIofCost),
    totalFundingCost: round2(totalFundingCost),
    operationalResultBeforeFunding: fundingNeed.operationalResultBeforeFunding,
    resultAfterFunding: round2(fundingNeed.operationalResultBeforeFunding - totalFundingCost),
    finalFundingBalance: round2(outstanding),
    firstNegativeMonth: fundingNeed.firstNegativeMonth,
    monthlySeries,
  };
}

export async function saveProjectFundingSimulation(input: {
  projectId: string;
  fundingLineId: string;
  simulationName: string;
  scenarioId?: string;
  notes?: string;
  status?: 'draft' | 'active' | 'archived';
  createdBy?: string;
  simulationResult: FundingSimulationResult;
}) {
  const supabase = await createClient();
  const project = await getProjectById(input.projectId);

  const { data: simulation, error: simulationError } = await supabase
    .from('project_funding_simulations')
    .insert({
      organization_id: project.organization_id,
      project_id: input.projectId,
      scenario_id: input.scenarioId ?? null,
      funding_line_id: input.fundingLineId,
      simulation_name: input.simulationName,
      status: input.status ?? 'draft',
      peak_negative_cash: input.simulationResult.peakNegativeCash,
      max_funding_need: input.simulationResult.maxFundingNeed,
      total_interest_cost: input.simulationResult.totalInterestCost,
      total_iof_cost: input.simulationResult.totalIofCost,
      total_funding_cost: input.simulationResult.totalFundingCost,
      notes: input.notes ?? null,
      created_by: input.createdBy ?? null,
    })
    .select('id, project_id')
    .single();

  if (simulationError) throw simulationError;

  const monthsPayload = input.simulationResult.monthlySeries.map((month) => ({
    simulation_id: simulation.id,
    organization_id: project.organization_id,
    project_id: input.projectId,
    scenario_id: input.scenarioId ?? null,
    month_ref: monthToDate(month.monthRef),
    projected_net_cash: month.projectedNetCash,
    projected_cumulative_cash: month.projectedCumulativeCash,
    funding_drawdown: month.fundingDrawdown,
    funding_outstanding_balance: month.fundingOutstandingBalance,
    interest_cost: month.interestCost,
    principal_repayment: month.principalRepayment,
    iof_cost: month.iofCost,
    closing_funding_balance: month.closingFundingBalance,
  }));

  if (monthsPayload.length > 0) {
    const { error: monthsError } = await supabase.from('project_funding_simulation_months').insert(monthsPayload);
    if (monthsError) throw monthsError;
  }

  if ((input.status ?? 'draft') === 'active') {
    await setActiveFundingSimulation(simulation.id);
  }

  return simulation;
}

export async function listScenarioFundingSimulations(projectId: string, scenarioId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('project_funding_simulations')
    .select('id, simulation_name, status, peak_negative_cash, max_funding_need, total_interest_cost, total_iof_cost, total_funding_cost, funding_line_id, created_at, funding_lines(name, lender_name)')
    .eq('project_id', projectId)
    .eq('scenario_id', scenarioId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function listProjectFundingSimulations(projectId: string, scenarioId?: string | null) {
  const supabase = await createClient();
  let query = supabase
    .from('project_funding_simulations')
    .select('id, simulation_name, status, peak_negative_cash, max_funding_need, total_interest_cost, total_iof_cost, total_funding_cost, funding_line_id, created_at, funding_lines(name, lender_name)')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (scenarioId !== undefined) {
    query = scenarioId === null ? query.is('scenario_id', null) : query.eq('scenario_id', scenarioId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data ?? [];
}

export async function getFundingSimulationById(simulationId: string) {
  const supabase = await createClient();
  const { data: simulation, error: simulationError } = await supabase
    .from('project_funding_simulations')
    .select('*, funding_lines(name, lender_name, rate_type, rate_value, grace_days, term_days, io_f_tax_pct, iof_tax_pct)')
    .eq('id', simulationId)
    .single();

  if (simulationError) throw simulationError;

  const { data: months, error: monthsError } = await supabase
    .from('project_funding_simulation_months')
    .select('*')
    .eq('simulation_id', simulationId)
    .order('month_ref', { ascending: true });

  if (monthsError) throw monthsError;

  return { simulation, months: months ?? [] };
}

export async function getActiveProjectFundingSimulation(projectId: string) {
  const supabase = await createClient();
  const { data: simulation, error } = await supabase
    .from('project_funding_simulations')
    .select('id, simulation_name, status, peak_negative_cash, max_funding_need, total_interest_cost, total_iof_cost, total_funding_cost, funding_line_id, funding_lines(name, lender_name)')
    .eq('project_id', projectId)
    .eq('status', 'active')
    .order('updated_at', { ascending: false })
    .maybeSingle();

  if (error) throw error;
  if (!simulation) return null;

  const { data: months, error: monthsError } = await supabase
    .from('project_funding_simulation_months')
    .select('*')
    .eq('simulation_id', simulation.id)
    .order('month_ref', { ascending: true });

  if (monthsError) throw monthsError;

  return { simulation, months: months ?? [] };
}

export async function setActiveFundingSimulation(simulationId: string) {
  const supabase = await createClient();
  const { data: row, error: rowError } = await supabase
    .from('project_funding_simulations')
    .select('id, project_id')
    .eq('id', simulationId)
    .single();

  if (rowError) throw rowError;

  const { error: archiveError } = await supabase
    .from('project_funding_simulations')
    .update({ status: 'archived' })
    .eq('project_id', row.project_id)
    .neq('id', simulationId)
    .eq('status', 'active');
  if (archiveError) throw archiveError;

  const { error: activeError } = await supabase.from('project_funding_simulations').update({ status: 'active' }).eq('id', simulationId);
  if (activeError) throw activeError;
}
