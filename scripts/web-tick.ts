import { run as scout, EBAY_WATCHLIST, webSlice } from "@/agents/scout";

// Runs only the Exa web slice for this half-hour and prints the candidates.
(async () => {
  console.log("slice:", webSlice(EBAY_WATCHLIST).map(([q]) => q));
  const c = await scout([], true, [], EBAY_WATCHLIST);
  for (const x of c) console.log(`${x.category} | $${x.listing.price} vs comps ${x.comps.length} | ${x.listing.title.slice(0, 60)}`);
})();
