-- KOKi.ai — Supabase / Postgres schema draft (MVP)
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
  chain text not null check (chain in ('solana', 'base', 'ethereum')),
  ticker text not null,
  token_name text not null,
  status launch_status not null default 'draft',
  tx_signature text,
  pump_url text,
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
  chain text not null check (chain in ('solana', 'base', 'ethereum')),
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
-- agent_templates is public-read (no PII, just catalog)
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
-- These tables are written from the server using SUPABASE_SERVICE_ROLE_KEY.
-- The browser never holds the service role key. Reads go through API routes
-- that filter by wallet pubkey from the request body / query.
-- ───────────────────────────────────────────────────────────────────────────

-- Real Pump.fun launches, keyed by wallet pubkey.
create table if not exists public.launches_v1 (
  id uuid primary key default uuid_generate_v4(),
  wallet_pubkey text not null,
  mint_pubkey text not null unique,
  ticker text not null,
  token_name text not null,
  chain text not null default 'solana',
  status text not null default 'launched',
  tx_signature text,
  pump_url text,
  metadata_uri text,
  dev_buy_sol numeric,
  mock boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists launches_v1_wallet_idx on public.launches_v1 (wallet_pubkey);
create index if not exists launches_v1_created_idx on public.launches_v1 (created_at desc);

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
  wallet_pubkey text,
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
create index if not exists llm_usage_wallet_idx on public.llm_usage (wallet_pubkey);

-- These three tables are server-write-only; RLS off because the service-role
-- key bypasses RLS anyway. If you later add Supabase Auth and want wallet-
-- linked accounts, enable RLS and add policies similar to launches.
