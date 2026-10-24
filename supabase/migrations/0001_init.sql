-- Flipper core schema. All writes happen server-side with the service role key.

create extension if not exists "pgcrypto";

create table if not exists deals (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  url text not null unique,
  title text not null,
  item_key text,
  condition text,
  buy_price numeric not null,
  market_value numeric,
  comp_source text,                -- sold | price_guide | active_proxy
  comps_count int default 0,
  fees numeric,
  shipping numeric,
  net_profit numeric,
  roi numeric,
  confidence int,
  human_appeal numeric,
  human_trust numeric,
  final_score numeric,
  status text not null default 'found' check (status in ('found','verified','posted','expired')),
  screenshot_url text,
  created_at timestamptz not null default now()
);

create table if not exists checks (
  id uuid primary key default gen_random_uuid(),
  whop_user_id text,
  listing_url text not null,
  verdict text check (verdict in ('BUY','PASS','OFFER')),
  offer_price numeric,
  details_json jsonb,
  paid boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists terac_studies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  design jsonb,
  feasibility_request_id text,
  opportunity_id text,
  quote numeric,
  cost numeric,
  status text not null default 'draft',
  raw_submissions jsonb,
  summary text,
  change_made text,
  before_metric jsonb,
  after_metric jsonb,
  created_at timestamptz not null default now()
);

create table if not exists decisions (
  id uuid primary key default gen_random_uuid(),
  agent text not null,
  decision text not null,
  reasoning text,
  inputs_json jsonb,
  created_at timestamptz not null default now()
);

create table if not exists agent_logs (
  id uuid primary key default gen_random_uuid(),
  agent text not null,
  action text not null,
  payload_json jsonb,
  created_at timestamptz not null default now()
);

create table if not exists revenue_events (
  id uuid primary key default gen_random_uuid(),
  whop_event_id text unique,
  product text,
  amount numeric not null,
  created_at timestamptz not null default now()
);

create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  channel text not null,
  content text not null,
  deal_id uuid references deals(id) on delete set null,
  url text,
  clicks int default 0,
  signups int default 0,
  created_at timestamptz not null default now()
);

create table if not exists config (
  key text primary key,
  value jsonb not null
);

insert into config (key, value) values
  ('price_seat_usd', '49'),
  ('price_check_usd', '7'),
  ('seat_cap', '50'),
  ('min_profit_usd', '20'),
  ('min_roi', '0.30'),
  ('min_confidence', '60'),
  ('terac_budget_usd', '100'),
  ('fee_rates', '{"ebay":0.1325,"reverb":0.0819,"discogs":0.09,"etsy":0.095}'),
  ('safety_buffer_usd', '5')
on conflict (key) do nothing;

create index if not exists deals_status_idx on deals(status, created_at desc);
create index if not exists agent_logs_created_idx on agent_logs(created_at desc);
create index if not exists decisions_created_idx on decisions(created_at desc);

-- RLS on, no public policies: the browser never talks to these tables directly.
alter table deals enable row level security;
alter table checks enable row level security;
alter table terac_studies enable row level security;
alter table decisions enable row level security;
alter table agent_logs enable row level security;
alter table revenue_events enable row level security;
alter table posts enable row level security;
alter table config enable row level security;
