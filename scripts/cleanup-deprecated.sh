#!/usr/bin/env bash
# X CLAW — remove deprecated multi-vertical files after the
# single-product memecoin launch agent rewrite.
#
# Run from the repo root:
#   bash scripts/cleanup-deprecated.sh
#
# This is idempotent: missing files are skipped.

set -e

cd "$(dirname "$0")/.."

DEAD=(
  # Dead landing sections (replaced by Hero · Engines · Safety · FinalCTA)
  components/landing/ProblemSection.tsx
  components/landing/ProductSection.tsx
  components/landing/ExpansionSection.tsx
  components/landing/RoadmapSection.tsx
  components/landing/AgentVerticalsSection.tsx
  components/landing/VisionSection.tsx
  components/landing/FirstLiveModuleSection.tsx
  components/landing/HowItWorksSection.tsx
  components/landing/WhatYouGetSection.tsx
  components/landing/WaitlistSection.tsx
  components/landing/WorkflowSection.tsx

  # Dead /agents/* pages (now redirects in next.config.mjs)
  app/agents/page.tsx
  app/agents/pump-launch/page.tsx
  app/agents/wallet-tracking/page.tsx
  app/agents/x-post-generator/page.tsx

  # Dead billing page (redirected)
  app/billing/page.tsx

  # Dead AgentCard (no longer used)
  components/agents/AgentCard.tsx

  # Dead mock API routes (real ones are in use)
  app/api/agent-templates/route.ts
  app/api/launch-history/route.ts
  app/api/wallet-session/route.ts
  app/api/x-research/route.ts
)

for f in "${DEAD[@]}"; do
  if [ -f "$f" ]; then
    echo "rm  $f"
    rm "$f"
  fi
done

# Drop empty parent directories
for d in app/agents/pump-launch app/agents/wallet-tracking app/agents/x-post-generator app/agents app/billing components/agents app/api/agent-templates app/api/launch-history app/api/wallet-session app/api/x-research; do
  if [ -d "$d" ] && [ -z "$(ls -A "$d")" ]; then
    echo "rmdir  $d"
    rmdir "$d"
  fi
done

# Also drop the now-empty stub of agentTemplates.ts if nothing imports it
# (kept by default for safety; uncomment to force-remove)
# rm -f lib/agentTemplates.ts

echo "Done. Review with: git status"
