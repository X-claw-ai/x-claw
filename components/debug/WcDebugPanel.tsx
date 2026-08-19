"use client";

import { useEffect, useRef, useState } from "react";
import { useAccount, useConnect } from "wagmi";

// Hidden diagnostics overlay for the mobile WalletConnect issue.
// Open https://hamr.fun/?wcdebug=1 — a small monospace panel appears
// showing live wagmi + WalletConnect internals, a DIRECT relay
// websocket probe (proves both network reachability and projectId
// validity), and a rolling event log of the WC provider lifecycle.
// Renders nothing without the flag.

interface WcProviderLike {
  session?: unknown;
  accounts?: string[];
  connected?: boolean;
  on?: (ev: string, cb: (...a: unknown[]) => void) => void;
  signer?: {
    client?: { core?: { relayer?: { connected?: boolean } } };
  };
}

const PID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "";

export default function WcDebugPanel() {
  const [on, setOn] = useState(false);
  const [lines, setLines] = useState<string[]>([]);
  const [events, setEvents] = useState<string[]>([]);
  const [wsResult, setWsResult] = useState("ws: testing…");
  const [note, setNote] = useState<string | null>(null);
  const hooked = useRef(false);
  const { status, address, connector } = useAccount();
  const { connectors, connectAsync } = useConnect();

  const logEvent = (s: string) =>
    setEvents((e) => [...e.slice(-5), `${new Date().toTimeString().slice(0, 8)} ${s}`]);

  useEffect(() => {
    try {
      const flagged =
        new URLSearchParams(window.location.search).has("wcdebug") ||
        localStorage.getItem("hamr-wcdebug") === "1";
      if (flagged) localStorage.setItem("hamr-wcdebug", "1");
      setOn(flagged);
    } catch {
      /* private mode */
    }
  }, []);

  // Direct relay probe — bypasses every WC library layer.
  useEffect(() => {
    if (!on) return;
    if (!PID) {
      setWsResult("ws: PROJECT ID MISSING IN BUNDLE");
      return;
    }
    try {
      const ws = new WebSocket(
        `wss://relay.walletconnect.com/?projectId=${PID}&version=2&auth=none`,
      );
      const t = setTimeout(() => {
        setWsResult((r) => (r.includes("testing") ? "ws: TIMEOUT (blocked?)" : r));
        ws.close();
      }, 8000);
      ws.onopen = () => {
        clearTimeout(t);
        setWsResult("ws: OPEN ✓ (relay reachable, projectId ok)");
        ws.close();
      };
      ws.onclose = (e) => {
        setWsResult((r) =>
          r.includes("OPEN") ? r : `ws: CLOSED code=${e.code} (3000=bad projectId/origin)`,
        );
      };
      ws.onerror = () => {
        setWsResult((r) => (r.includes("OPEN") ? r : "ws: ERROR (network/blocked)"));
      };
    } catch (e) {
      setWsResult(`ws: throw ${String(e).slice(0, 60)}`);
    }
  }, [on]);

  useEffect(() => {
    if (!on) return;
    let cancelled = false;
    async function snapshot() {
      const l: string[] = [];
      l.push(`wagmi: ${status} ${address ? address.slice(0, 8) : "-"} via ${connector?.id ?? "-"}`);
      l.push(`pid: ${PID ? PID.slice(0, 6) + "…" : "MISSING"} · online: ${String(navigator.onLine)}`);
      try {
        l.push(`recent: ${localStorage.getItem("wagmi.recentConnectorId") ?? "-"}`);
        const wcKeys = Object.keys(localStorage).filter((k) => k.startsWith("wc@2"));
        l.push(`wc@2 localStorage keys: ${wcKeys.length}`);
      } catch {
        l.push("storage: unavailable");
      }
      try {
        const dbs = (await indexedDB.databases?.()) ?? [];
        l.push(`idb: ${dbs.map((d) => d.name).filter(Boolean).join(",") || "none"}`);
      } catch {
        l.push("idb: n/a");
      }
      try {
        const wc = connectors.find((c) => c.id === "walletConnect");
        if (!wc) {
          l.push("wc connector: MISSING");
        } else {
          const p = (await wc.getProvider()) as WcProviderLike;
          if (!hooked.current && p?.on) {
            hooked.current = true;
            p.on("display_uri", () => logEvent("display_uri (proposal published)"));
            p.on("connect", () => logEvent("provider CONNECT"));
            p.on("disconnect", () => logEvent("provider disconnect"));
            p.on("session_delete", () => logEvent("session_delete"));
          }
          l.push(
            `provider: session=${Boolean(p?.session)} accts=${p?.accounts?.length ?? 0} connected=${String(p?.connected ?? "?")}`,
          );
          l.push(`relay: ${String(p?.signer?.client?.core?.relayer?.connected ?? "?")}`);
        }
      } catch (e) {
        l.push(`provider err: ${String(e).slice(0, 90)}`);
      }
      if (!cancelled) setLines(l);
    }
    void snapshot();
    const id = setInterval(snapshot, 2_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [on, status, address, connector, connectors]);

  if (!on) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 4,
        left: 4,
        zIndex: 99999,
        background: "rgba(0,0,0,0.9)",
        color: "#7CFC9A",
        font: "10px/1.6 monospace",
        padding: "6px 9px",
        borderRadius: 8,
        maxWidth: "94vw",
        wordBreak: "break-all",
      }}
    >
      <div style={{ color: "#fff", fontWeight: 700 }}>WC DEBUG v2</div>
      {lines.map((x, i) => (
        <div key={i}>{x}</div>
      ))}
      <div style={{ color: "#60A5FA" }}>{wsResult}</div>
      {events.map((x, i) => (
        <div key={`e${i}`} style={{ color: "#F472B6" }}>
          {x}
        </div>
      ))}
      {note && <div style={{ color: "#FBBF24" }}>{note}</div>}
      <button
        type="button"
        style={{
          marginTop: 4,
          color: "#fff",
          textDecoration: "underline",
          background: "none",
          border: 0,
          font: "inherit",
          padding: 0,
        }}
        onClick={async () => {
          setNote("adopting…");
          const wc = connectors.find((c) => c.id === "walletConnect");
          if (!wc) {
            setNote("no wc connector");
            return;
          }
          try {
            await connectAsync({ connector: wc });
            setNote("adopt OK");
          } catch (e) {
            setNote(`adopt err: ${String(e).slice(0, 120)}`);
          }
        }}
      >
        adopt session
      </button>
    </div>
  );
}
