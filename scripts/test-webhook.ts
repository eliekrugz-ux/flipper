// Sends Standard-Webhooks-signed test events to the deployed webhook, the same way Whop signs them.
// Uses a non-payment event type so nothing is recorded as revenue.
import { createHmac } from "node:crypto";

const URL = process.argv[2] ?? "https://flipper-lyart.vercel.app/api/whop/webhook";
const secret = process.env.WHOP_WEBHOOK_SECRET!;

async function send(label: string, sign: (s: string) => string) {
  const id = `msg_flippertest${Date.now()}`;
  const ts = Math.floor(Date.now() / 1000).toString();
  const body = JSON.stringify({ id, type: "flipper.test", api_version: "v1", data: { ok: true } });
  const sig = sign(`${id}.${ts}.${body}`);
  const r = await fetch(URL, {
    method: "POST",
    headers: { "content-type": "application/json", "webhook-id": id, "webhook-timestamp": ts, "webhook-signature": `v1,${sig}` },
    body,
  });
  console.log(`${label}: ${r.status} ${await r.text()}`);
}

(async () => {
  await send("valid signature", (s) => createHmac("sha256", secret).update(s).digest("base64"));
  await send("wrong secret   ", (s) => createHmac("sha256", "ws_wrong").update(s).digest("base64"));
})();
