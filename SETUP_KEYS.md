# Setup keys — xAI + Supabase (5 minutes)

Drop these env vars into **Vercel → Project Settings → Environment Variables**.
Save and the next deploy will pick them up — the app gracefully runs without
them but turns ON real Grok generation and Supabase persistence as soon as
they appear.

---

## 1. xAI Grok (primary LLM)

**Where:** <https://console.x.ai/team/default/api-keys>

1. Sign in with X (Twitter).
2. **Create API Key** → name it `koki-prod`.
3. Copy the key (starts with `xai-...`).

**Vercel env (one entry):**

| Name           | Value          | Environments       |
| -------------- | -------------- | ------------------ |
| `XAI_API_KEY`  | `xai-...`      | Production · Preview |

Optional overrides (leave default if unsure):

| Name              | Value                       |
| ----------------- | --------------------------- |
| `XAI_MODEL`       | `grok-4-latest`             |
| `XAI_MODEL_FAST`  | `grok-4-fast-reasoning`     |

---

## 2. Supabase (persistence + radar cache + LLM usage tracking)

**Where:** <https://supabase.com/dashboard/projects>

### 2-1. Create a project

1. **New project** → name `koki` → strong database password → region closest to your users.
2. Wait ~1 minute for provisioning.

### 2-2. Run the schema

1. Sidebar → **SQL Editor** → **New query**.
2. Paste the entire contents of `supabase/schema.sql` from this repo.
3. **Run**. You should see `Success. No rows returned`.
4. Sidebar → **Table Editor** → confirm these tables exist:
   - `launches_v1`
   - `radar_signals`
   - `llm_usage`
   - (and the auth-gated ones: `users`, `projects`, `launches`, etc.)

### 2-3. Grab the keys

Sidebar → **Project Settings → API**:

| Vercel env name                      | Supabase field                     |
| ------------------------------------ | ---------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`           | **Project URL**                    |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`      | **anon / public** key              |
| `SUPABASE_SERVICE_ROLE_KEY`          | **service_role** key (keep secret) |

> The `service_role` key bypasses RLS — never paste it in a browser, only in
> Vercel server-side env. The two `NEXT_PUBLIC_` vars are safe to expose.

---

## 3. Solana RPC (recommended — production-grade)

The default `https://api.mainnet-beta.solana.com` is rate-limited and unreliable
for live launches. Pick any paid RPC and set:

| Name                            | Value                           |
| ------------------------------- | ------------------------------- |
| `NEXT_PUBLIC_SOLANA_RPC_URL`    | (Helius / QuickNode / Triton URL) |

**Helius free tier:** <https://www.helius.dev> → 100k requests/day, plenty for MVP.

---

## 4. Verify

After Vercel redeploys with the new env:

- Visit `https://<your-url>.vercel.app/launch` — generate a launch kit. The
  provider badge should show **Grok · grok-4-latest** (not "mock").
- Run a real Pump.fun launch (start with a throwaway ticker + dev buy 0 SOL).
- Visit `https://<your-supabase>.supabase.co/project/<id>/editor` → table
  `launches_v1` → confirm a new row appeared with your wallet pubkey.
- Table `llm_usage` → confirm rows are being inserted per LLM call.

---

## What works without these keys

The app is designed to **never break** when keys are missing:

- No `XAI_API_KEY` → falls back to Anthropic, then OpenAI, then a deterministic
  mock. The provider badge in the UI will show whatever actually ran.
- No Supabase keys → launch history persists in `localStorage` only (per-browser).
  No cross-device sync, no usage tracking. Everything else still works.
- No paid RPC → uses the public Solana RPC, which may rate-limit during load.
