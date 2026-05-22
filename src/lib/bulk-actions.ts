import type { Lead, LeadStatus } from "@/types/lead";

export const BULK_STATUS_OPTIONS: LeadStatus[] = [
  "New",
  "Contacted",
  "Qualified",
  "Nurturing",
  "Archived",
];

export const CSV_FILENAME = "whoraised-selected-leads.csv";

function dedupe<T extends string>(
  values: Iterable<T>,
  normalize: (v: T) => string,
): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const v of values) {
    const trimmed = v.trim() as T;
    if (!trimmed) continue;
    const key = normalize(trimmed);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

export function extractUniqueEmails(leads: Lead[]): string[] {
  return dedupe(
    leads.map((l) => l.email ?? ""),
    (v) => v.toLowerCase(),
  );
}

export function extractUniquePhones(leads: Lead[]): string[] {
  return dedupe(
    leads.map((l) => l.phone ?? ""),
    (v) => v.replace(/\s+/g, ""),
  );
}

const CSV_HEADERS = [
  "Company",
  "Founder",
  "Founder Title",
  "Email",
  "Phone",
  "Industry",
  "Location",
  "Funding Round",
  "Amount Raised",
  "Lead Score",
  "Status",
  "Description",
] as const;

function csvEscape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildLeadsCsv(leads: Lead[]): string {
  const rows = leads.map((l) =>
    [
      l.companyName,
      l.founderName,
      l.founderTitle,
      l.email,
      l.phone,
      l.industry,
      l.location,
      l.fundingRound,
      l.amountRaised,
      l.leadScore,
      l.status,
      l.description,
    ]
      .map(csvEscape)
      .join(","),
  );
  return [CSV_HEADERS.join(","), ...rows].join("\r\n");
}

/** Triggers a CSV file download in the browser. Adds a UTF-8 BOM so Excel reads accents correctly. */
export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob(["﻿", content], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  // Defer revoke so the browser has time to start the download in Safari.
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (!text) return false;
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to legacy path
  }
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "-9999px";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}
