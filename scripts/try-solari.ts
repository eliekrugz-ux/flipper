import { writeFileSync } from "node:fs";
import { shoot } from "@/lib/sources/solari";
import { db } from "@/lib/db";

// Opens two live deal listings in a Solari browser and saves the screenshots locally.
(async () => {
  const { data } = await db()!.from("deals").select("url").neq("status", "expired").lte("buy_price", 300).limit(2);
  const urls = (data ?? []).map((d) => d.url);
  const t = Date.now();
  const shots = await shoot(urls);
  for (const [url, s] of shots) {
    if (s instanceof Error) { console.log("ERR", url, s.message); continue; }
    const f = `${process.env.TEMP}/solari-${shots.size}-${urls.indexOf(url)}.png`;
    writeFileSync(f, s.png);
    console.log("OK", url, "|", s.title.slice(0, 60), "|", s.png.length, "bytes ->", f);
  }
  console.log(Date.now() - t, "ms");
})();
