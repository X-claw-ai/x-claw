# KOKi.ai Architecture

KOKi.ai is an AI agent organized as five phases that flow into each other. Each phase has a clear UI surface, a server route, and an LLM prompt + parser pair. Mock data falls back wherever a real provider isn't configured, so the UI is always demoable.

```
Detect → Analyze → Generate → Launch → Monitor
```

## Top-level layout

```
koki/
├── app/
│   ├── page.tsx                     Landing
│   ├── dashboard/page.tsx           Phase 01 Detect — Meme Radar + agent loop
│   ├── analyze/page.tsx             Phase 02 Analyze
│   ├── launch/page.tsx              Phase 03 Generate + Phase 04 Launch
│   ├── launches/page.tsx            Launch history list
│   ├── launches/[mint]/page.tsx     Phase 05 Monitor (per-token)
│   ├── settings/page.tsx
│   └── api/
│       ├── meme-radar/route.ts            Detect feed
│       ├── meme-analyze/route.ts          Analyze (Grok scoring)
│       ├── generate-launch-kit/route.ts   Generate (Grok kit)
│       ├── pump-launch/route.ts           Launch (IPFS + PumpPortal trade-local)
│       ├── wallet-tracking/route.ts       Wallet brief
│       ├── x-post-generator/route.ts      Post-launch content
│       ├── token-info/route.ts            Mint supply + top holders (Solana RPC)
│       └── monitor-actions/route.ts       Grok next-actions advisor
├── components/
│   ├── shell/                       Navbar · Footer · PageHeader · WalletPill
│   ├── ui/                          Badge · Button · Card · Field · PhaseProgress
│   ├── landing/                     Hero · AttentionLayerSection · EnginesSection · SafetySection · FinalCTA
│   ├── dashboard/                   CommandCenter
│   ├── meme-radar/                  MemeCard · MemeRadarSection
│   ├── analyze/                     MemeAnalysisView
│   ├── pump-launch/                 PumpLaunchWizard (6 steps)
│   ├── wallet-tracking/             WalletTrackingAgent (reused on monitor)
│   ├── x-post-generator/            XPostGeneratorAgent (reused on monitor)
│   ├── launches/                    LaunchesTable · TokenInfoBlock · MonitorActionsBlock · LaunchMonitorPage
│   └── solana/                      WalletContext (Phantom + Solflare)
├── lib/
│   ├── llm/                         Provider-agnostic LLM router + 4 prompts
│   │   ├── router.ts                xAI → Anthropic → OpenAI → mock chain
│   │   ├── xai.ts · anthropic.ts · openai.ts
│   │   ├── promptLaunchKit.ts       Generate (Phase 03)
│   │   ├── promptMemeAnalysis.ts    Analyze (Phase 02)
│   │   ├── promptWalletSummary.ts   Wallet brief
│   │   ├── promptXPosts.ts          X post generator
│   │   ├── promptMonitorActions.ts  Monitor (Phase 05)
│   │   └── parseLaunchKit.ts        Strict JSON validator
│   ├── pumpfun/                     IPFS upload + PumpPortal adapter
│   ├── solana/                      Connection · walletReport · tokenInfo
│   ├── memeRadar.ts                 RADAR_MEMES + types  (Detect data layer)
│   ├── memeAnalysis.ts              Analysis types + local stub
│   ├── storage/launches.ts          localStorage launch history
│   ├── generate.ts                  Mock launch-kit fallback
│   ├── types.ts                     Shared TS types
│   └── ...
└── supabase/schema.sql              Optional persistence schema (future)
```

## Phase 01 — Detect

**UI:** `/dashboard` → `<MemeRadarSection />`
**Data:** `lib/memeRadar.ts` exports `RADAR_MEMES: RadarMeme[]`. Today: 4 mock memes. Tomorrow: replace with `/api/meme-radar` calling X API + Grok trend search + on-chain indexers.
**Each meme card** carries: name, ticker, short description, 6 sub-scores, launch readiness, source, sample post count, and a `concept` block ready to seed Phase 03.

The `RadarMeme` shape is the seam — UI doesn't change when the data source goes live.

## Phase 02 — Analyze

**UI:** `/analyze?meme=<id>` → `<MemeAnalysisView />`
**API:** `POST /api/meme-analyze { memeId }` → `{ analysis: MemeAnalysis }`
**Prompt:** `lib/llm/promptMemeAnalysis.ts` — system rules + JSON schema.
**Output:**
- `launchReadiness` ∈ High / Medium / Watch / Avoid
- 2-3 sentence summary
- 3-5 "why it has potential" bullets
- 3-5 "key risks" bullets
- best launch angle, recommended audience, recommended timing
- 10-criteria score grid (viral, meme clarity, X engagement, community fit, ticker strength, narrative, on-chain, timing, saturation risk, brand/legal risk)

