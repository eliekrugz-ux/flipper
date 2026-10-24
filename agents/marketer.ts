import Anthropic from "@anthropic-ai/sdk";
import { db, getConfig, logAction } from "@/lib/db";
import { SITE_URL } from "@/lib/site";
import { FEATURED_MAX_BUY, usd, type Deal } from "@/lib/queries";

// Marketer runs every minute (its own pg_cron job). Each run, every connected channel whose
// spacing has passed gets one post. Spacing keeps accounts out of spam filters: a suspended
// account sells nothing. The CEO can retune it through config "marketing_cadence".
const DEFAULT_CADENCE_MIN: Record<string, number> = { bluesky: 6, mastodon: 6, telegram: 2, discord: 3 };
const MODEL = "claude-sonnet-5-5";

// IndexNow key: public by design (served at /<key>.txt to prove we own the site).
const INDEXNOW_KEY = "6d14c6b12529019211f843e1cdadb21b";

const channels: Record<string, boolean> = {
  bluesky: !!(process.env.BLUESKY_HANDLE && process.env.BLUESKY_APP_PASSWORD),
  mastodon: !!(process.env.MASTODON_URL && process.env.MASTODON_TOKEN),
  telegram: !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
  discord: !!process.env.DISCORD_WEBHOOK_URL,
};

type Row = Deal & { item_key: string; category: string | null };
interface Piece { text: string; title: string; dealId: string | null; to: "deals" | "check" | "" }

// "Roland Juno-106 61-Key Programmable Polyphonic Synthesizer 1984 - 1985 - Black" -> "Roland Juno-106 61-Key Programmable Polyphonic"
const shortTitle = (t: string) => t.split(" - ")[0].split(/\s+/).slice(0, 6).join(" ");

function dealPost(d: Row): Piece {
  const ask = d.deal_type === "offer" && d.offer_price
    ? `offer ${usd(d.offer_price)} (listed ${usd(d.buy_price)})`
    : `listed at ${usd(d.buy_price)}`;
  return {
    text: `Found: ${shortTitle(d.title)}, ${ask}. The same item goes for about ${usd(d.market_value)}. Est. net +${usd(d.net_profit)} after fees and shipping.`,
    title: shortTitle(d.title), dealId: d.id, to: "deals",
  };
}

// Every few posts, sell instead of show: the Founding Seat, backed by what was found.
function pitchPost(n: number, deals: Row[]): Piece {
  const total = deals.reduce((s, d) => s + Number(d.net_profit), 0);
  if (n % 2 === 0 && deals.length) {
    return {
      text: `Last 24h: ${deals.length} underpriced listings found, ${usd(total)} in est. net profit after fees and shipping. Founding Seat members get every link 24 hours before the public. 50 seats, $49.`,
      title: "Founding Seat: deals 24h first", dealId: null, to: "",
    };
  }
  return {
    text: "Flipper Founding Seat: every verified underpriced listing, with comps and net profit, 24 hours before anyone else. Capped at 50 so members aren't racing each other. $49 one-time.",
    title: "Founding Seat: 50 max, $49", dealId: null, to: "",
  };
}

// Claude tightens the copy; dollar amounts must survive untouched or the original is used.
async function polish(text: string): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) return text;
  try {
    const msg = await new Anthropic().messages.create({
      model: MODEL,
      max_tokens: 200,
      messages: [{
        role: "user",
        content: `Rewrite this post for resellers on social media. Keep every dollar amount exactly as given, under 260 characters, no hashtags, no emojis, no hype words. Plain, specific, credible. Output only the post.\n\n${text}`,
      }],
    });
    const out = msg.content.find((b) => b.type === "text")?.text.trim() ?? "";
    const amounts = text.match(/\$[\d,.]+/g) ?? [];
    return out && out.length <= 280 && amounts.every((a) => out.includes(a)) ? out : text;
  } catch {
    return text;
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

async function postMastodon(text: string, link: string) {
  const r = await fetch(`${process.env.MASTODON_URL!.replace(/\/$/, "")}/api/v1/statuses`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${process.env.MASTODON_TOKEN}` },
    body: JSON.stringify({ status: `${text}\n${link}` }),
  });
  if (!r.ok) throw new Error(`mastodon ${r.status}`);
}

async function postTelegram(text: string, link: string) {
  const r = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: process.env.TELEGRAM_CHAT_ID, text: `${text}\n${link}` }),
  });
  if (!r.ok) throw new Error(`telegram ${r.status}`);
}

async function postDiscord(text: string, link: string) {
  const r = await fetch(process.env.DISCORD_WEBHOOK_URL!, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ content: `${text}\n${link}` }),
  });
  if (!r.ok) throw new Error(`discord ${r.status}`);
}

const send: Record<string, (text: string, link: string, title: string) => Promise<void>> = {
  bluesky: postBluesky, mastodon: postMastodon, telegram: postTelegram, discord: postDiscord,
};

// Tells Bing, Yandex and other IndexNow engines the deal pages changed. Called from the 30-min tick.
export async function pingIndexNow() {
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
  const live = Object.keys(channels).filter((c) => channels[c]);
  if (!d || !live.length) return { posted: 0 };
  const cadence = { ...DEFAULT_CADENCE_MIN, ...(await getConfig<Record<string, number>>("marketing_cadence", {})) };
  const [{ data: fresh }, { data: recent }] = await Promise.all([
    // Affordable, high-return finds sell the Seat better than five-figure gear.
    d.from("deals").select("*").neq("status", "expired").gte("created_at", new Date(Date.now() - 864e5).toISOString())
      .lte("buy_price", FEATURED_MAX_BUY).order("roi", { ascending: false }).limit(200),
    d.from("posts").select("channel, deal_id, created_at").in("channel", live)
      .gte("created_at", new Date(Date.now() - 2 * 864e5).toISOString()).order("created_at", { ascending: false }),
  ]);
  const deals = (fresh as Row[]) ?? [];
  const keyOf = new Map(deals.map((x) => [x.id, x.item_key]));

  let posted = 0;
  for (const channel of live) {
    const mine = (recent ?? []).filter((p) => p.channel === channel);
    const last = mine[0] ? new Date(mine[0].created_at).getTime() : 0;
    if (Date.now() - last < cadence[channel] * 6e4) continue;

    // Fresh deal this channel hasn't carried, not the same item as its last 10 posts; non-music first.
    const usedIds = new Set(mine.map((p) => p.deal_id));
    const recentKeys = new Set(mine.slice(0, 10).map((p) => keyOf.get(p.deal_id)));
    const deal = deals
      .filter((x) => !usedIds.has(x.id) && !recentKeys.has(x.item_key))
      .sort((a, b) => Number(a.source === "reverb") - Number(b.source === "reverb"))[0];
    const piece = mine.length % 5 === 4 || !deal ? pitchPost(mine.length, deals) : dealPost(deal);

    const text = await polish(piece.text);
    const { data: post } = await d.from("posts").insert({ channel, content: text, deal_id: piece.dealId }).select("id").single();
    if (!post) continue;
    const link = `${SITE_URL}/go/${post.id}${piece.to ? `?to=${piece.to}` : ""}`;
    try {
      await send[channel](text, link, piece.title);
      await d.from("posts").update({ url: link }).eq("id", post.id);
      await logAction("marketer", "posted", { channel, text });
      posted++;
    } catch (e) {
      await d.from("posts").delete().eq("id", post.id);
      await logAction("marketer", "post_failed", { channel, error: String(e) });
    }
  }
  return { posted, channels: live };
}
