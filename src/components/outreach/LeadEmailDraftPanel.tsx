"use client";

import { useCallback, useMemo, useState } from "react";
import type { Lead } from "@/types/lead";
import {
  formatDraftAsPlainText,
  generateLeadEmailDraft,
  type EmailDraft,
} from "@/lib/outreach/email-draft-generator";
import {
  STRATEGY_LABEL,
  type OutreachIntelligence,
  type OutreachStrategy,
  type OutreachUrgency,
} from "@/lib/outreach/outreach-intelligence-engine";
import type { DraftQualityAssessment } from "@/lib/outreach/draft-quality-checker";
import { useVoiceProfileLibrary } from "@/lib/outreach/sender-profile";
import { recommendVoicesForStrategy } from "@/lib/outreach/voice-profile-recommendations";
import { VoiceProfileLibrary } from "@/components/outreach/VoiceProfileLibrary";

type CopyTarget = "subject" | "body" | "full";
type CopyState =
  | { kind: "idle" }
  | { kind: "success"; target: CopyTarget }
  | { kind: "error"; target: CopyTarget };

type LeadEmailDraftVariant = "default" | "compact" | "studio";

interface LeadEmailDraftPanelProps {
  lead: Lead;
  /** Optional initial strategy override. Defaults to the engine's pick. */
  initialStrategy?: OutreachStrategy;
  /** Compact mode tightens spacing for nested drawer use. */
  compact?: boolean;
  /**
   * Layout variant. `studio` gives the email body more vertical room and
   * loosens spacing for the dedicated draft dialog. Overrides `compact`.
   */
  variant?: LeadEmailDraftVariant;
}

const URGENCY_STYLES: Record<OutreachUrgency, { label: string; cls: string }> = {
  high: { label: "High urgency", cls: "bg-rose-50 text-rose-700 ring-rose-200/80" },
  medium: { label: "Medium urgency", cls: "bg-amber-50 text-amber-800 ring-amber-200/80" },
  low: { label: "Low urgency", cls: "bg-slate-100 text-slate-600 ring-slate-200/80" },
};

const QUALITY_STYLES: Record<DraftQualityAssessment["status"], string> = {
  High: "bg-emerald-50 text-emerald-700 ring-emerald-200/80",
  Good: "bg-sky-50 text-sky-700 ring-sky-200/80",
  "Needs Review": "bg-rose-50 text-rose-700 ring-rose-200/80",
};

const READINESS_STYLES: Record<OutreachIntelligence["outreachReadiness"], string> = {
  High: "text-emerald-700",
  Medium: "text-amber-700",
  Low: "text-slate-600",
};

const PERSONALIZATION_STYLES: Record<
  OutreachIntelligence["personalizationStrength"],
  string
> = {
  Strong: "text-emerald-700",
  Moderate: "text-amber-700",
  Light: "text-slate-600",
};

