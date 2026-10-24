import Anthropic from "@anthropic-ai/sdk";
import { db, logAction, logDecision } from "@/lib/db";
import { SITE_URL } from "@/lib/site";
import { usd, type Deal } from "@/lib/queries";

// IndexNow key: public by design (served at /<key>.txt to prove we own the site).
const INDEXNOW_KEY = "6d14c6b12529019211f843e1cdadb21b";
const PER_TICK = 2;
const MODEL = "claude-sonnet-5-5";

// Channels turn on when their credentials exist. "feed" (RSS + site + search pings) is always on.
const channels = {
  bluesky: !!(process.env.BLUESKY_HANDLE && process.env.BLUESKY_APP_PASSWORD),
  discord: !!process.env.DISCORD_WEBHOOK_URL,
};

function template(d: Deal) {
  const ask = d.deal_type === "offer" && d.offer_price
    ? `offer ${usd(d.offer_price)} (listed ${usd(d.buy_price)})`
    : `listed at ${usd(d.buy_price)}`;
  return `Found: ${d.title.slice(0, 90)}, ${ask}. The same item goes for about ${usd(d.market_value)}. Est. net +${usd(d.net_profit)} after fees and shipping.`;
}

// Claude tightens the copy; the numbers always come from the deal row, never the model.
async function write(d: Deal): Promise<string> {
  const base = template(d);
  if (!process.env.ANTHROPIC_API_KEY) return base;
  try {
    const msg = await new Anthropic().messages.create({
      model: MODEL,
      max_tokens: 200,
      messages: [{
        role: "user",
        content: `Rewrite this resale-deal post for flippers on social media. Keep every dollar amount exactly as given, under 220 characters, no hashtags, no emojis, no hype words. Plain, specific, credible. Output only the post.\n\n${base}`,
      }],
    });
    const text = msg.content.find((b) => b.type === "text")?.text.trim() ?? "";
    const amounts = base.match(/\$[\d,.]+/g) ?? [];
    return text && text.length <= 240 && amounts.every((n) => text.includes(n)) ? text : base;
  } catch {
    return base;
  }
}

async function postBluesky(text: string, link: string, title: string) {
  const s = await fetch("https://bsky.social/xrpc/com.atproto.server.createSession", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ identifier: process.env.BLUESKY_HANDLE, password: process.env.BLUESKY_APP_PASSWORD }),
  }).then((r) => r.json() as Promise<{ accessJwt: string; did: string }>);
  const r = await fetch("https://bsky.social/xrpc/com.atproto.repo.createRecord", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${s.accessJwt}` },
    body: JSON.stringify({
      repo: s.did,
      collection: "app.bsky.feed.post",
      record: {
        $type: "app.bsky.feed.post",
        text,
        createdAt: new Date().toISOString(),
        embed: {
          $type: "app.bsky.embed.external",
          external: { uri: link, title, description: "Underpriced finds with the profit math done." },
        },
      },
    }),
  });
  if (!r.ok) throw new Error(`bluesky ${r.status}`);
}

async function postDiscord(text: string, link: string) {
  const r = await fetch(process.env.DISCORD_WEBHOOK_URL!, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ content: `${text}\n${link}` }),
  });
  if (!r.ok) throw new Error(`discord ${r.status}`);
}

// Tells Bing, Yandex and other IndexNow engines the deal pages changed, so new deals get indexed fast.
async function pingIndexNow() {
  const r = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host: new URL(SITE_URL).host,
      key: INDEXNOW_KEY,
      keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
      urlList: [`${SITE_URL}/`, `${SITE_URL}/deals`, `${SITE_URL}/feed.xml`],
    }),
  });
  await logAction("marketer", "indexnow", { status: r.status });
}

export async function run() {
  const d = db();
  if (!d) return { posted: 0, sent: 0 };
  const since = new Date(Date.now() - 6 * 36e5).toISOString();
  const [{ data: fresh }, { data: done }] = await Promise.all([
    d.from("deals").select("*").eq("status", "verified").gte("created_at", since)
      .order("final_score", { ascending: false }).limit(20),
    d.from("posts").select("deal_id").gte("created_at", new Date(Date.now() - 7 * 864e5).toISOString()),
  ]);
  const already = new Set((done ?? []).map((p) => p.deal_id));
  const picks = ((fresh as Deal[]) ?? []).filter((x) => !already.has(x.id)).slice(0, PER_TICK);
  if (!picks.length) {
    await logAction("marketer", "idle", { reason: "no new verified deals" });
    return { posted: 0, sent: 0 };
  }

  let sent = 0;
  for (const deal of picks) {
    const text = await write(deal);
    await d.from("posts").insert({ channel: "feed", content: text, deal_id: deal.id, url: `${SITE_URL}/deals` });
    for (const [channel, on] of Object.entries(channels)) {
      if (!on) continue;
      const { data: post } = await d.from("posts").insert({ channel, content: text, deal_id: deal.id }).select("id").single();
      if (!post) continue;
      const link = `${SITE_URL}/go/${post.id}`;
      try {
        if (channel === "bluesky") await postBluesky(text, link, deal.title);
        if (channel === "discord") await postDiscord(text, link);
        await d.from("posts").update({ url: link }).eq("id", post.id);
        sent++;
      } catch (e) {
        await d.from("posts").delete().eq("id", post.id);
        await logAction("marketer", "post_failed", { channel, error: String(e) });
      }
    }
    await logAction("marketer", "posted", { deal: deal.title, net: deal.net_profit, text });
  }
  await pingIndexNow().catch((e) => logAction("marketer", "indexnow_failed", { error: String(e) }));
  if (!Object.values(channels).some(Boolean)) {
    await logDecision("marketer", "Posting to site feed only",
      "No social channel credentials yet; deals go out via RSS and IndexNow until Bluesky or Discord is connected.",
      { picks: picks.length });
  }
  return { posted: picks.length, sent };
}
