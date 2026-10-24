// "Who runs what" as a map: two trigger sources on the left, a line out to each agent,
// and on to what that agent changes. Dots show whether the agent acted on schedule.
interface Row {
  job: string;
  agents: string[];
  label: string;
  outcome: string;
  every: string;
  freshMin: number | null; // acted within this many minutes = live; null = on demand
  source: "clock" | "customer";
}

const ROWS: Row[] = [
  { job: "Marketing", agents: ["marketer"], label: "Marketer", outcome: "Bluesky + Telegram posts", every: "every minute", freshMin: 15, source: "clock" },
  { job: "Product", agents: ["scout", "pricer", "verifier"], label: "Scout → Pricer → Verifier", outcome: "Live deal feed", every: "every 30 min", freshMin: 70, source: "clock" },
  { job: "Improving", agents: ["researcher"], label: "Researcher", outcome: "Homepage + deal ranking", every: "every 30 min", freshMin: 70, source: "clock" },
  { job: "Hard decisions", agents: ["ceo"], label: "CEO", outcome: "Quality, price, pace levers", every: "every 2 h", freshMin: 150, source: "clock" },
  { job: "Legal", agents: ["compliance"], label: "Compliance", outcome: "Legal pages", every: "every 6 h", freshMin: 400, source: "clock" },
  { job: "Selling", agents: ["sales", "support"], label: "Sales + Support", outcome: "Verdicts, answers", every: "on demand", freshMin: null, source: "customer" },
  { job: "Payments", agents: ["finance"], label: "Finance", outcome: "Revenue + access", every: "on each payment", freshMin: null, source: "customer" },
];

type Stats = Record<string, { actions24h: number; lastAt: string | null; decisions: number }>;

function status(row: Row, ageMin: Record<string, number | null>) {
  const ages = row.agents.map((a) => ageMin[a]).filter((x): x is number => x !== null && x !== undefined);
  const youngest = ages.length ? Math.min(...ages) : null;
  if (youngest === null) return { tone: "idle", text: row.freshMin === null ? "waiting for a customer" : "not run yet" };
  const ago = youngest < 1 ? "just now" : youngest < 60 ? `${youngest}m ago` : `${Math.round(youngest / 60)}h ago`;
  if (row.freshMin === null || youngest <= row.freshMin) return { tone: "live", text: `acted ${ago}` };
  return { tone: "late", text: `last acted ${ago}` };
}

const DOT: Record<string, string> = { live: "bg-profit", late: "bg-red", idle: "bg-ink-2/40" };

function Lane({ title, sub, rows, stats, ageMin }: { title: string; sub: string; rows: Row[]; stats: Stats; ageMin: Record<string, number | null> }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[190px_1fr]">
      {/* Trigger hub, with a spine running down to every branch (stacked above it on phones) */}
      <div className="relative mb-2 flex items-center md:mb-0 md:pr-4">
        <div className="panel w-full p-3">
          <div className="font-mono text-[10px] uppercase tracking-widest text-red">Trigger</div>
          <div className="mt-1 font-bold leading-tight">{title}</div>
          <div className="text-xs text-ink-2">{sub}</div>
        </div>
        <div className="absolute right-0 top-1/2 hidden h-px w-4 bg-ink md:block" />
      </div>
      <div className="relative border-l border-ink">
        {rows.map((row) => {
          const s = status(row, ageMin);
          const acts = row.agents.reduce((n, a) => n + (stats[a]?.actions24h ?? 0), 0);
          const decs = row.agents.reduce((n, a) => n + (stats[a]?.decisions ?? 0), 0);
          return (
            <div key={row.job} className="grid grid-cols-[24px_minmax(0,1fr)] items-center py-1.5 md:grid-cols-[28px_minmax(0,1.1fr)_28px_minmax(0,1fr)]">
              <div className="h-px bg-ink" />
              {/* Agent node */}
              <div className="rounded-xl border border-ink bg-paper px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className={`relative inline-block h-2.5 w-2.5 shrink-0 rounded-full ${DOT[s.tone]}`}>
                    {s.tone === "live" && <span className="absolute inset-0 animate-ping rounded-full bg-profit opacity-60" />}
                  </span>
                  <span className="truncate font-bold">{row.label}</span>
                  <span className="ml-auto shrink-0 font-mono text-[10px] uppercase text-ink-2">{row.job}</span>
                </div>
                <div className="mt-0.5 flex flex-wrap gap-x-3 font-mono text-[11px] text-ink-2">
                  <span>{row.every}</span>
                  <span>{s.text}</span>
                  <span>{acts} actions/24h{decs ? ` · ${decs} decisions` : ""}</span>
                </div>
              </div>
              {/* Arrow out to what it changes (desktop) */}
              <div className="hidden items-center md:flex">
                <div className="h-px flex-1 bg-ink" />
                <div className="h-0 w-0 border-y-[4px] border-l-[6px] border-y-transparent border-l-ink" />
              </div>
              <div className="col-start-2 mt-1 rounded-xl border border-dashed border-ink/60 px-3 py-2 text-sm md:col-start-auto md:mt-0">
                {row.outcome}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AutonomyMap({ stats, ageMin }: { stats: Stats; ageMin: Record<string, number | null> }) {
  return (
    <div className="mt-5 grid gap-6">
      <Lane title="Database clock" sub="Supabase pg_cron" rows={ROWS.filter((r) => r.source === "clock")} stats={stats} ageMin={ageMin} />
      <Lane title="Customers" sub="buy or ask" rows={ROWS.filter((r) => r.source === "customer")} stats={stats} ageMin={ageMin} />
      <div className="flex flex-wrap gap-x-5 gap-y-1 font-mono text-[11px] text-ink-2">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-profit" /> acted on schedule</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red" /> overdue</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-ink-2/40" /> waiting</span>
        <span>solid = agent · dashed = what it changes</span>
      </div>
    </div>
  );
}
