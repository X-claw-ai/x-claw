# Contributing to KOKi.ai

Thanks for considering a contribution. KOKi.ai is an open Agent OS for the X era — every X account being able to have its own AI workforce only happens if many people build modules together.

## TL;DR

- Pick (or open) an issue.
- Build a working agent module under `app/agents/<slug>` + `app/api/<slug>` + a row in `lib/agentTemplates.ts`.
- Respect the safety model (drafts only, user signs/confirms).
- Open a PR with a short demo (gif or screenshots) and we'll review.

## What we'd love help on

- **New live agent modules** — anything from the five verticals (Creator · Business · Community · Research · On-chain) that's currently "Coming Soon".
- **LLM providers** — adapters for additional providers in `lib/llm/`. Keep the interface in `lib/llm/types.ts` stable.
- **Pump.fun reliability** — alternative paths (direct Pump.fun program calls, Jito bundles) in case PumpPortal is down.
- **Wallet support** — additional wallet adapters beyond Phantom / Solflare.
- **Persistence** — wire `lib/storage/launches.ts` to Supabase so launches persist across devices.
- **Docs** — examples, troubleshooting, walkthroughs.

## Module conventions

When you add a new agent, follow this layout:

```
app/agents/<slug>/page.tsx                          # SSR shell + PageHeader
components/<slug>/<Slug>Agent.tsx                   # "use client" UI
app/api/<slug>/route.ts                             # Server-side prep work
lib/llm/prompt<Slug>.ts                             # System + user prompt builder
```

And:

- Add a row to `lib/agentTemplates.ts` (`AGENT_TEMPLATES` for on-chain modules, or update the relevant `AGENT_VERTICALS` entry's `liveModule`).
- Use `callLLM` from `lib/llm/router.ts` so the module respects the Grok-first provider order.
- Use `<Field>`, `<Card>`, `<Badge>`, `<StepIndicator>` from `components/ui/` for visual consistency.

## Compliance rules (non-negotiable)

These rules apply to every module:

1. No guaranteed-profit, guaranteed-viral, or guaranteed-listing language anywhere in the UI or generated output.
2. No partnership claims with xAI, X, Grok, Pump.fun, PumpPortal, or any third party. Use "Grok-compatible / X-native / Solana-compatible" framing instead.
3. No silent posting, sending, transferring, or signing. Every external action requires an explicit user click or wallet signature.
4. The server never holds private keys or seed phrases.
5. The UI must honestly report which LLM provider produced any given output (the `ProviderBadge` pattern).

PRs that violate these will be rejected even if technically clever.

## Coding style

- TypeScript strict; no `any` unless commented why.
- Tailwind utility classes; reuse the design tokens in `tailwind.config.ts`.
- Server work in `/app/api/<slug>/route.ts`; never import server-only modules from client components.
- Keep new dependencies small; if you add one, justify it in the PR description.

## Local dev

```bash
git clone <your-fork>
cd koki
npm install
cp .env.example .env.local
# fill in keys you have (XAI_API_KEY recommended, Anthropic/OpenAI as fallback)
npm run dev
```

For Pump.fun launch testing: use a wallet with **0.05+ SOL on mainnet**. There is no devnet path. Always test with a throwaway token (dev buy = 0) before launching the real thing.

## License

By contributing you agree your contributions are licensed under the MIT License (see `LICENSE`).
