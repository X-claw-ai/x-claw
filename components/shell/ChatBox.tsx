"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useAccount } from "wagmi";
import { MessageCircle, X, Send } from "lucide-react";

// Global trollbox — bottom-right floating panel on every page.
// No login: visitors get a sticky random clip-name; connected wallets
// chat as their short address. Open by default on desktop first visit
// (collapsed on mobile), and the user's open/closed choice is
// remembered.

interface ChatMsg {
  id: number;
  name: string;
  wallet: string | null;
  body: string;
  created_at: string;
}

const POLL_MS = 3_000;
const OPEN_KEY = "hamr-chat-open";
const NICK_KEY = "hamr-chat-nick";

function relTime(iso: string, now: number): string {
  const s = Math.max(0, Math.floor(now / 1000 - new Date(iso).getTime() / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function ChatBox() {
  const { address } = useAccount();
  const [open, setOpen] = useState<boolean | null>(null);
  const [nick, setNick] = useState("clip");
  const [messages, setMessages] = useState<ChatMsg[] | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const listRef = useRef<HTMLDivElement>(null);
  const stickBottom = useRef(true);

  // Initial open state: saved choice > desktop-open / mobile-collapsed.
  useEffect(() => {
    const saved = localStorage.getItem(OPEN_KEY);
    if (saved === "1") setOpen(true);
    else if (saved === "0") setOpen(false);
    else setOpen(window.innerWidth >= 768);

    let n = localStorage.getItem(NICK_KEY);
    if (!n) {
      n = `clip-${Math.floor(1000 + Math.random() * 9000)}`;
      localStorage.setItem(NICK_KEY, n);
    }
    setNick(n);
  }, []);

  const toggle = useCallback(() => {
    setOpen((v) => {
      const next = !v;
      localStorage.setItem(OPEN_KEY, next ? "1" : "0");
      return next;
    });
  }, []);

  // Poll messages while open.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    async function load() {
      try {
        const r = await fetch("/api/chat", { cache: "no-store" });
        const j = (await r.json()) as { ok?: boolean; messages?: ChatMsg[] };
        if (!cancelled && j.ok) setMessages(j.messages ?? []);
      } catch {
        /* next poll retries */
      }
    }
    void load();
    const id = setInterval(() => {
      void load();
      setNow(Date.now());
    }, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [open]);

  // Autoscroll only when the user is already at the bottom.
  useEffect(() => {
    const el = listRef.current;
    if (el && stickBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setError(null);
    try {
      const name = address
        ? `${address.slice(0, 6)}…${address.slice(-4)}`
        : nick;
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, wallet: address ?? undefined, body: text }),
      });
      const j = (await r.json()) as { ok?: boolean; error?: string };
      if (!j.ok) {
        setError(j.error ?? "Failed to send");
      } else {
        setDraft("");
        stickBottom.current = true;
        // Optimistic refresh.
        const rr = await fetch("/api/chat", { cache: "no-store" });
        const jj = (await rr.json()) as { ok?: boolean; messages?: ChatMsg[] };
        if (jj.ok) setMessages(jj.messages ?? []);
      }
    } catch {
      setError("Network error — try again.");
    } finally {
      setSending(false);
    }
  }

  // Avoid hydration flicker: render nothing until the open state loads.
  if (open === null) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2">
      {open && (
        <div className="w-[320px] max-w-[calc(100vw-2rem)] rounded-2xl border border-[var(--border-strong)] bg-bg-elevated/95 backdrop-blur-md shadow-elev-3 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 dot-pulse" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              <span className="text-[13px] font-black tracking-tight">
                Live chat
              </span>
              <span className="text-[10px] font-bold text-ink-300/45">
                everyone on hamr.fun
              </span>
            </div>
            <button
              type="button"
              onClick={toggle}
              aria-label="Close chat"
              className="inline-flex h-6 w-6 items-center justify-center rounded-md text-ink-300/60 hover:text-ink-300 hover:bg-ink-1000/10"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Messages */}
          <div
            ref={listRef}
            onScroll={(e) => {
              const el = e.currentTarget;
              stickBottom.current =
                el.scrollHeight - el.scrollTop - el.clientHeight < 40;
            }}
            className="h-[300px] max-h-[45vh] overflow-y-auto px-3 py-2 space-y-2"
          >
            {messages === null ? (
              <div className="space-y-2 pt-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-8 rounded-lg bg-ink-1000/5 animate-pulse" />
                ))}
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-[12px] font-semibold text-ink-300/45 text-center px-6">
                Nobody here yet — say gm.
              </div>
            ) : (
              messages.map((m) => (
                <div key={m.id} className="flex items-start gap-2">
                  <Image
                    src="/clip-avatar.png"
                    alt=""
                    width={20}
                    height={20}
                    className="rounded-full shrink-0 border border-[var(--border-strong)] mt-0.5"
                  />
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-1.5">
                      <span
                        className={`text-[11px] font-extrabold ${
                          m.wallet ? "text-koki-300" : "text-ink-300/70"
                        }`}
                      >
                        {m.name}
                      </span>
                      <span className="text-[9px] font-bold text-ink-300/35">
                        {relTime(m.created_at, now)}
                      </span>
                    </div>
                    <p className="text-[12.5px] font-medium text-ink-300/90 leading-snug break-words">
                      {m.body}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Composer */}
          <form
            onSubmit={send}
            className="border-t border-[var(--border)] p-2.5 space-y-1.5"
          >
            {error && (
              <div className="text-[10px] font-bold text-red-400 px-1">{error}</div>
            )}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={280}
                placeholder={`Chat as ${
                  address ? `${address.slice(0, 6)}…${address.slice(-4)}` : nick
                }`}
                className="!py-2 !px-3 !text-[12px] flex-1"
              />
              <button
                type="submit"
                disabled={sending || draft.trim().length === 0}
                aria-label="Send"
                className="btn btn-primary !p-2.5 disabled:opacity-40"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Bubble */}
      {!open && (
        <button
          type="button"
          onClick={toggle}
          aria-label="Open chat"
          className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-koki-500 text-white shadow-glow hover:bg-koki-600 transition-colors"
        >
          <MessageCircle className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
