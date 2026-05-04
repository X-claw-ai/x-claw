# Security Policy

X CLAW handles wallet flows and on-chain actions, so security reports are taken seriously and triaged fast.

## Core principles enforced in code

These are baked in across the codebase. If you see a violation, please report it as a security issue:

1. **No private keys in transit or at rest.** The server never receives, stores, or logs private keys, seed phrases, or signed-but-unsubmitted transactions tied to user funds.
2. **No silent fund movement.** On-chain actions require an explicit, on-screen, user-initiated wallet signature. Off-chain workflows require an explicit user confirmation.
3. **Mint keypairs are generated client-side** for token launches. Their secret stays in the browser memory and is discarded after the launch transaction is submitted.
4. **Server is a thin metadata broker** for the Pump Launch Agent — it talks to Pump.fun's IPFS uploader and to PumpPortal's `trade-local` endpoint, then returns an unsigned transaction the client signs.
5. **Provider transparency.** Whatever LLM actually served a request (Grok / Claude / OpenAI / mock) is reported back to the UI so the product never lies about what's running.

## Reporting a vulnerability

Please **do not** open a public GitHub issue for security problems.

Email: **security@xclaw.invalid** (replace with the project's real address before going public)

Include:

- A clear description of the issue.
- Steps to reproduce, or a proof-of-concept.
- Affected versions / commit hashes.
- Your name / handle for credit (or "anonymous" if you prefer).

You'll get an acknowledgement within 72 hours and a fix or status update within 14 days for valid reports. Coordinated disclosure is appreciated; we'll work with you on a public advisory once a patch is deployed.

## Out of scope

The following are not security issues for this repo, even if reported:

- Issues caused by third-party services (xAI, Anthropic, OpenAI, Pump.fun, PumpPortal, Solana RPC providers) themselves.
- Rate-limit behavior of public RPC endpoints — use a paid RPC for production.
- User-supplied logo / metadata that violates platform policies — that's a moderation issue.
- Phishing or social-engineering against users — please report to the relevant platform.

## Compliance notes (not security per se)

If you find UI copy that:

- claims a guaranteed profit or guaranteed listing,
- claims an official partnership with xAI / X / Grok / Pump.fun / Solana,
- promises to move user funds without explicit signature,

please open a normal GitHub issue tagged `compliance`. These are taken seriously and patched quickly.
