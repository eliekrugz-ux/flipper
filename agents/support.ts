import Anthropic from "@anthropic-ai/sdk";
import { db, logAction } from "@/lib/db";
import { legalDocs } from "@/lib/legal";
import { productFacts } from "./compliance";

// Support agent: answers buyer questions from the product facts and the live legal pages.
// Refunds and account problems are routed to Whop, where payments live; it never promises money back itself.
const MODEL = "claude-sonnet-5-5";

// Used when Claude is unavailable: the common questions, answered from the same policies.
const FAQ: [RegExp, string, boolean][] = [
  [/refund|money back|cancel|charge|billing/i, "Founding Seats can be refunded within 7 days of purchase, no questions asked. If a Check failed to return a verdict, your credit isn't used; if you paid and never got a result, you can get a full refund within 7 days. Request it through Whop from your purchase page.", true],
  [/seat|member|founding|access/i, "A Founding Seat ($49 one-time, capped at 50) gets you every verified deal, with comps, fees and net profit, 24 hours before the public sees the listing link. After buying, sign in on the Members page with the email you used on Whop.", false],
  [/check|verdict|paste|link/i, "Flipper Check ($7) takes any listing link and returns BUY, PASS or OFFER $X with the comparable listings, fees, net profit and a confidence score. Buy it on the Check page, then paste the link with the email you used at checkout.", false],
  [/price|value|comp|accurate|how do you/i, "We compare a listing against other live listings of the exact same item, drop outliers, and take the median. When sold prices aren't public we discount it by 18% to be conservative, then subtract fees, shipping and a $5 buffer. Deals must clear $20 net and 30% return.", false],
];

function faqAnswer(q: string) {
  const hit = FAQ.find(([re]) => re.test(q));
  return hit
    ? { answer: hit[1], escalate: hit[2] }
    : { answer: "I can't answer that one right now. Message us through Whop from your purchase page and we'll get back to you.", escalate: true };
}

export async function answer(question: string, email: string | null) {
  const q = question.trim().slice(0, 1000);
  if (!q) return { answer: "Ask anything about Flipper, Checks or Founding Seats.", escalate: false };
  const out = await claudeAnswer(q).catch(async (e) => {
    await logAction("support", "claude_unavailable", { error: String(e).slice(0, 200) });
    return faqAnswer(q);
  });
  await db()?.from("support_messages").insert({ email, question: q, answer: out.answer, escalate: !!out.escalate });
  await logAction("support", out.escalate ? "answered_escalated" : "answered", { question: q.slice(0, 200) });
  return out;
}

async function claudeAnswer(q: string): Promise<{ answer: string; escalate: boolean }> {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("no ANTHROPIC_API_KEY");
  const [facts, { docs }] = await Promise.all([productFacts(), legalDocs()]);
  const msg = await new Anthropic().messages.create({
    model: MODEL,
    max_tokens: 400,
    messages: [{
      role: "user",
      content: `You answer customer questions for Flipper. Use only these facts and policies; if the answer isn't in them, say you don't know and point to Whop support. Refund requests, billing problems and account access: explain the policy and tell them to request it through Whop (we can't process money here). Plain, friendly, under 120 words. Never give financial advice or promise profit.
Facts: ${JSON.stringify(facts)}
Policies: ${JSON.stringify(docs)}
Question: ${q}
Return JSON only: {"answer": "...", "escalate": true|false}  (escalate = needs a refund, billing or account action)`,
    }],
  });
  const text = msg.content.find((b) => b.type === "text")?.text ?? "{}";
  try {
    return JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
  } catch {
    return { answer: text.trim(), escalate: false };
  }
}
