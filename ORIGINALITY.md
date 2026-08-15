# Originality & Authenticity — HAMR

> HAMR is the **original** autonomous Grok-native memecoin launch agent.
> This document anchors that claim with cryptographically verifiable proofs.

## Public proofs

| What | Where | Date |
|---|---|---|
| First public commit | [`ae5ff49`](https://github.com/koki-ai-agent/Koki/commit/ae5ff49) — *"Initial commit: X CLAW — The Grok-native Meme Coin Launch Agent"* | **2026-05-04** |
| Public GitHub repository | [koki-ai-agent/Koki](https://github.com/koki-ai-agent/Koki) — MIT licensed | 2026-05-04 |
| First stable release tag | `v1.0.0` — *"First public stable release — HAMR"* | 2026-05-18 |
| Live deployment | [hamr.fun](https://hamr.fun) — Vercel production | 2026-05 |
| Official X account | [@officialkokiai](https://x.com/officialkokiai) | — |
| Solana onchain launches | HAMR-built tokens on Pump.fun (Solana mainnet) | continuous |

## What "Originality" means here

Originality is not a marketing claim. It is **a verifiable hash chain** rooted in:

1. **Git commit timestamps** — Every commit in [the public history](https://github.com/koki-ai-agent/Koki/commits/main) is signed with an author date the server records and exposes via the GitHub API. These dates cannot be backdated for an existing public repository.
2. **GitHub Arctic Code Vault** — Snapshots of active public repositories are periodically archived in a long-term physical storage facility, providing extreme long-term proof of existence.
3. **Internet Archive / Common Crawl** — Independent crawls of public GitHub repositories provide third-party timestamps of the repository's existence.
4. **OpenTimestamps (Bitcoin)** — This file (`ORIGINALITY.md`) is stamped with [OpenTimestamps](https://opentimestamps.org/), anchoring its SHA-256 hash to the Bitcoin blockchain. The corresponding proof file is committed to this repository as `ORIGINALITY.md.ots`. Once Bitcoin has confirmed the anchor block, anyone can run `ots verify ORIGINALITY.md.ots` and prove this exact text existed at this exact time, regardless of what happens to GitHub.
5. **Onchain Solana transactions** — Every token launched by the HAMR agent is permanently recorded on Solana mainnet with a public mint address, signature, and slot, providing independent timestamps of the agent's operational history.

## How to verify

```bash
# 1. The first public commit and its date
git log ae5ff49 -1 --pretty=fuller

# 2. The full immutable history
git log --reverse --pretty='%h %ad  %s' --date=iso

# 3. Verify the OpenTimestamps proof for this file
#    (install: pip install opentimestamps-client)
ots verify ORIGINALITY.md.ots

# 4. Verify the release tag signature and date
git show v1.0.0
```

## If you encounter a project that looks like HAMR

Check the **first commit date** of the suspected copy. Any autonomous
Grok × Pump.fun launch agent whose first public commit, repository
creation date, or live deployment is **after 2026-05-04** is downstream
of this codebase, regardless of how it is marketed or named.

Forks are welcome under the MIT license — the only thing forks may not
do is misrepresent themselves as the original.

---

HAMR · [hamr.fun](https://hamr.fun) · [@officialkokiai](https://x.com/officialkokiai) · MIT
