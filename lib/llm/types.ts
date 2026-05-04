// Shared LLM types used by every KOKi agent module.
// Provider-agnostic so we can swap backends without touching agent code.

export type Role = "system" | "user" | "assistant";

export interface Msg {
  role: Role;
  content: string;
}

export type Provider = "xai" | "anthropic" | "openai" | "mock";

export interface LLMRequest {
  messages: Msg[];
  /** When "json", we add response_format hints where supported and trim fences. */
  responseFormat?: "json" | "text";
  maxTokens?: number;
  temperature?: number;
  /** Optional override of the provider's default model. */
  model?: string;
  /** Feature label for Supabase usage tracking (e.g. "generate-launch-kit"). */
  feature?: string;
  /** Optional caller wallet pubkey for per-user usage tracking. */
  walletPubkey?: string;
  /**
   * xAI-only: enable Grok Live Search (X / web / news).
   * - "x"   → Grok searches X for trending posts and may cite tweet URLs
   * - "web" → general web search
   * - "auto" → model decides whether to search
   * Other providers ignore this field.
   */
  liveSearch?: {
    mode?: "auto" | "on" | "off";
    sources?: Array<"x" | "web" | "news" | "rss">;
    maxResults?: number;
  };
}

export interface LLMResponse {
  content: string;
  provider: Provider;
  model: string;
  usage?: {
    input: number;
    output: number;
  };
  /** xAI Live Search citations — list of source URLs the model used. */
  citations?: string[];
}

/** Used by the API to communicate provider info back to the client UI. */
export interface ProviderMeta {
  provider: Provider;
  model: string;
  usage?: { input: number; output: number };
}
