export const TOURNAMENT = {
  firstPicksCloseAt: "2026-10-16T16:00:00-04:00",
  startsOn: "2026-10-16",
  endsOn: "2026-11-13",
  completesAt: "2026-11-14T00:00:00-05:00",
  durationDays: 29,
  prize: 1000,
  eligibility: "U.S. 18+",
  freeEntry: true,
  picksPerDay: 1,
  timeZone: "America/New_York",
} as const;

const dateFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: TOURNAMENT.timeZone,
  month: "short",
  day: "numeric",
});

export type TournamentPhase =
  | { state: "countdown"; daysRemaining: number; closeLabel: string }
  | { state: "live"; day: number }
  | { state: "complete" };

function dateKeyInEastern(now: number) {
  const values = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone: TOURNAMENT.timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now).map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function tournamentPhase(now = Date.now()): TournamentPhase {
  const closeAt = Date.parse(TOURNAMENT.firstPicksCloseAt);
  const completeAt = Date.parse(TOURNAMENT.completesAt);
  if (now >= completeAt) return { state: "complete" };
  if (now >= closeAt) {
    const startAt = Date.parse(`${TOURNAMENT.startsOn}T00:00:00Z`);
    const today = Date.parse(`${dateKeyInEastern(now)}T00:00:00Z`);
    const day = Math.floor((today - startAt) / 86_400_000) + 1;
    return { state: "live", day: Math.max(1, Math.min(TOURNAMENT.durationDays, day)) };
  }
  return {
    state: "countdown",
    daysRemaining: Math.max(0, Math.ceil((closeAt - now) / 86_400_000)),
    closeLabel: new Intl.DateTimeFormat("en-US", {
      timeZone: TOURNAMENT.timeZone,
      month: "short",
      day: "numeric",
      hour: "numeric",
      hourCycle: "h12",
    }).format(closeAt) + " ET",
  };
}

export function tournamentDateRange() {
  const start = new Date(`${TOURNAMENT.startsOn}T12:00:00-04:00`);
  const end = new Date(`${TOURNAMENT.endsOn}T12:00:00-05:00`);
  return `${dateFormat.format(start)} – ${dateFormat.format(end)}`;
}

export function firstPicksCloseLabel() {
  const phase = tournamentPhase(Date.parse(TOURNAMENT.firstPicksCloseAt) - 1);
  return `First picks close ${phase.state === "countdown" ? phase.closeLabel : ""}`;
}

export function tournamentFacts() {
  return {
    range: tournamentDateRange(),
    prize: `$${TOURNAMENT.prize.toLocaleString("en-US")}`,
    eligibility: TOURNAMENT.eligibility,
    entry: TOURNAMENT.freeEntry ? "Free entry" : "Paid entry",
    dailyPick: `${TOURNAMENT.picksPerDay === 1 ? "One" : TOURNAMENT.picksPerDay} daily pick${TOURNAMENT.picksPerDay === 1 ? "" : "s"}`,
    close: firstPicksCloseLabel(),
  };
}
