import { recentDeals, usd } from "@/lib/queries";
import { SITE_URL } from "@/lib/site";

const ESC: Record<string, string> = { "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" };
const esc = (s: string) => s.replace(/[<>&'"]/g, (c) => ESC[c]);

// RSS of the public deal feed (links stay on-site, so the members window holds).
export async function GET() {
  const deals = await recentDeals(40);
  const items = deals.map((d) => `
    <item>
      <title>${esc(`${d.title} — est. net +${usd(d.net_profit)}`)}</title>
      <link>${SITE_URL}/deals</link>
      <guid isPermaLink="false">${d.id}</guid>
      <pubDate>${new Date(d.created_at).toUTCString()}</pubDate>
      <description>${esc(`Listed at ${usd(d.buy_price)}. Comparable listings put it at ${usd(d.market_value)}. Est. net +${usd(d.net_profit)} after fees and shipping, ${Math.round(d.roi * 100)}% ROI.`)}</description>
    </item>`).join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <title>Flipper deals</title>
  <link>${SITE_URL}</link>
  <description>Underpriced second-hand finds with the profit math done.</description>${items}
</channel></rss>`;
  return new Response(xml, { headers: { "content-type": "application/rss+xml; charset=utf-8" } });
}
