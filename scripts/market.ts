import { run } from "@/agents/marketer";
import { db } from "@/lib/db";

(async () => {
  console.log(await run());
  const { data } = await db()!.from("posts").select("channel, content").order("created_at", { ascending: false }).limit(4);
  console.log(data);
})();
