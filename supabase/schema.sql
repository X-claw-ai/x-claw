-- KOKi.ai — Supabase / Postgres schema (Robinhood Chain / Pons era)
-- ───────────────────────────────────────────────────────────────────────────
-- Hard rules baked into the schema:
--   • No private key column, anywhere.
--   • No seed phrase column, anywhere.
--   • Wallet rows store only public address + chain + last-seen metadata.
--   • All sensitive tables protected by RLS (owner_id = auth.uid()).
-- ───────────────────────────────────────────────────────────────────────────

-- Extensions
create extension if not exists "uuid-ossp";

-- Users mirror Supabase auth.users (do not duplicate auth state)
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  x_handle text,
  telegram_handle text,
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  idea text,
  theme text,
  target_audience text,
  links jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create type launch_status as enum ('draft', 'pending-signature', 'launched', 'failed');

create table if not exists public.launches (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  chain text not null check (chain in ('robinhood', 'base', 'ethereum', 'arbitrum')),
  ticker text not null,
  token_name text not null,
  status launch_status not null default 'draft',
  tx_hash text,
  pons_url text,
  launched_at timestamptz,
  mock boolean not null default true,
  created_at timestamptz not null default now()
);

-- Generated content from the agents (tweets, replies, plan, checklist, etc.)
create table if not exists public.generated_content (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  kind text not null check (kind in (
    'metadata',
    'launch_tweets',
    'raid_replies',
    'dm_templates',
    'tg_announcement',
    'dexscreener',
    'cmc_copy',
    'plan_7d',
    'checklist'
  )),
  payload jsonb not null,
  created_at timestamptz not null default now()
);

-- Catalog of agent templates (later loaded by /api/agent-templates)
create table if not exists public.agent_templates (
  id uuid primary key default uuid_generate_v4(),
  slug text not null unique,
  name text not null,
  description text not null,
  status text not null check (status in ('live', 'coming-soon')),
  icon text,
  phase text check (phase in ('launch','monitor','market','execute')),
  sort_order int not null default 0
);

-- Token-gated credits placeholder
create table if not exists public.usage_credits (
  user_id uuid primary key references public.users(id) on delete cascade,
  balance int not null default 0,
  plan text not null default 'builder',
  updated_at timestamptz not null default now()
);

-- Wallet connections — public address only. No keys, ever.
create table if not exists public.wallet_connections (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  address text not null,
  chain text not null check (chain in ('robinhood', 'base', 'ethereum', 'arbitrum')),
  last_seen timestamptz not null default now(),
  unique (user_id, address, chain)
);

-- ── RLS ────────────────────────────────────────────────────────────────────
alter table public.users enable row level security;
alter table public.projects enable row level security;
alter table public.launches enable row level security;
alter table public.generated_content enable row level security;
alter table public.usage_credits enable row level security;
alter table public.wallet_connections enable row level security;
alter table public.agent_templates enable row level security;

create policy "users_self_read" on public.users
  for select using (auth.uid() = id);

create policy "projects_owner_all" on public.projects
  for all using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "launches_owner_all" on public.launches
  for all using (
    exists (
      select 1 from public.projects p
      where p.id = launches.project_id and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = launches.project_id and p.owner_id = auth.uid()
    )
  );

create policy "generated_owner_all" on public.generated_content
  for all using (
    exists (
      select 1 from public.projects p
      where p.id = generated_content.project_id and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = generated_content.project_id and p.owner_id = auth.uid()
    )
  );

create policy "credits_self_all" on public.usage_credits
  for all using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "wallets_self_all" on public.wallet_connections
  for all using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "agent_templates_public_read" on public.agent_templates
  for select using (true);

-- ───────────────────────────────────────────────────────────────────────────
-- MVP — wallet-keyed (no Supabase Auth required yet)
--
-- Server-writes only via SUPABASE_SERVICE_ROLE_KEY. The browser never
-- holds the service role. Reads go through API routes that filter by
-- wallet address from the request body / query.
-- ───────────────────────────────────────────────────────────────────────────

