"use client";

import { useState, useTransition } from "react";
import { submitOfferStudy, type Ids } from "./actions";

interface MiniDeal { title: string; buy: number; mv: number; net: number }

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const QUESTIONS = [
  ["clarity", "How clear is what this company sells?"],
  ["trust", "How much would you trust it with your money?"],
  ["pay", "How likely would you be to pay $7 to check a listing, or $49 for deal access?"],
] as const;

// Version A: the live page today. Version B: proof-first, leads with real found deals.
function VersionA() {
  return (
    <div className="panel p-6">
      <div className="label">Resale deals · furniture · clothing · sneakers · watches · cameras · cars · gear</div>
      <div className="display mt-3 text-4xl">Underpriced finds<span className="text-red">.</span><br /><span className="chrome-text">Math done.</span></div>
      <p className="mt-4 text-ink-2">
        Flipper finds second-hand listings priced below what the exact same item sells for, works out fees,
        shipping and net profit, and hands you the deal. Every call goes on a public track record.
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <span className="pill">Get a Founding Seat · $49</span>
        <span className="pill-ghost">Check a listing · $7</span>
      </div>
    </div>
  );
}

function VersionB({ deals }: { deals: MiniDeal[] }) {
  return (
    <div className="panel p-6">
      <div className="label">Found this week</div>
      <div className="display mt-3 text-4xl">Buy low. Resell.<br /><span className="chrome-text">We show the profit first.</span></div>
      <ul className="mt-4 border-t border-ink">
        {deals.map((d) => (
          <li key={d.title} className="flex justify-between gap-3 border-b border-hair py-2 text-sm">
            <span className="min-w-0 truncate">{d.title}</span>
            <span className="shrink-0 font-mono">{usd(d.buy)} → {usd(d.mv)} · <b className="text-red">+{usd(d.net)}</b></span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-ink-2">Paste any listing and get BUY, PASS or OFFER with the math, or get every deal 24 hours before the public.</p>
      <div className="mt-5 flex flex-wrap gap-2">
        <span className="pill">Check a listing · $7</span>
        <span className="pill-ghost">Members get deals first · $49</span>
      </div>
    </div>
  );
}

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

export function StudyForm({ ids, deals }: { ids: Ids; deals: MiniDeal[] }) {
  // Order alternates by participant so neither version always goes first.
  const bFirst = [...(ids.teracSubmissionId || "x")].reduce((s, c) => s + c.charCodeAt(0), 0) % 2 === 1;
  const order = bFirst ? (["B", "A"] as const) : (["A", "B"] as const);
  const [a, setA] = useState<Record<string, number | string>>({});
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const set = (k: string, v: number | string) => setA((s) => ({ ...s, [k]: v }));

  const required = [...order.flatMap((v) => QUESTIONS.map(([k]) => `${v}_${k}`)), "prefer"];
  const done = required.every((k) => a[k] !== undefined) && String(a.why ?? "").trim().length >= 10;

  function submit() {
    setError("");
    start(async () => {
      try {
        window.location.href = await submitOfferStudy(ids, { ...a, order: order.join("") });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="label">About 3 minutes</div>
      <h1 className="display mt-2 text-4xl">Which page works better?</h1>
      <p className="mt-3 text-ink-2">
        Below are two versions of the homepage for a service that finds underpriced second-hand items to resell.
        Look at each, answer three questions, then pick the one you prefer. There are no right answers.
      </p>

      {order.map((v, i) => (
        <section key={v} className="mt-10">
          <div className="font-mono text-sm text-red">Page {i + 1} of 2</div>
          <div className="mt-3">{v === "A" ? <VersionA /> : <VersionB deals={deals} />}</div>
          {QUESTIONS.map(([k, q]) => (
            <div key={k} className="mt-5">
              <div className="font-bold">{q}</div>
              <Scale value={a[`${v}_${k}`] as number} onChange={(n) => set(`${v}_${k}`, n)} />
            </div>
          ))}
        </section>
      ))}

      <section className="mt-10 border-t-[3px] border-ink pt-6">
        <div className="font-bold">Which page would make you more likely to buy?</div>
        <div className="mt-3 flex gap-3">
          {order.map((v, i) => (
            <button
              key={v} type="button" onClick={() => set("prefer", v)}
              className={a.prefer === v ? "pill" : "pill-ghost"}
            >Page {i + 1}</button>
          ))}
        </div>
        <div className="mt-6 font-bold">Why? And was anything confusing or off-putting?</div>
        <textarea
          className="mt-2 w-full rounded-xl border border-ink bg-paper p-3" rows={4}
          value={String(a.why ?? "")} onChange={(e) => set("why", e.target.value)}
          placeholder="A sentence or two is plenty."
        />
        {error && <p className="mt-3 text-red">{error}</p>}
        <button type="button" disabled={!done || pending} onClick={submit} className="pill mt-6 disabled:opacity-40">
          {pending ? "Submitting…" : "Submit and finish"}
        </button>
        {!done && <p className="mt-2 text-xs text-ink-2">Answer every question to finish.</p>}
      </section>
    </div>
  );
}
