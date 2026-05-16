import { NextResponse } from "next/server";
import { callLLM, getActiveProvider, LLMRouterError } from "@/lib/llm/router";
import { buildXPostMessages, type XPostRequest } from "@/lib/llm/promptXPosts";

// ─────────────────────────────────────────────────────────────────────────
// POST /api/x-post-generator
//
// Generates ready-to-post X content (tweets + optional thread) via the
// KOKi LLM router (Grok primary). Falls back to a clearly-labeled local
// stub when no provider is configured.
// ─────────────────────────────────────────────────────────────────────────

export const runtime = "nodejs";

interface ResponseShape {
  posts: string[];
  thread:
    | { hook: string; body: string[]; conclusion: string }
    | null;
}

export async function POST(req: Request) {
  let body: Partial<XPostRequest> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }
  if (!body.topic || String(body.topic).trim() === "") {
    return NextResponse.json(
      { ok: false, error: "topic is required" },
      { status: 400 }
    );
  }

  const request: XPostRequest = {
    topic: body.topic,
    tone: (body.tone as XPostRequest["tone"]) || "engaging",
    audience: body.audience,
    count: body.count,
    hashtags: body.hashtags,
    includeThread: body.includeThread !== false,
  };

  const provider = getActiveProvider();

  // No provider → return a clearly-labeled local stub so the UI flow stays alive.
  if (!provider) {
    return NextResponse.json({
      ok: true,
      provider: "mock",
      model: "koki-stub",
      ...localStub(request),
      note:
        "No LLM provider configured. Set XAI_API_KEY for real Grok output.",
    });
  }

  try {
    const llm = await callLLM({
      messages: buildXPostMessages(request),
      responseFormat: "json",
      temperature: 0.8,
      maxTokens: 2000,
      model: "fast", // X posts are quick generations, use grok-4-fast-reasoning
    });
    const parsed = parseResponse(llm.content);
    return NextResponse.json({
      ok: true,
      provider: llm.provider,
      model: llm.model,
      usage: llm.usage,
      ...parsed,
    });
  } catch (err) {
    const reason =
      err instanceof LLMRouterError
        ? err.message
        : err instanceof Error
        ? err.message
        : String(err);
    return NextResponse.json({
      ok: true,
      provider: "mock",
      model: "koki-stub",
      fallbackReason: reason,
      ...localStub(request),
    });
  }
}

function parseResponse(raw: string): ResponseShape {
  let txt = raw.trim();
  if (txt.startsWith("```")) {
    txt = txt.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
  }
  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(txt);
  } catch {
    return { posts: [raw.slice(0, 270)], thread: null };
  }
  const posts = Array.isArray(obj.posts)
    ? (obj.posts as unknown[]).map((p) => String(p ?? "")).filter(Boolean)
    : [];
  let thread: ResponseShape["thread"] = null;
  if (obj.thread && typeof obj.thread === "object" && !Array.isArray(obj.thread)) {
    const t = obj.thread as Record<string, unknown>;
    thread = {
      hook: String(t.hook ?? ""),
      body: Array.isArray(t.body)
        ? (t.body as unknown[]).map((b) => String(b ?? "")).filter(Boolean)
        : [],
      conclusion: String(t.conclusion ?? ""),
    };
  }
  return { posts, thread };
}

function localStub(req: XPostRequest): ResponseShape {
  const t = req.topic;
  return {
    posts: [
      `${t}, short take from an X native builder. (Set XAI_API_KEY to get a real draft.)`,
      `On ${t}: ship the workflow first, the discourse second.`,
      `If ${t} matters to you, it deserves more than a hot take. Build something.`,
      `${t} thread incoming once Grok is wired up. For now, this is a stub.`,
      `Builders > spectators. ${t} is no exception.`,
    ],
    thread: {
      hook: `A short builder thread on ${t}, auto-generated stub until XAI_API_KEY is set.`,
      body: [
        `Why ${t} matters: it's a workflow, not a vibe.`,
        `What KOKi does about it: agents prepare, you confirm, workflows execute.`,
      ],
      conclusion: `Once Grok is wired into /api/x-post-generator, this thread becomes real.`,
    },
  };
}