-- Real Pons launches on Robinhood Chain, keyed by wallet address.
--
-- Legacy note: the previous Solana/Pump.fun era used `mint_pubkey`,
-- `pump_url`, `tx_signature`, and `dev_buy_sol` on this same table.
-- After the migration those rows are purged in place (see the migration
-- section at the bottom) and re-created with the EVM shape below.
create table if not exists public.pons_launches (
  id uuid primary key default uuid_generate_v4(),
  wallet_address text not null,           -- 0x… EVM signer that deployed
  token_address text not null unique,     -- 0x… ERC-20 contract address
  pool_address text,                       -- Uniswap V3 pool paired vs WETH
  ticker text not null,
  token_name text not null,
  chain text not null default 'robinhood',
  status text not null default 'launched',
  tx_hash text,                            -- 0x… mainnet tx hash
  pons_url text,                           -- ponsfamily.com/launchpad/<token>
  explorer_url text,                       -- robinhoodchain.blockscout.com/…
  logo_url text,                           -- IPFS or public URL
  initial_buy_eth numeric,                 -- creator's first-buy in ETH, if any
  mock boolean not null default false,
  -- URL of the viral X post this token was anchored on (Auto-pilot or manual
  -- input). /api/auto-launch reads this to build a HARD-EXCLUDE LIST so no
  -- two KOKi-shipped tokens ever come from the same source post — strict
  -- dedup across all wallets.
  source_x_url text,
  created_at timestamptz not null default now()
);
create index if not exists pons_launches_wallet_idx on public.pons_launches (wallet_address);
create index if not exists pons_launches_created_idx on public.pons_launches (created_at desc);
create index if not exists pons_launches_source_x_url_idx on public.pons_launches (source_x_url) where source_x_url is not null;

-- Short-term X-post URL reservations. /api/auto-launch writes here the
-- INSTANT Grok returns a concept URL — solves a race where 20 concurrent
-- callers all anchor on the same hot post in the gap between "got concept"
-- and "launch committed to pons_launches". 30-min TTL: if the launch
-- completes the row in pons_launches takes over (permanent exclusion);
-- if the user abandons, the reservation expires.
create table if not exists public.reserved_x_urls (
  x_url text primary key,
  wallet_address text,
  reserved_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 minutes')
);
create index if not exists reserved_x_urls_expires_idx on public.reserved_x_urls (expires_at);

-- Cached Real-time Meme Radar signals (Detect → Analyze inputs).
create table if not exists public.radar_signals (
  id uuid primary key default uuid_generate_v4(),
  signal_id text not null unique,
  name text not null,
  ticker text not null,
  short_description text,
  scores jsonb not null,
  launch_readiness text not null,
  concept jsonb not null,
  source text,
  detected_at timestamptz not null default now(),
  sample_tweet_count int default 0,
  expires_at timestamptz not null default (now() + interval '24 hours')
);
create index if not exists radar_signals_expires_idx on public.radar_signals (expires_at);

-- Per-call LLM usage trail. Fire-and-forget, no PII.
create table if not exists public.llm_usage (
  id uuid primary key default uuid_generate_v4(),
  wallet_address text,
  provider text not null,
  model text not null,
  feature text not null,
  input_tokens int,
  output_tokens int,
  cost_usd numeric(10,6),
  fallback_reason text,
  duration_ms int,
  created_at timestamptz not null default now()
);
create index if not exists llm_usage_created_idx on public.llm_usage (created_at desc);
create index if not exists llm_usage_wallet_idx on public.llm_usage (wallet_address);

-- Pre-warmed x_search cache (Auto-pilot speed optimization). Unchanged
-- between the Solana and Robinhood Chain eras — the cache is chain-
-- agnostic; only the launch tables reshape.
create table if not exists public.cached_memes (
  id uuid primary key default uuid_generate_v4(),
  x_url text not null unique,
  x_author text not null,
  image_url text,
  summary text not null,
  meme_angle text,
  engagement_score numeric,
  batch_id uuid not null,
  cached_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '90 minutes')
);
create index if not exists cached_memes_expires_idx on public.cached_memes (expires_at desc);
create index if not exists cached_memes_batch_idx on public.cached_memes (batch_id);

-- ───────────────────────────────────────────────────────────────────────────
-- Migration script — Solana/Pump.fun era → Robinhood Chain/Pons era
--
-- Run this ONCE, on the day of the cutover, against the Supabase SQL
-- editor. It:
--   1. Drops the legacy `launches_v1` (Solana mint_pubkey / pump_url shape).
--   2. Renames `reserved_x_urls.wallet_pubkey` → `wallet_address` if it
--      still has the old column name.
--   3. Rewrites the `launches` / `wallet_connections` chain CHECK
--      constraints so `solana` is no longer allowed.
--
-- Idempotent-ish: safe to re-run — every DROP uses IF EXISTS, every ALTER
-- checks the column shape before touching it.
--
-- To roll forward manually in the Supabase dashboard:
--   supabase db push  (if you use migrations)  OR
--   copy the block below into the SQL editor.
-- ───────────────────────────────────────────────────────────────────────────

-- 1. Legacy launches — drop; the new EVM-shaped table above replaces it.
drop table if exists public.launches_v1 cascade;

-- 2. Reservations — rename wallet column if the old name is still around.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'reserved_x_urls'
      and column_name = 'wallet_pubkey'
  ) then
    alter table public.reserved_x_urls rename column wallet_pubkey to wallet_address;
  end if;
end $$;

-- 3. LLM usage — same rename.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'llm_usage'
      and column_name = 'wallet_pubkey'
  ) then
    alter table public.llm_usage rename column wallet_pubkey to wallet_address;
  end if;
end $$;
