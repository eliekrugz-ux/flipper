import Link from "next/link";
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
    <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="font-mono text-xs uppercase text-neutral-500">{label}</div>
      <div className="mt-1 text-3xl font-bold">{value}</div>
      {sub && <div className="mt-1 text-xs text-neutral-500">{sub}</div>}
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
          <div className="mb-1 text-neutral-500">{k}</div>
          {[["before", before[k]], ["after", after?.[k]]].map(([label, v]) => (
            <div key={label as string} className="flex items-center gap-2">
              <span className="w-12 text-neutral-500">{label}</span>
              <div className="h-3 flex-1 rounded bg-neutral-100 dark:bg-neutral-800">
                {v != null && (
                  <div
                    className={`h-3 rounded ${label === "after" ? "bg-emerald-500" : "bg-neutral-400"}`}
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
    <main className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6">
      <Suspense fallback={<p className="text-sm text-neutral-500">Loading…</p>}>
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
        <h1 className="text-xl font-bold">Admin</h1>
        <input
          name="password" type="password" required autoFocus placeholder="Password"
          className="rounded-lg border border-neutral-300 bg-transparent px-3 py-2 dark:border-neutral-700"
        />
        {error && <p className="text-sm text-red-600">Wrong password.</p>}
        <button className="rounded-lg bg-neutral-900 px-4 py-2 font-semibold text-white dark:bg-neutral-100 dark:text-neutral-900">
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
        <Link href="/" className="font-mono text-sm text-neutral-500">← Flipper</Link>
        <form action={logout}><button className="font-mono text-sm text-neutral-500 underline">Sign out</button></form>
      </div>
      <h1 className="mt-4 text-3xl font-bold">Agents</h1>
      <p className="mt-1 text-neutral-500">Admin only. Everything below is written by the agents, live.</p>
      <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Revenue (Whop)" value={usd(revenue)} sub={`${data.revenue.length} payments`} />
        <Stat label="Deals called" value={String(data.dealCount)} />
        <Stat label="Checks delivered" value={String(data.checkCount)} />
        <Stat label="Terac spend" value={`${usd(teracSpent)} / ${usd(TERAC_BUDGET)}`} sub={`${data.studies.length} studies`} />
      </div>

      <h2 className="mt-12 text-xl font-bold">Human-in-the-loop studies (Terac)</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {data.studies.map((s) => (
          <div key={s.id} className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
            <div className="flex items-baseline justify-between gap-2">
              <div className="font-semibold">{s.name}</div>
              <div className="font-mono text-xs text-neutral-500">{s.status} · {usd(Number(s.cost ?? s.quote ?? 0))}</div>
            </div>
            {s.summary && <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{s.summary}</p>}
            {s.change_made && <p className="mt-2 text-sm"><b>Change made:</b> {s.change_made}</p>}
            <BeforeAfter before={s.before_metric} after={s.after_metric} />
          </div>
        ))}
        {!data.studies.length && <p className="text-sm text-neutral-500">No studies yet.</p>}
      </div>

      <div className="mt-12 grid gap-8 md:grid-cols-2">
        <section>
          <h2 className="text-xl font-bold">CEO decision log</h2>
          <ul className="mt-4 space-y-3">
            {data.decisions.map((d, i) => (
              <li key={i} className="rounded-lg border border-neutral-200 p-3 text-sm dark:border-neutral-800">
                <div className="font-mono text-xs text-neutral-500">{d.agent} · {new Date(d.created_at).toLocaleTimeString("en-US", { timeZone: "America/New_York" })}</div>
                <div className="mt-1 font-semibold">{d.decision}</div>
                {d.reasoning && <div className="mt-1 text-neutral-600 dark:text-neutral-400">{d.reasoning}</div>}
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="text-xl font-bold">Agent activity</h2>
          <ul className="mt-4 divide-y divide-neutral-200 font-mono text-xs dark:divide-neutral-800">
            {data.logs.map((l, i) => (
              <li key={i} className="flex gap-3 py-2">
                <span className="w-16 flex-none text-neutral-500">
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
