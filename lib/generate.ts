import type { ConceptInput, LaunchKit } from "./types";

// Mock launch-kit generator. Deterministic by design — used as a
// last-resort fallback when no LLM provider is configured. Real launch
// kits come from /api/generate-launch-kit hitting Grok via the LLM router.
export function generateMockLaunchKit(input: ConceptInput): LaunchKit {
  const name = input.tokenName || "KOKi";
  const ticker = (input.ticker || "KOKI")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6);
  const theme = input.theme || "shiba paw / KOKi mascot";
  const audience = input.audience || "X-native crypto builders";

  const shortDescription = `${name} is a ${theme} community token built for ${audience}.`;
  const longDescription = [
    `${name} (${ticker}) is an X-native community token prepared with the KOKi Pump Launch Agent.`,
    `The project narrative leans on the ${theme} concept and is positioned for ${audience}.`,
    `All launch materials in this kit are drafts — final wording, art, and timing are decided by the project owner.`,
  ].join(" ");

  const memeThesis = `${name} works because it lands at the intersection of ${theme} and the audience's existing X-native attention loop. The ticker is short, memorable, and chain-friendly.`;
  const tagline = `${name} — ${theme}, on-chain.`;
  const imagePrompt = `Square logo for a Solana memecoin "${name}" ($${ticker}). Theme: ${theme}. Style: neon-on-dark, vector clean lines, X-native aesthetic, no text.`;

  const launchTweets = Array.from({ length: 10 }, (_, i) => {
    const lines = [
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
    return lines[i];
  });

  const viralHooks = [
    `Most launchpads are forms. ${ticker} is an agent.`,
    `${name} reads X. Then writes the launch. You sign once.`,
    `If your meme isn't on X, it isn't a meme. ${ticker} starts there.`,
    `Detect → Analyze → Generate → Launch → Monitor. ${ticker} closes the loop.`,
    `Real-time meme radar → Pump.fun launch in one signature. That's ${ticker}.`,
  ];

  const threadIdeas = [
    `Why memecoins launch wrong, and what an agent should actually do for you.`,
    `Anatomy of a 24-hour launch window: Detect → Analyze → Generate → Launch → Monitor.`,
    `A field guide to ${theme}, and why it sticks on X right now.`,
    `Five risks every memecoin launcher ignores, with concrete checks.`,
    `Inside the ${name} launch: what we built, what we cut, what's next.`,
  ];

  const raidReplies = Array.from({ length: 20 }, (_, i) => {
    const variants = [
      `${ticker} community here — checking out your post.`,
      `The ${name} workflow could help on this.`,
      `Builders running ${ticker} on the KOKi agent layer.`,
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

  const founderAnnouncement = [
    `Today I'm announcing ${name} ($${ticker}) — an X-native community token.`,
    `Why ${name}: ${memeThesis}`,
    `The launch kit, the metadata, and every line of copy were prepared by the KOKi agent and reviewed by our team. No silent automation, no surprise transactions.`,
    `Read the thesis, audit the on-chain footprint, decide for yourself.`,
  ].join("\n\n");

  const productAnnouncement = [
    `${name} is now live on Pump.fun.`,
    `Ticker: $${ticker}`,
    `Concept: ${shortDescription}`,
    `Where to verify: Pump.fun, Solscan, the KOKi launch monitor.`,
    `Where to find us: X, Telegram, Discord (links pinned).`,
  ].join("\n");

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

  const discordAnnouncement = [
    `**${name} ($${ticker}) — heads-up for the build channel.**`,
    ``,
    `We're preparing the launch with the KOKi agent. Status:`,
    `- Concept locked`,
    `- Launch kit drafted`,
    `- Pump.fun metadata staged`,
    `- Wallet signature pending`,
    ``,
    `Drop questions in the thread. Raid mission goes live at launch.`,
  ].join("\n");

  const communityOnboarding = [
    `Welcome to the ${name} community.`,
    ``,
    `What we're building: ${shortDescription}`,
    ``,
    `Three things to do first:`,
    `1. Read the thesis (pinned).`,
    `2. Verify the contract on Solscan.`,
    `3. Pick a raid mission and ship one post.`,
  ].join("\n");

  const raidMission = [
    `Raid mission · ${name}`,
    ``,
    `Goal: amplify the launch in the first 30 minutes.`,
    `Targets: 5 X posts, 10 thoughtful replies, 1 thread quote-RT.`,
    `Tone: builder-honest, no spam, no guarantees.`,
    `Reward: pinned shoutout for top raiders.`,
  ].join("\n");

  const faq = [
    {
      q: `What is ${name}?`,
      a: `${shortDescription} The launch was prepared by the KOKi agent and approved by the team.`,
    },
    {
      q: `Why $${ticker}?`,
      a: `Short, memorable, chain-friendly. Aligned with the ${theme} narrative.`,
    },
    {
      q: `Is this audited?`,
      a: `It's a Pump.fun bonding-curve launch — there's no separate contract to audit. Verify the mint on Solscan.`,
    },
    {
      q: `Are devs holding?`,
      a: `Optional initial dev buy is set per launch and disclosed in the launch transaction.`,
    },
    {
      q: `How do I help?`,
      a: `Pick a raid mission, post honestly, and surface real holders' takes.`,
    },
  ];

  const dexscreenerCopy = `${name} (${ticker}) — ${shortDescription} Links: ${
    input.websiteUrl || "—"
  } · ${input.twitterUrl || "—"} · ${input.telegramUrl || "—"}.`;

  const cmcDescription = [
    `${name} (${ticker}) is a community-driven token launched via the KOKi Pump Launch Agent.`,
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
      bullets: ["Long-form post on the why", "Open AMA in Telegram", "Publish Dexscreener copy"],
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
    "Check holder concentration once at end of day",
  ];

  return {
    tokenName: name,
    ticker,
    shortDescription,
    longDescription,
    memeThesis,
    tagline,
    mascotConcept: `A ${theme} mascot: confident, X-native, neon-on-dark, looks at home next to a Grok avatar.`,
    imagePrompt,
    pumpMetadata: {
      name,
      symbol: ticker,
      description: shortDescription,
      twitter: input.twitterUrl,
      telegram: input.telegramUrl,
      website: input.websiteUrl,
      image: input.logoDataUrl ?? "",
    },
    xBio: `${name} · ${ticker} — ${theme}. X-native launch via KOKi. Not financial advice.`,
    launchTweets,
    viralHooks,
    threadIdeas,
    raidReplies,
    influencerDmTemplates,
    founderAnnouncement,
    productAnnouncement,
    telegramAnnouncement,
    discordAnnouncement,
    communityOnboarding,
    raidMission,
    faq,
    dexscreenerCopy,
    cmcDescription,
    sevenDayPlan,
    dailyChecklist,
  };
}
