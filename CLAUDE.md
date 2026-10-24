# FLIPPER — Build Brief for Claude Code

Read this whole file before writing any code. It is the single source of truth for this project.
Save a copy as `CLAUDE.md` in the repo root so it persists across sessions.

---

## 0. Context (why this exists)

I'm Elie, competing TODAY (Sat Oct 24, 2026) in the **Terac Zero Human Hackathon** in NYC.
The goal: build an **autonomous, agent-run company** that sells a real product and earns **real, organic revenue by itself today**.

**Hard rules from organizers (non-negotiable):**
1. Must use the **Terac MCP** to bring a human-in-the-loop. We have **$100 in Terac credits**. Studies must target the **General Population**.
2. All payments must go through **Whop**. Revenue is tracked by our **Whop Business ID**.
3. All revenue must be **real and organic** (no fake/self purchases).
4. Terac criteria: use real human input collected during the hackathon to make the project **measurably better**, with a **clear before and after**. Build something people can use, react to, label, rate, rank, or compare.

**Submission (end of day):** Whop Business ID, basic info, **public GitHub repo**, **a live deployment**, **2 min demo video**.

**Tracks we're targeting (all of them):**
| Track | Prize | What wins it |
|---|---|---|
| Best Overall | $1000 | Creativity, technical skill, impressiveness |
| Best Agent-Run Company | $1000 | Most real revenue today + post-hackathon potential |
| 2nd Best Agent-Run Company | $500 | Same |
| Best Use of Terac | $500 | Best human-in-the-loop via Terac MCP |
| Best Use of Exa | $1000 credits | Exa = web search built for agents |
| Best Use of Solari | $600 credits | Solari = headless browsers, sandboxes, desktops |

Bonus: >$2,000 revenue today wins an extra $1,000.

API keys/credits for Terac, Exa, Solari are in the organizers' Notion doc. Elie will paste them into `.env.local`. **Never commit keys.**

---

## 1. The product: Flipper

**One line:** Flipper is a resale deal company run entirely by AI agents. It finds underpriced second-hand items online, proves what they're worth with sold comps, and sells those deals to flippers through Whop.

**What we sell on Whop:**
1. **Flipper Founding Seat** — ~$49 one-time (or $49/mo), capped at 50 seats. Access to the Whop community where agents post verified deals with full profit math. Seat cap solves the "everyone competes for the same deal" problem and creates urgency.
2. **Flipper Check** — ~$5–$10 per check. User pastes any listing URL (eBay, Reverb, Discogs, Etsy, etc.), gets a verdict: **BUY / PASS / OFFER $X**, with comps, fees, net profit, and a confidence score. Cheap impulse buy = easiest organic revenue.

Prices are starting points. The CEO agent may change them based on Terac study results (log the decision).

**Niche focus:** music gear + vinyl first (Reverb + Discogs have clean item IDs and real sold-price data), plus electronics/sneakers via eBay. Exact item matching = accurate comps.

**Differentiator vs Swoopa / Underpriced.app:** those are tools a human operates. Flipper is the operator: finds, prices, verifies, markets, sells, and improves itself from real human feedback. It publishes a public track record of every call.

---

## 2. Tech stack (use this unless something is blocked)

