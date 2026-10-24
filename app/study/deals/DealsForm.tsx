"use client";

import { useState, useTransition } from "react";
import { submitStudy, type Ids } from "../offer/actions";

export interface RateDeal {
  id: string; title: string; photo_url: string | null; condition: string | null;
  buy_price: number; market_value: number; net_profit: number;
}

const usd = (n: number) => `$${Math.round(Number(n)).toLocaleString("en-US")}`;
const QUESTIONS = [
  ["buy", "Would you buy this at this price to resell it?"],
  ["trust", "How trustworthy does this deal look?"],
] as const;

function Scale({ value, onChange }: { value?: number; onChange: (n: number) => void }) {
  return (
    <div className="mt-2 flex items-center gap-2">
      <span className="text-xs text-ink-2">Not at all</span>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n} type="button" onClick={() => onChange(n)}
          className={`h-9 w-9 rounded-full border font-mono ${value === n ? "border-red bg-red text-white" : "border-ink"}`}
        >{n}</button>
      ))}
      <span className="text-xs text-ink-2">Very</span>
    </div>
  );
}

export function DealsForm({ ids, deals }: { ids: Ids; deals: RateDeal[] }) {
  const [a, setA] = useState<Record<string, number | string>>({});
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const set = (k: string, v: number | string) => setA((s) => ({ ...s, [k]: v }));
  const done = deals.every((d) => QUESTIONS.every(([k]) => a[`${d.id}:${k}`] !== undefined));

  function submit() {
    setError("");
    start(async () => {
      try {
        window.location.href = await submitStudy("deal_appeal_v1", ids, { ...a, deals: deals.map((d) => d.id) });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="label">About 4 minutes</div>
      <h1 className="display mt-2 text-4xl">Would you buy these?</h1>
      <p className="mt-3 text-ink-2">
        Each card is a real second-hand listing with what the same item usually resells for. Imagine you buy and
        resell used items for profit. Rate each one on two questions. There are no right answers.
      </p>
      {deals.map((d, i) => (
        <section key={d.id} className="mt-8 border-t-[3px] border-ink pt-5">
          <div className="flex gap-4">
            {d.photo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={d.photo_url} alt="" className="h-24 w-24 shrink-0 rounded-xl border border-hair object-cover" />
            )}
            <div className="min-w-0">
              <div className="font-mono text-sm text-red">{i + 1} of {deals.length}</div>
              <div className="text-lg font-bold leading-tight">{d.title}</div>
              <div className="mt-1 text-sm text-ink-2">
                {d.condition} · listed at <b className="text-ink">{usd(d.buy_price)}</b> · usually resells for{" "}
                <b className="text-ink">{usd(d.market_value)}</b> · est. profit <b className="text-ink">+{usd(d.net_profit)}</b>
              </div>
            </div>
          </div>
          {QUESTIONS.map(([k, q]) => (
            <div key={k} className="mt-4">
              <div className="font-bold">{q}</div>
              <Scale value={a[`${d.id}:${k}`] as number} onChange={(n) => set(`${d.id}:${k}`, n)} />
            </div>
          ))}
        </section>
      ))}
      <section className="mt-10 border-t-[3px] border-ink pt-6">
        <div className="font-bold">Anything that made a deal feel more or less trustworthy? (optional)</div>
        <textarea
          className="mt-2 w-full rounded-xl border border-ink bg-paper p-3" rows={3}
          value={String(a.why ?? "")} onChange={(e) => set("why", e.target.value)}
        />
        {error && <p className="mt-3 text-red">{error}</p>}
        <button type="button" disabled={!done || pending} onClick={submit} className="pill mt-6 disabled:opacity-40">
          {pending ? "Submitting…" : "Submit and finish"}
        </button>
        {!done && <p className="mt-2 text-xs text-ink-2">Rate every deal to finish.</p>}
      </section>
    </div>
  );
}
