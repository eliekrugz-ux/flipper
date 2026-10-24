import { findListings } from "@/lib/sources/exa";
import { EBAY_WATCHLIST, WEB_DOMAINS } from "@/agents/scout";

// Exa yield probe: how many priced, for-sale listings each query returns.
(async () => {
  const sample: [string, string][] = [
    [EBAY_WATCHLIST.furniture[0], "furniture"], [EBAY_WATCHLIST.clothing[2], "clothing"],
    [EBAY_WATCHLIST.cameras?.[0] ?? "Fujifilm X100V", "cameras"], [EBAY_WATCHLIST.cars[2], "cars"],
  ];
  for (const [q, cat] of sample) {
    const t = Date.now();
    const ls = await findListings(q, WEB_DOMAINS[cat]);
    console.log(`\n${cat} | ${q} | ${ls.length} listings | ${Date.now() - t}ms`);
    for (const l of ls.slice(0, 6)) console.log(`  $${l.price} ${l.condition} ${l.title.slice(0, 60)} ${new URL(l.url).hostname}`);
  }
})();
