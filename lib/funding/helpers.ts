type FundingLineEligibilityInput = {
  active?: boolean | null;
  minimum_amount?: number | string | null;
  maximum_amount?: number | string | null;
  requires_guarantee?: boolean | null;
};

type ExecutiveSourceSimulation = {
  simulation: {
    peak_negative_cash?: number | null;
    max_funding_need?: number | null;
    total_funding_cost?: number | null;
    total_interest_cost?: number | null;
    total_iof_cost?: number | null;
  };
  months: Array<{
    projected_net_cash?: number | null;
    iof_cost?: number | null;
    closing_funding_balance?: number | null;
    month_ref?: string | null;
  }>;
};

type ExecutiveSourcePreview = {
  firstNegativeMonth: string | null;
  peakNegativeCash: number;
  maxFundingNeed: number;
  totalFundingCost: number;
  totalInterestCost: number;
  totalIofCost: number;
  operationalResultBeforeFunding: number;
  resultAfterFunding: number;
  finalFundingBalance: number;
};

export type FundingLineEligibility = {
  isEligible: boolean;
  reasons: string[];
};

export type ExecutiveFundingRead = {
  source: 'saved_simulation' | 'preview' | 'none';
  firstNegativeMonth: string | null;
  peakNegativeCash: number;
  maxFundingNeed: number;
  totalFundingCost: number;
  totalInterestCost: number;
  totalIofCost: number;
  operationalResultBeforeFunding: number;
  resultAfterFunding: number;
  finalFundingBalance: number;
};

function toNumber(value: number | string | null | undefined) {
  if (value == null || value === '') return 0;
  return Number(value);
}

export function assessFundingLineEligibility(
  maxFundingNeed: number,
  fundingLine: FundingLineEligibilityInput,
): FundingLineEligibility {
  const reasons: string[] = [];
  let isEligible = true;

  const maximumAmount = toNumber(fundingLine.maximum_amount);
  const minimumAmount = toNumber(fundingLine.minimum_amount);

  if (!fundingLine.active) {
    isEligible = false;
    reasons.push('linha inativa');
  }

  if (maximumAmount > 0 && maximumAmount < maxFundingNeed) {
    isEligible = false;
    reasons.push('teto insuficiente');
  }

  if (minimumAmount > 0 && minimumAmount > maxFundingNeed && maxFundingNeed > 0) {
    isEligible = false;
    reasons.push('mínimo acima da necessidade');
  }

  if (fundingLine.requires_guarantee) {
    reasons.push('exige garantia');
  }

  if (reasons.length === 0) {
    reasons.push('cobre necessidade');
  }

  return { isEligible, reasons };
}

export function deriveExecutiveFundingRead(input: {
  selectedSimulation: ExecutiveSourceSimulation | null;
  preview: ExecutiveSourcePreview | null;
}): ExecutiveFundingRead {
  if (input.selectedSimulation) {
    const months = input.selectedSimulation.months ?? [];
    const firstNegative = months.find((month) => toNumber(month.projected_net_cash) < 0);
    const operationalResultBeforeFunding = months.reduce((acc, month) => acc + toNumber(month.projected_net_cash), 0);
    const totalIofCost = toNumber(input.selectedSimulation.simulation.total_iof_cost) || months.reduce((acc, month) => acc + toNumber(month.iof_cost), 0);

    return {
      source: 'saved_simulation',
      firstNegativeMonth: firstNegative?.month_ref?.slice(0, 7) ?? null,
      peakNegativeCash: toNumber(input.selectedSimulation.simulation.peak_negative_cash),
      maxFundingNeed: toNumber(input.selectedSimulation.simulation.max_funding_need),
      totalFundingCost: toNumber(input.selectedSimulation.simulation.total_funding_cost),
      totalInterestCost: toNumber(input.selectedSimulation.simulation.total_interest_cost),
      totalIofCost,
      operationalResultBeforeFunding,
      resultAfterFunding: operationalResultBeforeFunding - toNumber(input.selectedSimulation.simulation.total_funding_cost),
      finalFundingBalance: toNumber(months.at(-1)?.closing_funding_balance),
    };
  }

  if (input.preview) {
    return {
      source: 'preview',
      firstNegativeMonth: input.preview.firstNegativeMonth,
      peakNegativeCash: input.preview.peakNegativeCash,
      maxFundingNeed: input.preview.maxFundingNeed,
      totalFundingCost: input.preview.totalFundingCost,
      totalInterestCost: input.preview.totalInterestCost,
      totalIofCost: input.preview.totalIofCost,
      operationalResultBeforeFunding: input.preview.operationalResultBeforeFunding,
      resultAfterFunding: input.preview.resultAfterFunding,
      finalFundingBalance: input.preview.finalFundingBalance,
    };
  }

  return {
    source: 'none',
    firstNegativeMonth: null,
    peakNegativeCash: 0,
    maxFundingNeed: 0,
    totalFundingCost: 0,
    totalInterestCost: 0,
    totalIofCost: 0,
    operationalResultBeforeFunding: 0,
    resultAfterFunding: 0,
    finalFundingBalance: 0,
  };
}
