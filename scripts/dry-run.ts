// Runs Scout + Pricer once against live data. Writes to Supabase only if its env vars are set.
import { run as scout, DEFAULT_WATCHLIST } from "../agents/scout";
import { run as pricer } from "../agents/pricer";

(async () => {
  const candidates = await scout(DEFAULT_WATCHLIST, !!process.env.EXA_API_KEY);
  const deals = await pricer(candidates);
  for (const d of deals.sort((a, b) => b.net_profit - a.net_profit)) {
    console.log(`$${d.buy_price} -> mv $${d.market_value} | net $${d.net_profit} roi ${d.roi} conf ${d.confidence} | ${d.title.slice(0, 50)} | ${d.url}`);
  }
})();
