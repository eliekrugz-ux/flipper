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
    <div>
      <form onSubmit={submit} className="panel grid gap-4 p-6 sm:p-8">
        <label className="grid gap-1.5">
          <span className="label">Listing link</span>
          <input
            required type="url" value={url} onChange={(e) => setUrl(e.target.value)}
            placeholder="https://reverb.com/item/…" className="field"
          />
        </label>
        <label className="grid gap-1.5">
          <span className="label">Email used on Whop</span>
          <input
            required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com" className="field"
          />
        </label>
        <button disabled={busy} className="pill mt-2 w-full">
          {busy ? "Pricing it…" : "Run Flipper Check"}
        </button>
      </form>

      {error && <p className="mt-4 border-l-4 border-red bg-paper-2 p-3 text-sm">{error}</p>}

      {result && (
        <section className="mt-8 border-t-[3px] border-ink pt-4">
          <div className="label">Verdict</div>
          <div className={`display mt-2 text-6xl ${result.verdict === "PASS" ? "text-red" : "chrome-text"}`}>
            {result.verdict === "OFFER" ? `OFFER ${money(result.offerPrice!)}` : result.verdict}
          </div>
          <div className="mt-2 truncate text-sm text-ink-2">{result.title}</div>
          <dl className="mt-6 grid grid-cols-2 text-sm tnum">
            {[
              ["Asking price", money(result.askPrice)],
              ["Shipping", money(result.shipping)],
              ["Market value", money(result.marketValue)],
              ["Platform fees", `−${money(result.fees)}`],
              ["Net profit at asking", money(result.netProfit)],
              ["ROI", `${Math.round(result.roi * 100)}%`],
              ["Confidence", `${result.confidence}/100 · ${result.compsCount} comps`],
            ].map(([k, v]) => (
              <div key={k} className="col-span-2 grid grid-cols-2 border-b border-hair py-2">
                <dt className={k.startsWith("Net") ? "font-bold" : ""}>{k}</dt>
                <dd className={`text-right ${k.startsWith("Net") ? "font-extrabold" : ""}`}>{v}</dd>
              </div>
            ))}
          </dl>
          <ul className="mt-4 space-y-1 text-xs text-ink-2">
            {result.notes.map((n) => <li key={n}>— {n}</li>)}
          </ul>
        </section>
      )}
    </div>
  );
}
