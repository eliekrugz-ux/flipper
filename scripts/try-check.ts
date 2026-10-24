import { runCheck } from "../lib/check";
(async () => {
  for (const u of process.argv.slice(2)) {
    try { const r = await runCheck(u); console.log(JSON.stringify({ v: r.verdict, offer: r.offerPrice, ask: r.askPrice, mv: r.marketValue, net: r.netProfit, roi: r.roi, conf: r.confidence, comps: r.compsCount, src: r.compSource, notes: r.notes }, null, 1)); }
    catch (e) { console.log("ERR", u, String(e)); }
  }
})();
