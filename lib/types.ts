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

export interface LaunchKit {
  tokenName: string;
  ticker: string;
  shortDescription: string;
  longDescription: string;
  mascotConcept: string;
  pumpMetadata: {
    name: string;
    symbol: string;
    description: string;
    twitter: string;
    telegram: string;
    website: string;
    image: string;
  };
  xBio: string;
  launchTweets: string[];
  raidReplies: string[];
  influencerDmTemplates: string[];
  telegramAnnouncement: string;
  dexscreenerCopy: string;
  cmcDescription: string;
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
