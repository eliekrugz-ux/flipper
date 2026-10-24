import { chromium } from "playwright-core";

// Solari: remote headless browsers. The REST shape (POST/DELETE /sessions, Bearer auth,
// wsEndpoint/cdpEndpoint in the response) follows the official solari-browser SDK source.
const BASE = "https://api.getsolari.com";

export const solariEnabled = () => !!process.env.SOLARI_API_KEY;

interface Session { sessionId: string; wsEndpoint: string; cdpEndpoint?: string }

async function api(method: string, path: string, body?: unknown) {
  return fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.SOLARI_API_KEY}`,
      "content-type": "application/json",
      ...(method === "POST" ? { "Idempotency-Key": crypto.randomUUID() } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

// `/ws/<id>` -> `/cdp/<id>`, the SDK's fallback when the gateway omits cdpEndpoint.
const cdpFrom = (s: Session) => s.cdpEndpoint ?? s.wsEndpoint.replace("/ws/", "/cdp/");

export interface PageShot { png: Buffer; title: string; text: string; finalUrl: string }

// A marketplace's anti-bot page. We never try to get past one; the listing API stays the source of truth.
export const isBotWall = (s: PageShot) => /are you human|verify you are human|captcha|access denied/i.test(s.title + s.text.slice(0, 500));

// Opens each URL in one Solari browser, returns a screenshot (of `selector` if given) plus the visible text.
export async function shoot(
  urls: string[],
  { timeoutMs = 25000, width = 1280, height = 900, selector }: { timeoutMs?: number; width?: number; height?: number; selector?: string } = {},
): Promise<Map<string, PageShot | Error>> {
  const out = new Map<string, PageShot | Error>();
  const res = await api("POST", "/sessions", { stealth: true });
  if (!res.ok) throw new Error(`Solari POST /sessions ${res.status} ${await res.text()}`);
  const session = (await res.json()) as Session;
  const browser = await chromium.connectOverCDP(cdpFrom(session), { timeout: timeoutMs });
  try {
    const context = browser.contexts()[0] ?? (await browser.newContext());
    const page = await context.newPage();
    await page.setViewportSize({ width, height });
    for (const url of urls) {
      try {
        await page.goto(url, { waitUntil: "networkidle", timeout: timeoutMs });
        const target = selector ? page.locator(selector) : page;
        out.set(url, {
          png: await target.screenshot({ type: "png" }),
          title: await page.title(),
          text: (await page.innerText("body").catch(() => "")).slice(0, 4000),
          finalUrl: page.url(),
        });
      } catch (e) {
        out.set(url, e instanceof Error ? e : new Error(String(e)));
      }
    }
  } finally {
    await browser.close().catch(() => {});
    await api("DELETE", `/sessions/${encodeURIComponent(session.sessionId)}`).catch(() => {});
  }
  return out;
}
