"use client";

import { useState, useTransition } from "react";
import { ask } from "./actions";

export function SupportForm() {
  const [q, setQ] = useState("");
  const [email, setEmail] = useState("");
  const [reply, setReply] = useState<{ answer: string; escalate: boolean } | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="panel p-6">
      <label className="label">Your question</label>
      <textarea
        className="mt-2 w-full rounded-xl border border-ink bg-paper p-3" rows={4} maxLength={1000}
        value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. What do I get with a Founding Seat?"
      />
      <label className="label mt-4 block">Email (optional, for follow-up)</label>
      <input
        className="mt-2 w-full rounded-xl border border-ink bg-paper p-3" type="email"
        value={email} onChange={(e) => setEmail(e.target.value)}
      />
      <button
        type="button" disabled={!q.trim() || pending} className="pill mt-5 disabled:opacity-40"
        onClick={() => start(async () => setReply(await ask(q, email)))}
      >{pending ? "Thinking…" : "Ask"}</button>
      {reply && (
        <div className="mt-6 border-t-[3px] border-ink pt-4">
          <p className="whitespace-pre-line">{reply.answer}</p>
          {reply.escalate && (
            <p className="mt-3 text-sm text-ink-2">For refunds or billing, open your purchase on Whop and message us there.</p>
          )}
        </div>
      )}
    </div>
  );
}
