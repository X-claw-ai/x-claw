# HAMR.fun Roadmap

HAMR.fun ships in three phases. Phase 1 is live today. Phase 2 polishes the open-source repo. Phase 3 adds a Telegram front for the same agent.

> Detect → Analyze → Generate → Launch → Monitor

---

## Phase 1 — Full Web App MVP (live)

The Grok-native Meme Coin Launch Agent as a web app, end to end.

- [x] Real-time Meme Radar UI (mock feed, 4 memes)
- [x] Analyze page with 10-criteria scoring + risks + recommended angle
- [x] Generate Launch Kit — 30+ fields (identity, Pump.fun metadata, X content, community content, FAQ, plan, checklist)
- [x] Direct Pump.fun launch via PumpPortal `trade-local` + Phantom/Solflare signing
- [x] Post-launch monitor — supply, top holders, creator wallet, Grok-recommended next actions
- [x] Provider-agnostic LLM router (xAI → Anthropic → OpenAI → mock)
- [x] Open-source under MIT
- [x] Vercel deployment
- [ ] $HAMR token launch via HAMR.fun itself

## Phase 2 — Open-source polish (now → ongoing)

Make the repo a credible open-source project for builders to fork and trust.

- [x] LICENSE (MIT) + SECURITY.md + CONTRIBUTING.md
- [x] ARCHITECTURE.md (this section's home)
- [x] ROADMAP.md (you're reading it)
- [x] LAUNCH.md (the live launch-day runbook)
- [ ] Public Issues triage
- [ ] First external contributor merged
- [ ] Plugin pattern documented for new agent modules
- [ ] Per-phase architecture diagrams
- [ ] Test coverage on prompt parsers + Solana adapters

## Phase 3 — Telegram Bot (next workstream)

Lower the entry barrier for non-developers. Same agent, lighter surface.

- [ ] `@koki_bot` skeleton with `/start`, `/help`
- [ ] `/radar` — push trending memes from `/api/meme-radar`
- [ ] `/analyze <meme-id>` — return Phase 02 brief in Telegram
- [ ] `/launch <meme-id>` — generate kit, return shareable link to web for signing
- [ ] `/monitor <mint>` — periodic dashboard summaries
- [ ] Community alerts: launch alerts, raid alerts, monitor reports
- [ ] Bot hosting (Cloudflare Workers / Fly.io)

Telegram and Web share the same backend APIs. The bot is a thin frontend.

## Beyond Phase 3 (research / vision)

- Multi-chain (Base, Hyperliquid, etc.) where bonding-curve launchpads exist
- Real-time X API integration for live trend feed
- On-chain indexer integration (Helius DAS / Birdeye)
- Holder-cohort analysis ("smart money" detection)
- Coordinated launch windows (queue + readiness check)
- $HAMR token-gated agent credits
- Self-hostable agent (Docker image)
- Public agent marketplace where builders publish their own modules
