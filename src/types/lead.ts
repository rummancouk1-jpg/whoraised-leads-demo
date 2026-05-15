export type FundingRound =
  | "Pre-Seed"
  | "Seed"
  | "Series A"
  | "Series B"
  | "Series C"
  | "Bridge";

export type LeadStatus = "New" | "Contacted" | "Qualified" | "Nurturing" | "Archived";

export type SortOption =
  | "newest-funded"
  | "highest-score"
  | "amount-raised"
  | "company-az";

export type LeadSignal =
  | "Recently funded"
  | "Founder reachable"
  | "Strong investor signal"
  | "Hiring growth"
  | "High outreach fit"
  | "Fresh funding event";

export type OutreachReadiness = "Very High" | "High" | "Moderate" | "Developing";

export interface Lead {
  id: string;
  companyName: string;
  founderName: string;
  founderTitle: string;
  industry: string;
  fundingRound: FundingRound;
  amountRaised: number;
  fundingDate: string;
  location: string;
  employeeCount: number;
  email: string;
  phone: string;
  leadScore: number;
  status: LeadStatus;
  description: string;
  investors: string[];
  source: string;
  saved: boolean;
  priorityReasons: string[];
  signals: LeadSignal[];
  outreachReadiness: OutreachReadiness;
  intelligenceNote: string;
}

/** Core lead record before intelligence enrichment (e.g. from API or seed file). */
export type LeadInput = Omit<
  Lead,
  "priorityReasons" | "signals" | "outreachReadiness" | "intelligenceNote"
>;

export interface LeadFiltersState {
  industry: string;
  fundingRound: string;
  scoreMin: number;
  scoreMax: number;
  status: string;
  savedOnly: boolean;
}

export const DEFAULT_FILTERS: LeadFiltersState = {
  industry: "",
  fundingRound: "",
  scoreMin: 0,
  scoreMax: 100,
  status: "",
  savedOnly: false,
};
