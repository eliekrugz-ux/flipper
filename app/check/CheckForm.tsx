"use client";

import { useState } from "react";
import type { CheckResult } from "@/lib/check";

const money = (n: number) => `$${n.toFixed(2)}`;

export function CheckForm() {
  const [url, setUrl] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CheckResult | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setResult(null);
    const r = await fetch("/api/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, email }),
    });
    const body = await r.json();
    setBusy(false);
    if (!r.ok) setError(body.error ?? "Something went wrong.");
    else setResult(body);
  }

  return (
    <div className="mt-8">
      <form onSubmit={submit} className="grid gap-3">
        <input
          required type="url" value={url} onChange={(e) => setUrl(e.target.value)}
          placeholder="https://reverb.com/item/…"
          className="rounded-lg border border-neutral-300 bg-transparent px-3 py-2 dark:border-neutral-700"
        />
        <input
          required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="Email you used on Whop"
          className="rounded-lg border border-neutral-300 bg-transparent px-3 py-2 dark:border-neutral-700"
        />
        <button
          disabled={busy}
          className="rounded-lg bg-neutral-900 px-4 py-2 font-semibold text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
        >
          {busy ? "Pricing it…" : "Run Flipper Check"}
        </button>
      </form>

      {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">{error}</p>}

      {result && (
        <section className="mt-8 rounded-xl border-2 border-neutral-900 p-6 dark:border-neutral-100">
          <div className="font-mono text-sm uppercase text-neutral-500">Verdict</div>
          <div className="mt-1 text-4xl font-bold">
            {result.verdict === "OFFER" ? `OFFER ${money(result.offerPrice!)}` : result.verdict}
          </div>
          <div className="mt-1 truncate text-sm text-neutral-600 dark:text-neutral-400">{result.title}</div>
          <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <dt>Asking price</dt><dd className="text-right">{money(result.askPrice)}</dd>
            <dt>Shipping</dt><dd className="text-right">{money(result.shipping)}</dd>
            <dt>Market value</dt><dd className="text-right">{money(result.marketValue)}</dd>
            <dt>Platform fees</dt><dd className="text-right">−{money(result.fees)}</dd>
            <dt className="font-semibold">Net profit at asking</dt>
            <dd className="text-right font-semibold">{money(result.netProfit)}</dd>
            <dt>ROI</dt><dd className="text-right">{Math.round(result.roi * 100)}%</dd>
            <dt>Confidence</dt><dd className="text-right">{result.confidence}/100 · {result.compsCount} comps</dd>
          </dl>
          <ul className="mt-6 list-disc space-y-1 pl-5 text-xs text-neutral-500">
            {result.notes.map((n) => <li key={n}>{n}</li>)}
          </ul>
        </section>
      )}
    </div>
  );
}
