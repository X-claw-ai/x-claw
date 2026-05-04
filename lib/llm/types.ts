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
}

export interface LLMResponse {
  content: string;
  provider: Provider;
  model: string;
  usage?: {
    input: number;
    output: number;
  };
}

/** Used by the API to communicate provider info back to the client UI. */
export interface ProviderMeta {
  provider: Provider;
  model: string;
  usage?: { input: number; output: number };
}
