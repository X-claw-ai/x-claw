import type { ConceptInput, LaunchKit } from "./types";

// Mock launch-kit generator.
// This stays deterministic for the MVP so the UI feels real.
// Replace this with a call to /api/generate-launch-kit (xAI/Grok) when ready.
export function generateMockLaunchKit(input: ConceptInput): LaunchKit {
  const name = input.tokenName || "ClawCoin";
  const ticker = (input.ticker || "CLAW").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
  const theme = input.theme || "cyber-claw mascot";
  const audience = input.audience || "X-native crypto builders";

  const shortDescription = `${name} is a ${theme} community token built for ${audience}.`;
  const longDescription = [
    `${name} (${ticker}) is an X-native community token prepared with the X CLAW Pump Launch Agent.`,
    `The project narrative leans on the ${theme} concept and is positioned for ${audience}.`,
    `All launch materials in this kit are drafts — final wording, art, and timing are decided by the project owner.`,
  ].join(" ");

  const launchTweets = [
    `${ticker} is being prepared for launch. ${shortDescription} Built X-native, end to end.`,
    `Why ${name}? Because ${audience} deserve tools, not noise. ${ticker} brings the workflow.`,
    `Three reasons to watch ${ticker}: 1/ ${theme} 2/ X-native distribution 3/ user-approved launch flow.`,
    `${name} is wiring up. Concept locked, copy drafted, launch checklist in motion.`,
    `${ticker} core idea: ${input.idea || "ship token launches without 12 disconnected tools"}.`,
    `The ${name} agent prepared this thread. The team approved it. That's how it should work.`,
    `If you've ever wasted an evening copying messages between X, TG, and a launchpad, ${ticker} is for you.`,
    `${name} is building the agent layer between Grok and the launch surface. That's the bet.`,
    `${ticker} is not financial advice. Read everything. Decide for yourself. Protect your wallet.`,
    `${name} launch kit is ready for review. Sign and launch only when you're confident.`,
  ];

  const raidReplies = Array.from({ length: 20 }, (_, i) => {
    const variants = [
      `${ticker} community here — checking out your post.`,
      `The ${name} workflow could help on this.`,
      `Builders running ${ticker} on the X CLAW agent layer.`,
      `Respect the build. ${name} is on a similar path.`,
      `${ticker} dropped its launch kit — review-first, no surprises.`,
    ];
    return `${variants[i % variants.length]} (${i + 1}/20)`;
  });

  const influencerDmTemplates = [
    `Hey {name}, ${name} is launching on ${input.chain}. We prepared a 1-pager and would love your honest read — no ask attached.`,
    `Hi {name}, big fan of your work on {topic}. ${ticker} is a community token tied to ${theme}. Open to a quick look?`,
    `{name} — sharing an early look at ${name} (${ticker}). Built with an X-native workflow. Feedback welcome, no obligation.`,
    `Hey {name}, our team built ${ticker} for ${audience}. If it resonates, happy to share the launch kit privately.`,
    `Hi {name}, this is a no-pressure intro to ${name}. We respect your bar; want to make sure the brief is worth your time.`,
  ];

  const telegramAnnouncement = [
    `📣 ${name} (${ticker}) — launch kit is ready for review.`,
    ``,
    `• Concept: ${input.idea || "X-native community token"}`,
    `• Theme: ${theme}`,
    `• Audience: ${audience}`,
    `• Chain: ${input.chain}`,
    ``,
    `Next steps: review metadata → connect wallet → sign → launch.`,
    `Nothing executes without the team's signature.`,
  ].join("\n");

  const dexscreenerCopy = `${name} (${ticker}) — ${shortDescription} Links: ${
    input.websiteUrl || "—"
  } · ${input.twitterUrl || "—"} · ${input.telegramUrl || "—"}.`;

  const cmcDescription = [
    `${name} (${ticker}) is a community-driven token launched via the X CLAW Pump Launch Agent.`,
    `It is positioned around the ${theme} concept and targets ${audience}.`,
    `${name} uses an explicit, user-approved launch flow: the agent prepares materials, the team reviews, the wallet signs, and only then does the launch execute.`,
  ].join(" ");

  const sevenDayPlan = [
    {
      day: 1,
      title: "Soft introduction",
      bullets: [
        `Publish ${ticker} bio + pinned tweet`,
        "Open Telegram and seed FAQ",
        "Share launch kit with core community",
      ],
    },
    {
      day: 2,
      title: "Narrative drops",
      bullets: [
        "Tweet 1–2 from launch kit",
        "Engage 10 relevant accounts thoughtfully",
        "Post short product clip",
      ],
    },
    {
      day: 3,
      title: "Builder day",
      bullets: [
        "Long-form post on the why",
        "Open AMA in Telegram",
        "Publish Dexscreener copy",
      ],
    },
    {
      day: 4,
      title: "Community widening",
      bullets: [
        "Share community-led raid prompts",
        "Tweet 3–4 from launch kit",
        "Outreach to 5 influencers using DM templates",
      ],
    },
    {
      day: 5,
      title: "Proof of work",
      bullets: [
        "Post a build update or roadmap progress",
        "Re-share top community posts",
        "Address top 3 community questions",
      ],
    },
    {
      day: 6,
      title: "Listings prep",
      bullets: [
        "Submit CMC/CG draft description",
        "Confirm links and metadata are accurate",
        "Tweet 5–6 from launch kit",
      ],
    },
    {
      day: 7,
      title: "Reflect & iterate",
      bullets: [
        "Post a recap thread",
        "Collect community feedback",
        "Plan week 2 with the team",
      ],
    },
  ];

  const dailyChecklist = [
    "Confirm wallet is the intended signer",
    "Re-read pinned tweet and TG announcement",
    "Pick 2 launch tweets for today",
    "Engage 10 accounts in audience honestly",
    "Reply to community questions within 4 hours",
    "Log any incidents or wording changes",
  ];

  return {
    tokenName: name,
    ticker,
    shortDescription,
    longDescription,
    mascotConcept: `A ${theme} mascot: confident, X-native, neon-on-dark, looks at home next to a Grok avatar.`,
    pumpMetadata: {
      name,
      symbol: ticker,
      description: shortDescription,
      twitter: input.twitterUrl,
      telegram: input.telegramUrl,
      website: input.websiteUrl,
      image: input.logoDataUrl ?? "",
    },
    xBio: `${name} · ${ticker} — ${theme}. X-native launch via X CLAW. Not financial advice.`,
    launchTweets,
    raidReplies,
    influencerDmTemplates,
    telegramAnnouncement,
    dexscreenerCopy,
    cmcDescription,
    sevenDayPlan,
    dailyChecklist,
  };
}
