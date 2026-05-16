"use client";

import { useState } from "react";
import {
  Twitter,
  Loader2,
  AlertCircle,
  Copy,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

interface ApiResponse {
  ok: boolean;
  provider?: string;
  model?: string;
  posts?: string[];
  thread?: {
    hook: string;
    body: string[];
    conclusion: string;
  } | null;
  fallbackReason?: string;
  note?: string;
  error?: string;
}

const TONES = [
  { v: "engaging", label: "Engaging" },
  { v: "analytical", label: "Analytical" },
  { v: "playful", label: "Playful" },
  { v: "promotional", label: "Promotional (grounded)" },
] as const;

export default function XPostGeneratorAgent({
  defaultTopic,
  defaultAudience,
}: {
  defaultTopic?: string;
  defaultAudience?: string;
} = {}) {
  const [topic, setTopic] = useState(defaultTopic ?? "");
  const [tone, setTone] = useState<(typeof TONES)[number]["v"]>("engaging");
  const [audience, setAudience] = useState(defaultAudience ?? "");
  const [count, setCount] = useState(5);
  const [hashtags, setHashtags] = useState("");
  const [includeThread, setIncludeThread] = useState(true);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (!topic.trim()) return;
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch("/api/x-post-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          tone,
          audience: audience || undefined,
          count,
          hashtags: hashtags || undefined,
          includeThread,
        }),
      });
      const json: ApiResponse = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error || `HTTP ${res.status}`);
      } else {
        setData(json);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 space-y-6">
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Twitter className="h-5 w-5 text-koki-500" />
          <h2 className="text-lg font-semibold">X Post Generator</h2>
          <Badge tone="live">Live · Creator Agents</Badge>
        </div>
        <p className="text-sm text-ink-300/72 max-w-2xl">
          Turn a topic into ready-to-post X content. Drafts only — no
          auto-posting; you confirm and click "Open in X" to compose.
        </p>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Topic" hint="What do you want to post about?" className="sm:col-span-2">
            <Textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Why on-chain agents need a Grok-native OS"
            />
          </Field>
          <Field label="Tone">
            <Select value={tone} onChange={(e) => setTone(e.target.value as (typeof TONES)[number]["v"])}>
              {TONES.map((t) => (
                <option key={t.v} value={t.v}>
                  {t.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Audience" hint="Who you're writing for">
            <Input
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              placeholder="X-native crypto and AI builders"
            />
          </Field>
          <Field label="Number of standalone posts" hint="1–10">
            <Input
              type="number"
              min={1}
              max={10}
              value={count}
              onChange={(e) => setCount(Number(e.target.value) || 5)}
            />
          </Field>
          <Field label="Hashtags / keywords (optional)">
            <Input
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
              placeholder="#solana #grok"
            />
          </Field>
          <Field label="Include thread" className="sm:col-span-2">
            <label className="inline-flex items-center gap-2 text-sm text-ink-300">
              <input
                type="checkbox"
                checked={includeThread}
                onChange={(e) => setIncludeThread(e.target.checked)}
                className="accent-koki-500"
              />
              Generate a 5–8 part thread (hook → body → conclusion)
            </label>
          </Field>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-3 pt-2">
          <p className="text-xs text-ink-300/65">
            Off-chain safety: agent recommends. User confirms. Workflow
            executes (when you click "Open in X").
          </p>
          <Button onClick={run} disabled={loading || !topic.trim()}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Generate
              </>
            )}
          </Button>
        </div>

        {error && (
          <div className="card p-3 text-xs text-red-300 border-red-500/30 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <div className="font-semibold">Generation failed</div>
              <div className="mt-1 text-red-200/80">{error}</div>
            </div>
          </div>
        )}

        {data && (data.note || data.fallbackReason) && (
          <div className="card p-3 text-xs text-amber-200 border-amber-300/30">
            {data.note || `Fallback: ${data.fallbackReason}`}
          </div>
        )}
      </div>

      {data && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge tone={data.provider === "xai" ? "live" : "neutral"}>
              {providerLabel(data.provider)}
              {data.model ? ` · ${data.model}` : ""}
            </Badge>
            <span className="text-xs text-ink-300/65">
              {data.posts?.length ?? 0} posts
              {data.thread ? " · 1 thread" : ""}
            </span>
          </div>

          {data.posts && data.posts.length > 0 && (
            <div className="grid md:grid-cols-2 gap-3">
              {data.posts.map((p, i) => (
                <PostCard key={i} index={i + 1} text={p} />
              ))}
            </div>
          )}

          {data.thread && (
            <div className="card p-5 space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Sparkles className="h-4 w-4 text-koki-500" />
                Thread
              </div>
              <ThreadTweet label="Hook · 1" text={data.thread.hook} />
              {data.thread.body.map((b, i) => (
                <ThreadTweet
                  key={i}
                  label={`Body · ${i + 2}`}
                  text={b}
                />
              ))}
              <ThreadTweet
                label={`Conclusion · ${(data.thread.body.length || 0) + 2}`}
                text={data.thread.conclusion}
              />
              <div className="pt-2">
                <a
                  href={`https://x.com/intent/tweet?text=${encodeURIComponent(
                    [
                      data.thread.hook,
                      ...data.thread.body,
                      data.thread.conclusion,
                    ].join("\n\n")
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-primary !py-2 !px-3.5 !text-xs"
                >
                  Open whole thread in X compose
                  <ExternalLink className="h-3 w-3" />
                </a>
                <span className="ml-3 text-[10px] text-ink-300/65">
                  X compose only takes one tweet at a time — paste the rest
                  manually as replies.
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PostCard({ index, text }: { index: number; text: string }) {
  function copy() {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
  }
  const intent = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`;
  const overLimit = text.length > 280;
  return (
    <div className="card p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-widest text-ink-300/65">
          Post {index} · {text.length}/280
        </div>
        <div className="flex gap-2">
          <button
            onClick={copy}
            className="inline-flex items-center gap-1 text-xs text-ink-300/72 hover:text-ink-300"
          >
            <Copy className="h-3 w-3" /> Copy
          </button>
          <a
            href={intent}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-ink-300 hover:underline"
          >
            Open in X <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
      <pre className="text-sm whitespace-pre-wrap text-ink-300 font-sans leading-relaxed">
        {text}
      </pre>
      {overLimit && (
        <div className="text-[10px] text-amber-300">
          Over 280 chars — trim before posting.
        </div>
      )}
    </div>
  );
}

function ThreadTweet({ label, text }: { label: string; text: string }) {
  function copy() {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
  }
  return (
    <div className="border border-[var(--border-strong)]/20 rounded-md p-3 space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-widest text-ink-300/65">
          {label} · {text.length}/280
        </div>
        <button
          onClick={copy}
          className="inline-flex items-center gap-1 text-xs text-ink-300/72 hover:text-ink-300"
        >
          <Copy className="h-3 w-3" /> Copy
        </button>
      </div>
      <pre className="text-sm whitespace-pre-wrap text-ink-300 font-sans leading-relaxed">
        {text}
      </pre>
    </div>
  );
}

function providerLabel(p: string | undefined): string {
  switch (p) {
    case "xai":
      return "Generated by Grok";
    case "anthropic":
      return "Generated by Claude (fallback)";
    case "openai":
      return "Generated by OpenAI (fallback)";
    default:
      return "Generated by mock — set XAI_API_KEY";
  }
}