- **Next.js (App Router) + TypeScript**, deployed on **Vercel**
- **Supabase** (Postgres) for deals, checks, studies, decisions, revenue events
- **Anthropic API** (Claude) for agent reasoning, listing parsing, copywriting
- **Exa** (`exa-js`) for search/discovery/research
- **Solari** for headless browser verification + posting (read their docs; credentials in Notion)
- **Terac MCP** for human studies (read https://www.terac.com/mcp and docs)
- **Whop** for products, checkout, and payment webhooks (read Whop developer docs)
- **eBay Browse API**, **Reverb API**, **Discogs API** for listings/prices
- Cron: Vercel Cron or a simple `/api/agents/tick` route hit on a schedule

**Sponsor tooling available (from the organizers' credits guide — use these):**
- **Whop:** has a **Whop CLI**, a **Whop MCP / AI setup**, and a **Whop plugin for Claude Code** (manages products, checkout, payments, ads). Install the Whop plugin/MCP in this Claude Code session first and use it to create products and checkout links. Follow the Whop developer quickstart for API keys + webhooks. **Test checkout in Whop's sandbox before going live**, then switch to live. Whop can also host a website, but we deploy on Vercel and link to Whop checkout.
- **Exa:** has an **Exa MCP (no API key needed)** for this Claude Code session, plus the Search API and **Agent API** (research, list building, enrichment) for runtime. Use the Exa API key (from the coupon credits) in the app itself.
- **Solari:** SDKs are **Python** (`solari-browser` for headless browsers, `solari-sandbox` for sandboxes). Because the main app is TypeScript, put Solari work in a small Python worker (`/workers/solari/`, e.g. FastAPI or a script the agent tick calls), deployed separately or run as a Vercel Python function if supported. Read Solari docs first.
- **Terac:** install the Terac MCP in Claude Code per Terac's MCP docs. Credits are redeemed via the organizers' link (Elie handles this). Launch studies for the **General Population**.
- **Never put coupon codes, redemption links, or keys in the repo** (repo is public).

**IMPORTANT: Do not invent API endpoints or SDK method names.** For Whop, Terac, Solari, Exa, eBay, Reverb, Discogs: read the official docs first (WebFetch), then implement. If docs are unclear, write a thin wrapper with a clear TODO and tell me.

**Do NOT scrape Facebook Marketplace, Vinted, Mercari, Poshmark, Depop, or Grailed** (no public API, ToS violations). Only official APIs + Exa search + Solari visiting public listing pages on allowed sites.

---

## 3. Agent architecture (multiple agents working in unison)

Each agent = a module in `/agents/<name>.ts` with a `run()` function, logging every action to `agent_logs` and every significant choice to `decisions` (with reasoning). The dashboard reads these.

| Agent | Job | Tools |
|---|---|---|
| **CEO** | Orchestrates. Sets daily budget, prices, categories. Decides when to spend Terac credits (must get a quote first and check remaining budget). Kills bad ideas. Logs every decision + reasoning. | Claude, Supabase |
| **Scout** | Finds candidate underpriced listings. Researches sold prices. Finds communities/forums to market to. | **Exa**, Reverb API, Discogs API, eBay Browse API |
| **Pricer** | Normalizes item identity (brand/model/condition or Discogs release ID), pulls comps, computes market value (median of sold comps, outliers removed), net profit, confidence, sell-through. | Claude, APIs |
| **Verifier** | Opens each listing in a headless browser to confirm it's live, price unchanged, photos match; saves screenshot. | **Solari** |
| **Researcher** | Designs and launches Terac studies, collects submissions, summarizes results, pushes concrete changes to other agents. | **Terac MCP** |
| **Marketer** | Writes posts from real deals ("Flipper found $X profit on Y"), posts to channels, does outbound to communities Scout found. Tracks which posts drive signups. | Claude, **Solari**, Exa |
| **Sales/Support** | Runs Whop store copy, answers buyer questions, delivers Flipper Check results, posts deals into Whop community. | Whop, Claude |
| **Finance & Compliance** | Tracks Whop revenue (webhooks), Terac spend, P&L. Writes Terms, Refund Policy, disclaimers ("not financial advice, no guaranteed profit, buy at your own risk"). Ensures marketplace ToS respected. | Supabase, Claude |

### Pricing math (Pricer)
```
market_value   = median(sold comps, last 30–90 days, same item + condition, outliers removed)
fees           = market_value * platform_fee_rate   (eBay ≈ 13.25%; make configurable per platform)
net_profit     = market_value - fees - est_shipping - buy_price - safety_buffer
roi            = net_profit / buy_price
confidence     = f(num_comps, price spread, sell_through)   // 0–100
qualifies      = net_profit >= MIN_PROFIT (default $20) AND roi >= MIN_ROI (default 0.30) AND confidence >= 60
```
**Sold data reality:** eBay Browse API returns ACTIVE listings only; sold data requires Marketplace Insights API (restricted). Discogs has sales history/price suggestions; Reverb has a Price Guide. **Fallback** if no sold data: median of active listings × 0.82, and mark `comp_source = "active_proxy"` so we're transparent.

---

## 4. Terac plan ($100 budget — be stingy)

Rule: **Always request a feasibility quote first.** CEO approves only if `quote <= remaining_budget` and logs the decision. Target **General Population**.

Terac MCP tools (from terac.com/mcp): `terac_list_opportunities`, `terac_request_feasibility`, `terac_get_feasibility_request`, `terac_launch_draft_opportunity`, `terac_get_submissions`, `terac_get_context`, `terac_pause_opportunity`. Verify exact params in docs.

**Studies (each must produce a measurable before/after):**

| # | Study | People do | Before → After | Budget |
|---|---|---|---|---|
| 1 | **Offer page test** (launch FIRST, it improves sales all day) | Compare 2–3 versions of the Flipper landing/Whop page; rate clarity, trust, "would you pay?" | Agent's v1 page → winning version goes live. Show score lift + conversion. | ~$35 |
| 2 | **Deal appeal** | Rate 15–20 real Flipper deals: "Would you buy at this price?" (1–5) + "How trustworthy does this listing look?" (1–5) | Ranking by profit only → ranking by profit + human appeal/trust. Show % of top deals rated "would buy" before vs after. | ~$35 |
| 3 | **Flipper Check usability** | Use Flipper Check on a sample listing; rate clarity/usefulness; say what's confusing | Verdict format v1 → v2 rewritten from feedback, re-rated. | ~$25 |
| — | Reserve | Re-run best study on improved version to prove the "after" | | rest |

Store every study in `terac_studies` (design, quote, cost, status, raw submissions, summary, change_made, before_metric, after_metric). Dashboard shows before/after charts.

---

## 5. Data model (Supabase)

- `deals` (id, source, url, title, item_key, condition, buy_price, market_value, comp_source, comps_count, fees, shipping, net_profit, roi, confidence, human_appeal, human_trust, final_score, status [found|verified|posted|expired], screenshot_url, created_at)
- `checks` (id, whop_user_id, listing_url, verdict, offer_price, details_json, paid, created_at)
- `terac_studies` (see above)
- `decisions` (id, agent, decision, reasoning, inputs_json, created_at)
- `agent_logs` (id, agent, action, payload_json, created_at)
- `revenue_events` (id, whop_event_id, product, amount, created_at)  // from Whop webhooks
- `posts` (id, channel, content, deal_id, url, clicks, signups, created_at)
- `config` (key, value)  // prices, thresholds, budgets the CEO can change

---

## 6. Pages (deployment)

- `/` — Landing: what Flipper is, live deals feed (public proof), CTAs to Whop checkout (Founding Seat + Flipper Check)
- `/check` — Flipper Check: paste URL → requires Whop purchase/verification → verdict
- `/deals` — Public track record: every deal Flipper called + outcome
- `/dashboard` — For judges: live revenue (from Whop), agent activity feed, CEO decision log, Terac studies with before/after charts, Terac spend vs $100
- `/legal/terms`, `/legal/refunds`, `/legal/disclaimer` — written by Compliance agent
- `/api/whop/webhook` — record payments, grant access
- `/api/agents/tick` — runs the agent loop (cron)

---

## 7. Build order (follow this sequence)

**HARD DEADLINE: submissions lock at 6:45 PM ET.** Lunch 11:45–12:15. Clock schedule:
| Time (ET) | Phase |
|---|---|
| 10:20–11:00 | Phase 0: setup, Whop products, repo, Vercel deploy with live checkout |
| 11:00–11:45 | Phase 1a: Scout + Pricer, launch Terac Study 1 before lunch |
| 12:15–1:45 | Phase 1b + 2a: real deals feed live, Whop webhook, Flipper Check end to end |
| 1:45–3:30 | Phase 2b: Verifier (Solari), Marketer, Sales/Support, CEO + decision log |
| 3:30–5:00 | Phase 3: apply Study 1, run Studies 2 and 3, dashboard, legal pages |
| 5:00 | FEATURE FREEZE. Bug fixes only. |
| 5:00–6:15 | README, record 2 min video |
| 6:15–6:45 | Submit (buffer). Do not start new work. |

If behind schedule at 3:30, cut in this order: Study 3, Solari posting (keep Solari verifier), outbound. Never cut: Whop revenue, Terac Study 1 before/after, dashboard, video.

**Phase 0 — Setup (first 30 min)**
0. Install/verify MCPs in this Claude Code session: **Terac MCP**, **Whop plugin/MCP**, **Exa MCP**. Tell me if any need me to authenticate.
1. `create-next-app` (TS, App Router, Tailwind). Init git, push to a **public** GitHub repo.
2. Add `.env.example` with: `ANTHROPIC_API_KEY, EXA_API_KEY, SOLARI_API_KEY, TERAC_API_KEY (or MCP config), WHOP_API_KEY, WHOP_WEBHOOK_SECRET, WHOP_COMPANY_ID, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, EBAY_CLIENT_ID, EBAY_CLIENT_SECRET, REVERB_TOKEN, DISCOGS_TOKEN`. Add `.env.local` to `.gitignore`.
3. Create Supabase tables (migration file in repo).
4. Deploy skeleton to Vercel immediately (landing page with Whop checkout links). **Revenue clock starts here.**

**Phase 1 — Core money loop (next ~1.5 hrs)**
5. Scout: Reverb + Discogs + Exa search for listings in target categories.
6. Pricer: comps + math above. Unit-test the math.
7. Landing page shows real deals feed. Whop checkout links live.
8. Researcher: launch **Terac Study 1 (offer page)** ASAP.

**Phase 2 — Autonomy (next ~1.5 hrs)**
9. Verifier via Solari (screenshots).
10. Whop webhook → `revenue_events` + access grant. Flipper Check flow end to end.
11. Marketer: generate + post deal content (via Solari or platform APIs), outbound to communities found with Exa.
12. Sales/Support: post verified deals to Whop community; answer questions.
13. CEO orchestration + decision log.

**Phase 3 — Human loop + polish (next ~1 hr)**
14. Apply Study 1 results (swap in winning page, record before/after).
15. Run Study 2 (deal appeal) once ≥15 deals; update scoring.
16. Run Study 3 (Check usability); ship v2 verdict format.
17. Dashboard with charts. Compliance pages.

**Phase 4 — Submit (last hour)**
18. Feature freeze. README (architecture diagram, agents, Terac before/after with numbers, how to run).
19. Record 2 min video (script below). Submit Whop Business ID, repo, deployment, video.

---

## 8. Demo video script (2:00)

- **0:00–0:15** "Flipper is a resale deal company run entirely by agents."
- **0:15–0:50** Scout (Exa) finds a deal → Pricer shows the math → Verifier (Solari) confirms the listing live.
- **0:50–1:20** CEO decides it needs human input → Terac quote → study launched → results → product changed. Show before/after.
- **1:20–1:45** Marketer posts → buyer purchases on Whop → revenue ticks up on dashboard.
- **1:45–2:00** Total revenue, Terac impact numbers, why it keeps running after today.

---

## 9. Working rules for you (Claude Code)

- Ship the smallest working version of each step, deploy, then improve. A working loop beats a perfect architecture.
- Read official docs before integrating any third-party API. Don't guess endpoints.
- Keep secrets out of the repo. Public repo is required.
- Every agent action → `agent_logs`. Every judgment call → `decisions` with reasoning.
- Terac: quote before spend, never exceed $100 total, general population audience.
- No fake revenue, no self-purchases, no scraping banned sites.
- When blocked on a key/credential/account step only Elie can do, stop and tell me exactly what to click.
- After each phase, give me a 3-line status: what works, what's next, what you need from me.

**Start now with Phase 0, step 1.**
