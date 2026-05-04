// LEGACY STUB
//
// X CLAW used to be framed as a multi-vertical Agent OS. We retired that
// framing in favor of a single, focused product:
//
//   X CLAW = the Grok-native AI agent that launches your memecoin on Pump.fun.
//
// This file is kept as an empty stub so any lingering imports keep compiling.
// New code should not import from here.

export const AGENT_TEMPLATES: never[] = [];
export const AGENT_VERTICALS: never[] = [];
export const EXPANSION_AGENTS: never[] = [];
export const PHASE_META = {} as Record<string, { label: string; eyebrow: string; tag: string }>;
export const VERTICAL_STATUS_META = {} as Record<string, { label: string; tone: "live" | "soon" | "neutral" }>;
export const EXPANSION_META = { eyebrow: "", title: "", body: "" };

export type OnchainPhase = "launch" | "monitor" | "market" | "execute";
export type AgentPhase = OnchainPhase;
export type CatalogTemplate = never;
export type ExpansionAgent = never;
export type AgentVertical = never;
export type VerticalId = never;
export type VerticalStatus = never;
export type ExpansionCategory = never;
