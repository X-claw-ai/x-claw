// Shared shapes for the Pons launch wizard.
//
// The wizard is a state machine with 5 steps. Each step's data is
// stored on the top-level `WizardState` so any step can render the
// full context and back-navigation restores the previous inputs.

export type WizardStep = "concept" | "kit" | "connect" | "sign" | "success";

export interface ConceptInput {
  idea: string;
  tokenName: string;
  ticker: string;
  sourceUrl?: string;
  autoPilot?: boolean;
  /** Manual lane: user-picked logo as a data URL (hosted at sign time). */
  logoDataUrl?: string;
  /** Manual lane socials — stored on-chain with the token. */
  twitter?: string;
  telegram?: string;
  website?: string;
}

/** Minimal shape from /api/generate-launch-kit. We keep this local so
 *  a change to the API type doesn't ripple through every wizard step. */
export interface LaunchKit {
  tokenName: string;
  ticker: string;
  shortDescription: string;
  longDescription?: string;
  logoUrl?: string;
  provider?: string;
  model?: string;
  mock?: boolean;
  socials?: {
    twitter?: string;
    telegram?: string;
    discord?: string;
    website?: string;
    farcaster?: string;
  };
  launchTweets?: string[];
  raidReplies?: string[];
  extras?: Record<string, unknown>;
}

export interface LaunchResult {
  token: `0x${string}`;
  pool: `0x${string}`;
  txHash: `0x${string}`;
  ponsUrl: string;
  explorerUrl: string;
}

/** Which stage of the Auto-pilot pipeline is currently running. Drives
 *  the staged progress UI on the concept step: "scanning" the instant
 *  the user clicks, "drafting" once the viral post is locked and the
 *  kit copywriter is running. */
export type AutoPhase = "scanning" | "drafting" | null;

export interface WizardState {
  step: WizardStep;
  concept: ConceptInput | null;
  kit: LaunchKit | null;
  /** Optional creator first-buy in ETH ("" == none). */
  initialBuyEth: string;
  result: LaunchResult | null;
  error: string | null;
  loading: boolean;
  autoPhase: AutoPhase;
}

export const INITIAL_WIZARD_STATE: WizardState = {
  step: "concept",
  concept: null,
  kit: null,
  initialBuyEth: "",
  result: null,
  error: null,
  loading: false,
  autoPhase: null,
};
