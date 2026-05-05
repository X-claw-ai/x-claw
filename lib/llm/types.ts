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
   * xAI-only: enable the Agent Tools `x_search` built-in tool. Truthy value
   * attaches it to the request. The legacy mode/sources/maxResults fields
   * are kept for backwards compat but ignored — the new API doesn't expose
   * them. Use the explicit fields below for the supported sub-options.
   *
   * Reference: https://docs.x.ai/docs/guides/tools/x-search
   */
  liveSearch?: {
    /** Legacy fields — ignored by Agent Tools API but kept so call sites compile. */
    mode?: "auto" | "on" | "off";
    sources?: Array<"x" | "web" | "news" | "rss">;
    maxResults?: number;
    /** Restrict to specific X handles (max 10). Mutually exclusive with excludedXHandles. */
    allowedXHandles?: string[];
    /** Exclude these X handles (max 10). Mutually exclusive with allowedXHandles. */
    excludedXHandles?: string[];
    /** ISO8601 date string, e.g. "2025-10-01". */
    fromDate?: string;
    /** ISO8601 date string, e.g. "2025-10-10". */
    toDate?: string;
    /** Analyze images attached to X posts. */
    enableImageUnderstanding?: boolean;
    /** Analyze videos attached to X posts (X Search only, not Web Search). */
    enableVideoUnderstanding?: boolean;
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
  /**
   * Providers that were tried before this one succeeded (with their error
   * messages). Empty array when the primary provider worked. Useful for
   * surfacing "why did we fall back to OpenAI" in API debug responses.
   */
  previousAttempts?: { provider: Provider; error: string }[];
  /**
   * xAI-only: populated when the first call (with search_parameters) was
   * rejected and we silently retried without them. The original status +
   * error text tell us EXACTLY why Live Search isn't working — usually
   * "Live Search not enabled for your tier" or similar.
   */
  searchRejection?: { status: number; error: string };
}

/** Used by the API to communicate provider info back to the client UI. */
export interface ProviderMeta {
  provider: Provider;
  model: string;
  usage?: { input: number; output: number };
}
