import type { Lead, LeadFiltersState, SortOption } from "@/types/lead";

const HIGH_SCORE_THRESHOLD = 85;
const MS_PER_DAY = 86_400_000;

export const SCORE_PRESETS = [
  { id: "all", label: "All", scoreMin: 0, scoreMax: 100 },
  { id: "70", label: "70+", scoreMin: 70, scoreMax: 100 },
  { id: "80", label: "80+", scoreMin: 80, scoreMax: 100 },
  { id: "85", label: "85+", scoreMin: 85, scoreMax: 100 },
  { id: "90", label: "90+", scoreMin: 90, scoreMax: 100 },
] as const;

export function getActiveScorePresetId(filters: LeadFiltersState): string {
  const match = SCORE_PRESETS.find(
    (p) => p.scoreMin === filters.scoreMin && p.scoreMax === filters.scoreMax,
  );
  return match?.id ?? "all";
}

export function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    return `$${(amount / 1_000).toFixed(0)}K`;
  }
  return `$${amount.toLocaleString()}`;
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function isNewThisWeek(fundingDate: string): boolean {
  const funded = new Date(fundingDate).getTime();
  const weekAgo = Date.now() - 7 * MS_PER_DAY;
  return funded >= weekAgo;
}

export function filterLeads(
  leads: Lead[],
  search: string,
  filters: LeadFiltersState,
): Lead[] {
  const q = search.trim().toLowerCase();

  return leads.filter((lead) => {
    if (q) {
      const haystack = [
        lead.companyName,
        lead.founderName,
        lead.industry,
        lead.location,
        lead.description,
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }

    if (filters.industry && lead.industry !== filters.industry) return false;
    if (filters.fundingRound && lead.fundingRound !== filters.fundingRound) {
      return false;
    }
    if (filters.status && lead.status !== filters.status) return false;
    if (
      lead.leadScore < filters.scoreMin ||
      lead.leadScore > filters.scoreMax
    ) {
      return false;
    }
    if (filters.savedOnly && !lead.saved) return false;

    return true;
  });
}

export function sortLeads(leads: Lead[], sort: SortOption): Lead[] {
  const sorted = [...leads];

  switch (sort) {
    case "newest-funded":
      sorted.sort(
        (a, b) =>
          new Date(b.fundingDate).getTime() - new Date(a.fundingDate).getTime(),
      );
      break;
    case "highest-score":
      sorted.sort((a, b) => b.leadScore - a.leadScore);
      break;
    case "amount-raised":
      sorted.sort((a, b) => b.amountRaised - a.amountRaised);
      break;
    case "company-az":
      sorted.sort((a, b) =>
        a.companyName.localeCompare(b.companyName, undefined, {
          sensitivity: "base",
        }),
      );
      break;
  }

  return sorted;
}

export function getUniqueValues(leads: Lead[], key: "industry" | "fundingRound" | "status"): string[] {
  return [...new Set(leads.map((l) => l[key]))].sort();
}

export function computeSummary(leads: Lead[]) {
  return {
    total: leads.length,
    newThisWeek: leads.filter((l) => isNewThisWeek(l.fundingDate)).length,
    highScore: leads.filter((l) => l.leadScore >= HIGH_SCORE_THRESHOLD).length,
    saved: leads.filter((l) => l.saved).length,
  };
}

export function getScoreTier(score: number): "high" | "medium" | "low" {
  if (score >= 85) return "high";
  if (score >= 70) return "medium";
  return "low";
}
