# X CLAW Launch Day Checklist

A copy-paste runbook from this repo → live `xclaw.vercel.app` → real $XCLAW token on Pump.fun → public announcement on X.

> **Time estimate:** 60–90 minutes. Add 30 min buffer for the first try.
>
> **Prerequisites:** Node.js 20+, GitHub account, Vercel account, Phantom (or Solflare) wallet on Solana mainnet with **at least 0.1 SOL**.

---

## Phase 0 — Local sanity check (5 min)

```bash
cd x-claw
npm install
cp .env.example .env.local
```

Edit `.env.local`:

```
XAI_API_KEY=xai-...                                     # primary; console.x.ai
# (optional) ANTHROPIC_API_KEY / OPENAI_API_KEY        as fallback
NEXT_PUBLIC_SOLANA_RPC_URL=https://...                 # paid RPC strongly recommended
```

Then:

```bash
npm run dev
```

Open http://localhost:3000 and click through:

- ✅ `/` Landing — Hero (Grok-native Meme Coin Launch Agent), four engine cards, safety model, final CTA.
- ✅ `/dashboard` Command Center — four phases (Attention · Community · Intelligence · Execution).
- ✅ `/launch` Wizard — fill concept (don't sign yet), Generate Launch Kit returns Grok content, Review screen renders.

If anything fails locally, fix before deploying. Common issues:

- Solana imports broken → re-run `npm install`.
- Grok empty → check `XAI_API_KEY`, restart `npm run dev`.
- Wallet button blank → install Phantom/Solflare extension.

---

## Phase 1 — Mainnet test launch with throwaway metadata (10 min)

This catches bugs **before** the real $XCLAW launch.

1. Go to `/launch`.
2. Enter throwaway concept:
   - **Idea:** "Test launch for X CLAW agent flow"
   - **Token name:** `X Claw Test`
   - **Ticker:** `CLWTST`
   - **Logo:** any small PNG (or skip for placeholder)
3. Generate launch kit → review (don't read carefully).
4. Connect Phantom (mainnet wallet, 0.05+ SOL).
5. **Initial dev buy = 0 SOL** for the test.
6. Click **Sign & Launch on Pump.fun** → sign in Phantom.
7. Wait for confirmation (10–30 sec).
8. Verify:
   - Wizard arrives at "Launched" with a real Solscan link.
   - Solscan shows tx as `Success`.
   - The Pump.fun link opens to a real token page.
   - `/launches/<mint>` shows token info and top holders.
9. ✅ If all the above worked, you're ready for the real $XCLAW launch.

If the tx fails:

- "Blockhash not found" → public RPC was slow, retry, or upgrade to Helius/QuickNode.
- "Insufficient lamports" → fund the wallet.
- PumpPortal HTTP 5xx → wait, retry.

---

## Phase 2 — GitHub: open-source the repo (10 min)

`.gitignore` already excludes `.env.local`. Quick sanity:

```bash
grep -r "xai-" --exclude-dir=node_modules .   # nothing
grep -r "ANTHROPIC_API_KEY=sk-" --exclude-dir=node_modules .   # nothing
```

Push:

```bash
git init
git add .
git commit -m "X CLAW: The Grok-native Meme Coin Launch Agent"

gh repo create x-claw --public --source . --push --description "The Grok-native Meme Coin Launch Agent. Attention · Community · Intelligence · Execution."
# OR manually create on github.com then:
# git remote add origin git@github.com:<you>/x-claw.git
# git push -u origin main
```

After push:

- Topics: `solana`, `pump-fun`, `grok`, `xai`, `meme-coin`, `agent`, `nextjs`.
- Pin the repo on your profile.

---

## Phase 3 — Vercel deploy (15 min)

1. https://vercel.com/new → **Import Git Repository** → `x-claw`.
2. Framework: Next.js (auto-detected).
3. **Environment Variables** (paste from `.env.local`):
   - `XAI_API_KEY`
   - `XAI_MODEL` (optional)
   - `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` (optional fallbacks)
   - `NEXT_PUBLIC_SOLANA_RPC_URL`
4. **Deploy** → 1–2 min build.
5. Test the live URL:
   - `/` landing renders.
   - `/dashboard` Command Center renders.
   - `/launch` wizard generates with Grok.
6. Optional: add a custom domain.

---

## Phase 4 — Real $XCLAW token launch (5 min)

The meta moment. Launch $XCLAW *with* X CLAW.

1. Open `https://<your-vercel-url>.vercel.app/launch`.
2. Concept input:
   - **Idea:** "X CLAW = the Grok-native meme coin launch agent. Launching $XCLAW from inside its own agent."
   - **Token name:** `X CLAW`
   - **Ticker:** `XCLAW`
   - **Theme:** "cyber-claw mascot, neon-on-dark"
   - **Audience:** "X-native crypto and meme coin builders"
   - **Launch style:** Fair launch
   - **Website:** your Vercel URL
   - **Twitter:** the X CLAW X handle
   - **Telegram:** if applicable
   - **Logo:** the X CLAW logo (PNG, ≥ 256px square, ≤ 1MB)
3. Generate kit → review carefully (this one matters).
4. Edit description if needed.
5. Connect wallet → Sign & Launch.
6. **Initial dev buy:** your call (common 0.5–2 SOL).
7. Sign in Phantom.
8. Note the **mint address** and **Pump.fun URL**.
9. ✅ Token live.

---

## Phase 5 — Announcement (15 min)

### Pinned tweet template

```
X CLAW is live.

The Grok-native Meme Coin Launch Agent.

X attention · community momentum · on-chain intelligence
→ autonomous launch execution.

Just launched $XCLAW using X CLAW itself.
→ pump.fun/coin/<MINT>
→ <your-vercel-url>
→ github.com/<you>/x-claw  (open source · MIT)

From meme idea to Pump.fun launch.
```

### Follow-up thread

Open the live `/launch` flow → don't actually launch, just use the kit's tweets as a thread, OR run the X Post Generator (built into `/launches/<mint>`) on `$XCLAW` itself.

### Where to post

- Telegram crypto/meme channels.
- Reddit: r/solana, r/CryptoCurrency (read each sub's promotion rules).
- Reply to Pump.fun's tweet about your token.
- Crypto Twitter Spaces if you can hop on.

---

## Phase 6 — Post-launch monitoring (ongoing)

Use `/launches/<mint>`:

- Top holder distribution. If top-10 share spikes too high, plan accordingly.
- Creator wallet activity.
- Generate post-launch X content (the X Post Generator is pre-filled with your token).

Track issues at `https://github.com/<you>/x-claw/issues`.

---

## Common landmines

| Symptom | Cause | Fix |
|---|---|---|
| Tx fails: "blockhash not found" | RPC lag | Use Helius / QuickNode RPC |
| PumpPortal 502/503 | Outage | Retry, wait |
| Phantom popup doesn't appear | Site not HTTPS | Vercel handles it; locally use Chrome with `localhost` |
| Logo upload fails | Image too large | PNG ≤ 1MB, square, ≥ 256px |
| `npm install` fails on Solana deps | Old Node | Use Node 20+ |
| Build fails on Vercel: ESM imports | next.config missing | `transpilePackages` is in this repo's `next.config.mjs` — verify it's there |
| Grok 401 | Bad `XAI_API_KEY` | Re-paste from console.x.ai (no quotes) |

---

## After launch

- **Day 1:** monitor mentions, reply to every legit question with the X Post Generator.
- **Week 1:** ship one more on-chain enrichment — Helius DAS for token prices, Birdeye for live charts.
- **Month 1:** wire Supabase, add auth, add direct Pump.fun program calls (drop the PumpPortal dependency).

Good luck.