CTA: **Generate Launch Kit** → `/launch?meme=<id>&go=1`.

## Phase 03 — Generate

**UI:** `/launch` → `<PumpLaunchWizard />` steps 0–2.
**API:** `POST /api/generate-launch-kit { ConceptInput }` → `{ kit: LaunchKit }`
**Prompt:** `lib/llm/promptLaunchKit.ts` — system + strict JSON schema for ~30 fields.
**Parser:** `lib/llm/parseLaunchKit.ts` — manual validation, no zod dep.

**LaunchKit shape (full)** includes:

- Identity: tokenName, ticker, shortDescription, longDescription, memeThesis, tagline, mascotConcept, imagePrompt
- Pump.fun metadata block
- X marketing: xBio, 10 launchTweets, 5 viralHooks, 5 threadIdeas, 20 raidReplies, 5 DM templates, founder & product announcements
- Community: telegramAnnouncement, discordAnnouncement, communityOnboarding, raidMission, 5–7 FAQ
- Discovery: dexscreenerCopy, cmcDescription
- Plan: 7-day plan, daily checklist

Provider transparency — UI always shows "Generated by Grok / Claude / OpenAI / Mock".

## Phase 04 — Launch

**UI:** `/launch` → `<PumpLaunchWizard />` steps 3–5.
**Flow:**
1. Wallet connect (Phantom / Solflare via `@solana/wallet-adapter`)
2. Client generates a fresh **mint keypair** (server never sees it)
3. `POST /api/pump-launch` → server uploads metadata to Pump.fun IPFS, calls PumpPortal `trade-local`, returns unsigned transaction (base64)
4. Client deserializes → signs with mint keypair → wallet signs → submits to Solana RPC
5. Awaits confirmation, persists `SavedLaunch` to localStorage, navigates to monitor

Hard rule: **the server never signs**. The mint keypair lives only in the browser.

## Phase 05 — Monitor

**UI:** `/launches/[mint]` → `<LaunchMonitorPage />`
**Sub-blocks:**
- `<MonitorActionsBlock />` — Grok-recommended 4-6 next actions + risk signals (POST `/api/monitor-actions`)
- `<TokenInfoBlock />` — total supply, top-10 holders, distribution %  (POST `/api/token-info`, Solana RPC)
- `<WalletTrackingAgent />` — creator wallet brief (POST `/api/wallet-tracking`, Solana RPC + Grok)
- `<XPostGeneratorAgent />` — post-launch X content, prefilled with token name (POST `/api/x-post-generator`, Grok)

Future: integrate Helius / Birdeye for live volume + liquidity, X API for engagement.

## LLM router

`lib/llm/router.ts` is the single seam for any LLM call:

```ts
callLLM({ messages, responseFormat, temperature, maxTokens })
```

Provider chain: **xAI Grok → Anthropic Claude → OpenAI → Mock fallback**. Picks the first available `*_API_KEY` env var. Each prompt module owns its system + user templates.

## Compliance enforced at the prompt level

Every system prompt across all 5 phases includes the KOKi.ai compliance rules:

1. No guaranteed-profit / pump / listing claims.
2. No fake partnership claims with xAI / X / Grok / Pump.fun / Solana.
3. No market-manipulation language.
4. Drafts only; the human team is the final decision maker.

The UI also surfaces a "Generated by..." badge so users always know what produced any given output.

## Adding a new agent module

1. Add a prompt in `lib/llm/promptYourThing.ts` (system + user templates).
2. Add an API route in `app/api/your-thing/route.ts` that calls `callLLM` with your prompt and returns parsed JSON.
3. Add a client component in `components/your-thing/YourThing.tsx` that fetches the route and renders the UI.
4. Mount it on a page in `app/your-thing/page.tsx` with `<PageHeader />` and `<PhaseProgress current="..." />` if it slots into the agent loop.

Compliance rules: keep them in the system prompt. Provider transparency: keep the badge.

## Real integrations to wire next

| Where | What |
|---|---|
| `/api/meme-radar` | X API recent search + Grok trend search + Helius/Birdeye token mint feed |
| `/api/wallet-tracking` | Helius DAS for richer wallet detail (NFTs, transfers) |
| `/api/token-info` | Helius / Birdeye for live volume + liquidity |
| `/api/monitor-actions` | Pull live X engagement + holder velocity into the prompt context |
| Persistence | Supabase (schema in `supabase/schema.sql`) for cross-device launch history |
| Phase 3 | Telegram bot front for the same APIs (separate repo / workstream) |