export function LeadEmailDraftPanel({
  lead,
  initialStrategy,
  compact = false,
  variant,
}: LeadEmailDraftPanelProps) {
  const resolvedVariant: LeadEmailDraftVariant =
    variant ?? (compact ? "compact" : "default");
  const isStudio = resolvedVariant === "studio";
  const isCompact = resolvedVariant === "compact";

  const [strategy, setStrategy] = useState<OutreachStrategy | undefined>(
    initialStrategy,
  );
  const [copy, setCopy] = useState<CopyState>({ kind: "idle" });
  const voiceLibrary = useVoiceProfileLibrary();
  const selectedVoice = voiceLibrary.selected;

  const draft = useMemo(
    () =>
      generateLeadEmailDraft(lead, {
        ...(strategy ? { strategy } : {}),
        senderProfile: selectedVoice,
      }),
    [lead, strategy, selectedVoice],
  );

  const intel = draft.intelligence;
  const recommendedStrategy = intel.recommendedStrategy;
  const activeStrategy = strategy ?? recommendedStrategy;
  const strategyChoices = useMemo(
    () => buildStrategyChoices(intel, activeStrategy),
    [intel, activeStrategy],
  );

  const handleCopy = useCallback(
    async (target: CopyTarget) => {
      const text =
        target === "subject"
          ? draft.subject
          : target === "body"
            ? draft.body
            : formatDraftAsPlainText(draft);
      try {
        if (!navigator?.clipboard?.writeText) {
          throw new Error("Clipboard API not available");
        }
        await navigator.clipboard.writeText(text);
        setCopy({ kind: "success", target });
      } catch {
        setCopy({ kind: "error", target });
      } finally {
        window.setTimeout(() => setCopy({ kind: "idle" }), 1800);
      }
    },
    [draft],
  );

  const padding = isCompact ? "p-3" : isStudio ? "p-4" : "p-3.5";
  const gap = isCompact ? "space-y-2.5" : isStudio ? "space-y-4" : "space-y-3";
  const bodyMaxHeight = isStudio ? "max-h-[460px]" : "max-h-72";
  const signalCount =
    intel.personalizationPoints.length + intel.supportingReasons.length;

  return (
    <div className={`rounded-lg ${gap}`}>
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-indigo-600">
            <SparkIcon className="h-3 w-3" />
            AI outreach draft
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            <span className="font-medium text-slate-600">Strategy</span> · {draft.strategyLabel}
            <span className="px-1 text-slate-300">·</span>
            <span className="font-medium text-slate-600">Voice</span> · {selectedVoice.name}
            <span className="px-1 text-slate-300">·</span>
            {signalCount} lead signals · quality checked before copy
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${URGENCY_STYLES[intel.urgency].cls}`}
            title="Urgency reflects lead score and funding recency."
          >
            {URGENCY_STYLES[intel.urgency].label}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${QUALITY_STYLES[draft.quality.status]}`}
            title={`Draft quality: ${draft.quality.qualityScore}/100`}
          >
            Quality: {draft.quality.status}
          </span>
        </div>
      </header>

      <VoiceProfileLibrary library={voiceLibrary} compact={isCompact} />

      <RecommendedVoicesRow
        strategy={activeStrategy}
        profiles={voiceLibrary.library.profiles}
        selectedId={selectedVoice.id}
        onSelect={(id) => voiceLibrary.selectProfile(id)}
      />

      <WhyThisDraftCard
        intel={intel}
        draft={draft}
        padding={padding}
        strategyLabel={draft.strategyLabel}
      />

      <StrategySelector
        choices={strategyChoices}
        active={activeStrategy}
        recommended={recommendedStrategy}
        onSelect={(id) => setStrategy(id)}
      />

      <DraftField
        label="Subject"
        value={draft.subject}
        copy={copy}
        target="subject"
        onCopy={() => handleCopy("subject")}
      />

      <DraftField
        label="Body"
        value={draft.body}
        copy={copy}
        target="body"
        onCopy={() => handleCopy("body")}
        multiline
        bodyMaxHeight={bodyMaxHeight}
      />

      {draft.quality.warnings.length > 0 ? (
        <QualityWarningsBand
          quality={draft.quality}
          padding={padding}
        />
      ) : null}

      {draft.missingDataWarnings.length > 0 ? (
        <div className={`rounded-md border border-amber-200/80 bg-amber-50/60 ${padding}`}>
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-amber-700">
            <AlertIcon className="h-3 w-3" />
            Missing data — review before sending
          </p>
          <ul className="mt-1.5 space-y-1">
            {draft.missingDataWarnings.map((warning) => (
              <li
                key={warning}
                className="flex items-start gap-1.5 text-[11px] leading-snug text-amber-900/90"
              >
                <span aria-hidden className="mt-1 inline-block h-1 w-1 shrink-0 rounded-full bg-amber-500" />
                <span>{warning}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
        <p className="flex items-center gap-1.5 text-[10px] text-slate-500">
          <InfoIcon className="h-3 w-3 text-slate-400" />
          Draft generated from available lead data — review before sending.
        </p>
        <CopyFullButton
          state={copy}
          onClick={() => handleCopy("full")}
        />
      </div>
    </div>
  );
}

// --------------------------------------------------------------------
// Why this draft
// --------------------------------------------------------------------

function WhyThisDraftCard({
  intel,
  draft,
  padding,
  strategyLabel,
}: {
  intel: OutreachIntelligence;
  draft: EmailDraft;
  padding: string;
  strategyLabel: string;
}) {
  const [signalsOpen, setSignalsOpen] = useState(false);
  const [risksOpen, setRisksOpen] = useState(false);

  return (
    <div
      className={`relative overflow-hidden rounded-lg border border-indigo-200/70 bg-gradient-to-br from-indigo-50/70 via-white to-white shadow-sm ring-1 ring-indigo-200/30 ${padding}`}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-0.5 bg-gradient-to-b from-indigo-400/70 via-indigo-500/60 to-violet-500/60"
      />
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-indigo-700">
          <BrainIcon className="h-3 w-3" />
          Why this draft
        </p>
        <span className="rounded-md bg-indigo-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
          {strategyLabel}
        </span>
      </div>

      <p className="mt-2 text-[12.5px] font-medium leading-snug text-indigo-950">
        {intel.primaryReason}
      </p>

      <div className="mt-2.5 grid grid-cols-3 gap-1.5">
        <Stat
          label="Readiness"
          value={intel.outreachReadiness}
          valueClassName={READINESS_STYLES[intel.outreachReadiness]}
        />
        <Stat
          label="Personalization"
          value={intel.personalizationStrength}
          valueClassName={PERSONALIZATION_STYLES[intel.personalizationStrength]}
        />
        <Stat
          label="Tone"
          value={draft.tone}
          valueClassName="text-slate-700"
        />
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 border-t border-indigo-100/80 pt-2">
        <p className="text-[10px] text-slate-500">
          Fit score{" "}
          <span className="font-semibold text-slate-700 tabular-nums">
            {intel.leadFitScore}
          </span>
          <span className="text-slate-400">/100</span>
        </p>
        <p className="text-[10px] text-slate-500">
          Confidence{" "}
          <span className="font-semibold text-slate-700">
            {intel.confidence}
          </span>
        </p>
      </div>

      {intel.leadRisks.length > 0 ? (
        <details
          className="mt-2 rounded-md border border-rose-100 bg-rose-50/50 px-2 py-1.5"
          open={risksOpen}
          onToggle={(e) =>
            setRisksOpen((e.target as HTMLDetailsElement).open)
          }
        >
          <summary className="cursor-pointer list-none text-[10.5px] font-semibold text-rose-700">
            <span className="inline-flex items-center gap-1">
              <AlertIcon className="h-3 w-3" />
              {intel.leadRisks.length} risk{intel.leadRisks.length === 1 ? "" : "s"} noted
              <Chevron open={risksOpen} />
            </span>
          </summary>
          <ul className="mt-1.5 space-y-1">
            {intel.leadRisks.map((risk) => (
              <li
                key={risk}
                className="flex items-start gap-1.5 text-[11px] leading-snug text-rose-900/90"
              >
                <span aria-hidden className="mt-1 inline-block h-1 w-1 shrink-0 rounded-full bg-rose-500" />
                <span>{risk}</span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {intel.supportingReasons.length + intel.personalizationPoints.length > 0 ? (
        <details
          className="mt-1.5 rounded-md border border-slate-100 bg-white/70 px-2 py-1.5"
          open={signalsOpen}
          onToggle={(e) =>
            setSignalsOpen((e.target as HTMLDetailsElement).open)
          }
        >
          <summary className="cursor-pointer list-none text-[10.5px] font-semibold text-slate-600">
            <span className="inline-flex items-center gap-1">
              {intel.supportingReasons.length + intel.personalizationPoints.length}{" "}
              signals used
              <Chevron open={signalsOpen} />
            </span>
          </summary>
          {intel.supportingReasons.length > 0 ? (
            <>
              <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                Supporting reasons
              </p>
              <ul className="mt-0.5 flex flex-wrap gap-1">
                {intel.supportingReasons.map((reason) => (
                  <li
                    key={reason}
                    className="rounded bg-slate-50 px-1.5 py-0.5 text-[10.5px] font-medium text-slate-700 ring-1 ring-slate-200/80"
                  >
                    {reason}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          {intel.personalizationPoints.length > 0 ? (
            <>
              <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                Personalization used
              </p>
              <ul className="mt-0.5 flex flex-wrap gap-1">
                {intel.personalizationPoints.map((point) => (
                  <li
                    key={point}
                    className="rounded bg-white px-1.5 py-0.5 text-[10.5px] font-medium text-slate-700 ring-1 ring-slate-200/80"
                  >
                    {point}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </details>
      ) : null}

      <p className="mt-2 text-[10px] leading-snug text-slate-400">
        Strategy selected from lead intelligence · Voice selected by you · Quality checked before copy.
      </p>
    </div>
  );
}

function RecommendedVoicesRow({
  strategy,
  profiles,
  selectedId,
  onSelect,
}: {
  strategy: OutreachStrategy;
  profiles: ReturnType<typeof useVoiceProfileLibrary>["library"]["profiles"];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const recommendations = useMemo(
    () => recommendVoicesForStrategy(strategy, profiles),
    [strategy, profiles],
  );

  if (recommendations.length === 0) return null;

  return (
    <div className="rounded-md border border-slate-200/80 bg-white px-2.5 py-2 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">
        Try another voice for {STRATEGY_LABEL[strategy]} leads
      </p>
      <div
        className="mt-1.5 flex flex-wrap gap-1.5"
        role="radiogroup"
        aria-label="Recommended voice profiles for this lead"
      >
        {recommendations.map(({ profile, hint }) => {
          const isActive = profile.id === selectedId;
          return (
            <button
              key={profile.id}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => onSelect(profile.id)}
              className={`flex max-w-[180px] flex-col items-start rounded-md px-2.5 py-1 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/40 ${
                isActive
                  ? "bg-slate-900 text-white ring-1 ring-slate-800"
                  : "bg-white text-slate-700 ring-1 ring-slate-200/80 hover:bg-slate-50"
              }`}
            >
              <span className="text-[11px] font-semibold leading-snug">
                {profile.name}
              </span>
              <span
                className={`text-[10px] leading-snug ${isActive ? "text-slate-300" : "text-slate-500"}`}
              >
                {hint}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName: string;
}) {
  return (
    <div className="rounded-md border border-slate-100 bg-white/80 px-2 py-1.5">
      <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p className={`mt-0.5 text-[11px] font-semibold ${valueClassName}`}>
        {value}
      </p>
    </div>
  );
}

// --------------------------------------------------------------------
// Strategy selector
// --------------------------------------------------------------------

interface StrategyChoice {
  id: OutreachStrategy;
  label: string;
  isRecommended: boolean;
}

function buildStrategyChoices(
  intel: OutreachIntelligence,
  active: OutreachStrategy,
): StrategyChoice[] {
  const ordered: OutreachStrategy[] = [
    intel.recommendedStrategy,
    ...intel.alternativeStrategies,
  ];
  // Ensure the active strategy (which may be a user override outside the
  // standard alternatives) is also offered so the chip stays selected.
  if (!ordered.includes(active)) ordered.push(active);
  const seen = new Set<OutreachStrategy>();
  const out: StrategyChoice[] = [];
  for (const id of ordered) {
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      label: STRATEGY_LABEL[id],
      isRecommended: id === intel.recommendedStrategy,
    });
  }
  return out;
}

function StrategySelector({
  choices,
  active,
  recommended,
  onSelect,
}: {
  choices: StrategyChoice[];
  active: OutreachStrategy;
  recommended: OutreachStrategy;
  onSelect: (id: OutreachStrategy) => void;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">
        Strategy
      </p>
      <div
        className="mt-1 flex flex-wrap gap-1.5"
        role="radiogroup"
        aria-label="Outreach strategy"
      >
        {choices.map((choice) => {
          const isActive = choice.id === active;
          return (
            <button
              key={choice.id}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => onSelect(choice.id)}
              className={`group relative inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/40 ${
                isActive
                  ? "bg-slate-900 text-white ring-1 ring-slate-800"
                  : "bg-white text-slate-700 ring-1 ring-slate-200/80 hover:bg-slate-50"
              }`}
            >
              {choice.id === recommended ? (
                <span
                  aria-hidden
                  className={`inline-block h-1.5 w-1.5 rounded-full ${isActive ? "bg-emerald-300" : "bg-emerald-500"}`}
                  title="Engine recommendation"
                />
              ) : null}
              {choice.label}
            </button>
          );
        })}
      </div>
      <p className="mt-0.5 text-[10px] text-slate-400">
        <span className="inline-block h-1.5 w-1.5 translate-y-[-1px] rounded-full bg-emerald-500 align-middle" />
        <span className="ml-1">Engine recommendation. Click a different strategy to override.</span>
      </p>
    </div>
  );
}

// --------------------------------------------------------------------
// Quality warnings band
// --------------------------------------------------------------------

function QualityWarningsBand({
  quality,
  padding,
}: {
  quality: DraftQualityAssessment;
  padding: string;
}) {
  const tone =
    quality.status === "Needs Review"
      ? "border-rose-200/80 bg-rose-50/60 text-rose-900"
      : "border-slate-200/80 bg-slate-50/60 text-slate-700";
  const headTone =
    quality.status === "Needs Review" ? "text-rose-700" : "text-slate-600";

  return (
    <div className={`rounded-md border ${padding} ${tone}`}>
      <p className={`flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] ${headTone}`}>
        <AlertIcon className="h-3 w-3" />
        Quality check
      </p>
      <ul className="mt-1.5 space-y-1">
        {quality.warnings.map((warn) => (
          <li
            key={warn}
            className="flex items-start gap-1.5 text-[11px] leading-snug"
          >
            <span
              aria-hidden
              className={`mt-1 inline-block h-1 w-1 shrink-0 rounded-full ${quality.status === "Needs Review" ? "bg-rose-500" : "bg-slate-400"}`}
            />
            <span>{warn}</span>
          </li>
        ))}
      </ul>
      {quality.revisionHints.length > 0 ? (
        <p className="mt-1.5 text-[10.5px] leading-snug text-slate-600">
          <span className="font-semibold text-slate-700">Hint:</span>{" "}
          {quality.revisionHints[0]}
        </p>
      ) : null}
    </div>
  );
}

// --------------------------------------------------------------------
// Draft field + copy controls
// --------------------------------------------------------------------

function DraftField({
  label,
  value,
  copy,
  target,
  onCopy,
  multiline = false,
  bodyMaxHeight = "max-h-72",
}: {
  label: string;
  value: string;
  copy: CopyState;
  target: CopyTarget;
  onCopy: () => void;
  multiline?: boolean;
  bodyMaxHeight?: string;
}) {
  const status =
    copy.kind !== "idle" && copy.target === target ? copy.kind : "idle";
  const buttonCls =
    status === "success"
      ? "bg-emerald-50 text-emerald-700"
      : status === "error"
        ? "bg-rose-50 text-rose-700"
        : "text-indigo-600 hover:bg-indigo-50";
  const buttonLabel =
    status === "success"
      ? "Copied"
      : status === "error"
        ? "Copy failed"
        : "Copy";

  return (
    <div className="rounded-md border border-slate-200/80 bg-white">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-2.5 py-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">
          {label}
        </span>
        <button
          type="button"
          onClick={onCopy}
          className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold transition-colors ${buttonCls}`}
          aria-label={`Copy ${label.toLowerCase()}`}
        >
          {status === "success" ? (
            <CheckIcon className="h-3 w-3" />
          ) : status === "error" ? (
            <AlertIcon className="h-3 w-3" />
          ) : (
            <CopyIcon className="h-3 w-3" />
          )}
          {buttonLabel}
        </button>
      </div>
      {multiline ? (
        <pre
          className={`${bodyMaxHeight} overflow-y-auto whitespace-pre-wrap break-words px-3 py-2.5 font-sans text-[12.5px] leading-relaxed text-slate-700`}
        >
          {value}
        </pre>
      ) : (
        <p className="px-3 py-2 text-[12.5px] font-medium leading-snug text-slate-800">
          {value}
        </p>
      )}
    </div>
  );
}

function CopyFullButton({
  state,
  onClick,
}: {
  state: CopyState;
  onClick: () => void;
}) {
  const status =
    state.kind !== "idle" && state.target === "full" ? state.kind : "idle";

  const cls =
    status === "success"
      ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
      : status === "error"
        ? "border border-rose-200 bg-rose-50 text-rose-700"
        : "border border-indigo-200/90 bg-white text-indigo-700 hover:border-indigo-300 hover:bg-indigo-50";

  const icon =
    status === "success" ? (
      <CheckIcon className="h-3 w-3" />
    ) : status === "error" ? (
      <AlertIcon className="h-3 w-3" />
    ) : (
      <CopyIcon className="h-3 w-3" />
    );

  const label =
    status === "success"
      ? "Copied full email"
      : status === "error"
        ? "Copy failed — select the body and copy manually"
        : "Copy full email";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${cls}`}
    >
      {icon}
      {label}
    </button>
  );
}

// --------------------------------------------------------------------
// Icons
// --------------------------------------------------------------------

function CopyIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M9 5a2 2 0 012-2h7a2 2 0 012 2v10a2 2 0 01-2 2H9V5z" />
    </svg>
  );
}

function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function SparkIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2l1.6 4.4L18 8l-4.4 1.6L12 14l-1.6-4.4L6 8l4.4-1.6L12 2zm6 10l.9 2.5L21 15.5l-2.1.5L18 18l-.9-2-2.1-.5L17 14l1-2zm-12 4l.7 1.8L8.5 18l-1.8.6L6 20l-.7-1.4L3.5 18l1.8-.6L6 16z" />
    </svg>
  );
}

function InfoIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function AlertIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.008v.008H12V16.5zm-9.75 4.5h19.5a1.125 1.125 0 00.974-1.687L13.04 4.05a1.125 1.125 0 00-1.948 0L1.276 18.813A1.125 1.125 0 002.25 20.5z" />
    </svg>
  );
}

function BrainIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 3.75A2.25 2.25 0 0111.25 6v12a2.25 2.25 0 01-4.5 0v-.75a2.25 2.25 0 01-2.25-2.25v-3a2.25 2.25 0 012.25-2.25 2.25 2.25 0 010-4.5A2.25 2.25 0 019 3.75zm6 0A2.25 2.25 0 0012.75 6v12a2.25 2.25 0 004.5 0v-.75a2.25 2.25 0 002.25-2.25v-3a2.25 2.25 0 00-2.25-2.25 2.25 2.25 0 000-4.5A2.25 2.25 0 0015 3.75z" />
    </svg>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  );
}
