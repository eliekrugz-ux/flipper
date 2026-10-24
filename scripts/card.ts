import { shoot } from "@/lib/sources/solari";
import { writeFileSync } from "node:fs";

// Has Solari render one production deal card, to check the Marketer's image path end to end.
(async () => {
  const id = process.argv[2];
  const t = Date.now();
  const shots = await shoot([`https://flipperdeals.vercel.app/card/${id}`], { width: 1080, height: 1080, selector: "#card" });
  const s = [...shots.values()][0];
  if (s instanceof Error) return console.log("ERR", s.message);
  writeFileSync(`${process.env.TEMP}/card.png`, s.png);
  console.log("OK", s.png.length, "bytes", Date.now() - t, "ms");
})();
