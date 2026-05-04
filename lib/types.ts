// Shared TypeScript types for X CLAW.

export type Chain = "solana" | "base" | "ethereum";

export type LaunchStyle =
  | "stealth"
  | "fair-launch"
  | "hype-raid"
  | "community-led";

export type AgentStatus = "live" | "coming-soon";

export interface ConceptInput {
  idea: string;
  tokenName: string;
  ticker: string;
  chain: Chain;
  theme: string;
  audience: string;
  launchStyle: LaunchStyle;
  websiteUrl: string;
  twitterUrl: string;
  telegramUrl: string;
  logoDataUrl?: string | null;
}

export interface FaqItem {
  q: string;
  a: string;
}

export interface LaunchKit {
  // ── Token identity ─────────────────────────────────────────────────
  tokenName: string;
  ticker: string;
  shortDescription: string;
  longDescription: string;
  memeThesis: string;        // why the meme works as a coin
  tagline: string;           // single-line punch
  mascotConcept: string;
  imagePrompt: string;       // image-gen prompt for the logo

  // ── Pump.fun metadata ──────────────────────────────────────────────
  pumpMetadata: {
    name: string;
    symbol: string;
    description: string;
    twitter: string;
    telegram: string;
    website: string;
    image: string;
  };

  // ── X marketing content ────────────────────────────────────────────
  xBio: string;
  launchTweets: string[];                   // 10
  viralHooks: string[];                     // 5
  threadIdeas: string[];                    // 5
  raidReplies: string[];                    // 20
  influencerDmTemplates: string[];          // 5
  founderAnnouncement: string;
  productAnnouncement: string;

  // ── Community content ──────────────────────────────────────────────
  telegramAnnouncement: string;
  discordAnnouncement: string;
  communityOnboarding: string;
  raidMission: string;
  faq: FaqItem[];                           // 5-7 Q/A

  // ── Discovery copy ─────────────────────────────────────────────────
  dexscreenerCopy: string;
  cmcDescription: string;

  // ── Plan + checklist ───────────────────────────────────────────────
  sevenDayPlan: { day: number; title: string; bullets: string[] }[];
  dailyChecklist: string[];
}

export interface AgentTemplate {
  slug: string;
  name: string;
  description: string;
  status: AgentStatus;
  icon: string; // lucide icon name
  ctaLabel: string;
  href: string;
}

export interface LaunchRecord {
  id: string;
  tokenName: string;
  ticker: string;
  chain: Chain;
  status: "draft" | "pending-signature" | "launched" | "failed";
  createdAt: string;
  txSignature?: string;
  pumpUrl?: string;
  mock: boolean;
}
