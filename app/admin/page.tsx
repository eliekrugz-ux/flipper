import { connection } from "next/server";
import { Suspense } from "react";
import { isAdmin } from "@/lib/admin";
import { dashboardData, usd } from "@/lib/queries";
import { login, logout } from "./actions";

export const metadata = { title: "Admin — Flipper", robots: { index: false, follow: false } };

const TERAC_BUDGET = 100;

type Metric = Record<string, number> | null;

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="panel p-4">
      <div className="label">{label}</div>
      <div className="mt-1 display text-4xl tnum">{value}</div>
      {sub && <div className="mt-1 text-xs text-ink-2">{sub}</div>}
    </div>
  );
}

// Before/after bars for one study metric; both on the same 0–max scale.
function BeforeAfter({ before, after }: { before: Metric; after: Metric }) {
  if (!before) return null;
  const keys = Object.keys(before);
  const max = Math.max(...keys.flatMap((k) => [before[k], after?.[k] ?? 0]), 1);
  return (
    <div className="mt-3 grid gap-2">
      {keys.map((k) => (
        <div key={k} className="text-xs">
          <div className="mb-1 text-ink-2">{k}</div>
          {[["before", before[k]], ["after", after?.[k]]].map(([label, v]) => (
            <div key={label as string} className="flex items-center gap-2">
              <span className="w-12 text-ink-2">{label}</span>
              <div className="h-3 flex-1 rounded bg-paper-2">
                {v != null && (
                  <div
                    className={`h-3 rounded ${label === "after" ? "bg-profit" : "bg-ink-2"}`}
                    style={{ width: `${(Number(v) / max) * 100}%` }}
                  />
                )}
              </div>
              <span className="w-12 text-right font-mono">{v ?? "—"}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function AdminPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  return (
    <main className="wrap pt-10">
      <Suspense fallback={<p className="text-sm text-ink-2">Loading…</p>}>
        <Gate searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Gate({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await connection();
  if (!(await isAdmin())) {
    const { error } = await searchParams;
    return (
      <form action={login} className="mx-auto mt-16 grid max-w-xs gap-3">
        <h1 className="display text-4xl">Admin<span className="text-red">.</span></h1>
        <input
          name="password" type="password" required autoFocus placeholder="Password"
          className="field"
        />
        {error && <p className="text-sm text-red-600">Wrong password.</p>}
        <button className="pill">
          Sign in
        </button>
      </form>
    );
  }
  return <Live />;
}

async function Live() {
  const data = await dashboardData();
  if (!data) return <p className="mt-8">Database not connected yet.</p>;
  const revenue = data.revenue.reduce((s, r) => s + Number(r.amount), 0);
  const teracSpent = data.studies.reduce((s, r) => s + Number(r.cost ?? 0), 0);

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <span className="label">Admin · live</span>
        <form action={logout}><button className="font-mono text-sm text-ink-2 underline">Sign out</button></form>
      </div>
      <h1 className="display mt-4 text-6xl">Agents<span className="text-red">.</span></h1>
      <p className="mt-1 text-ink-2">Admin only. Everything below is written by the agents, live.</p>
      <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Revenue (Whop)" value={usd(revenue)} sub={`${data.revenue.length} payments`} />
        <Stat label="Deals called" value={String(data.dealCount)} />
        <Stat label="Checks delivered" value={String(data.checkCount)} />
        <Stat label="Terac spend" value={`${usd(teracSpent)} / ${usd(TERAC_BUDGET)}`} sub={`${data.studies.length} studies`} />
      </div>

      <h2 className="display mt-14 border-t-[3px] border-ink pt-3 text-3xl">Human-in-the-loop studies (Terac)</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {data.studies.map((s) => (
          <div key={s.id} className="panel p-4">
            <div className="flex items-baseline justify-between gap-2">
              <div className="font-semibold">{s.name}</div>
              <div className="font-mono text-xs text-ink-2">{s.status} · {usd(Number(s.cost ?? s.quote ?? 0))}</div>
            </div>
            {s.summary && <p className="mt-2 text-sm text-ink-2">{s.summary}</p>}
            {s.change_made && <p className="mt-2 text-sm"><b>Change made:</b> {s.change_made}</p>}
            <BeforeAfter before={s.before_metric} after={s.after_metric} />
          </div>
        ))}
        {!data.studies.length && <p className="text-sm text-ink-2">No studies yet.</p>}
      </div>

      <div className="mt-12 grid gap-8 md:grid-cols-2">
        <section>
          <h2 className="display border-t-[3px] border-ink pt-3 text-3xl">CEO decision log</h2>
          <ul className="mt-4 space-y-3">
            {data.decisions.map((d, i) => (
              <li key={i} className="border-b border-hair py-3 text-sm">
                <div className="font-mono text-xs text-ink-2">{d.agent} · {new Date(d.created_at).toLocaleTimeString("en-US", { timeZone: "America/New_York" })}</div>
                <div className="mt-1 font-semibold">{d.decision}</div>
                {d.reasoning && <div className="mt-1 text-ink-2">{d.reasoning}</div>}
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="display border-t-[3px] border-ink pt-3 text-3xl">Agent activity</h2>
          <ul className="mt-4 divide-y divide-hair font-mono text-xs">
            {data.logs.map((l, i) => (
              <li key={i} className="flex gap-3 py-2">
                <span className="w-16 flex-none text-ink-2">
                  {new Date(l.created_at).toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: "2-digit", minute: "2-digit" })}
                </span>
                <span className="w-20 flex-none font-semibold">{l.agent}</span>
                <span className="truncate">{l.action}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
