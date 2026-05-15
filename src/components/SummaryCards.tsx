interface SummaryCardsProps {
  total: number;
  newThisWeek: number;
  highScore: number;
  saved: number;
}

const cards = [
  {
    key: "total" as const,
    label: "Total leads",
    sublabel: "In your pipeline",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
    accent: "from-indigo-500/20 to-indigo-600/5 text-indigo-300",
    ring: "ring-indigo-500/20",
  },
  {
    key: "newThisWeek" as const,
    label: "New this week",
    sublabel: "Recently funded",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    accent: "from-emerald-500/20 to-emerald-600/5 text-emerald-300",
    ring: "ring-emerald-500/20",
  },
  {
    key: "highScore" as const,
    label: "High score leads",
    sublabel: "Score 85+",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
      </svg>
    ),
    accent: "from-amber-500/20 to-amber-600/5 text-amber-300",
    ring: "ring-amber-500/20",
  },
  {
    key: "saved" as const,
    label: "Saved leads",
    sublabel: "Bookmarked",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
      </svg>
    ),
    accent: "from-violet-500/20 to-violet-600/5 text-violet-300",
    ring: "ring-violet-500/20",
  },
];

export function SummaryCards({ total, newThisWeek, highScore, saved }: SummaryCardsProps) {
  const values = { total, newThisWeek, highScore, saved };

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.key}
          className={`group relative overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.04] p-3.5 shadow-lg shadow-black/25 ring-1 ${card.ring} backdrop-blur-md transition-all duration-200 hover:border-white/[0.12] hover:bg-white/[0.06]`}
        >
          <div
            className={`absolute inset-0 bg-gradient-to-br ${card.accent} opacity-60 transition-opacity group-hover:opacity-80`}
          />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400">{card.label}</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-white">
                {values[card.key]}
              </p>
              <p className="mt-0.5 text-[10px] text-slate-500">{card.sublabel}</p>
            </div>
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br ${card.accent} ring-1 ring-white/10`}
            >
              {card.icon}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
