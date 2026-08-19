"use client";

import { useEffect, useState } from "react";
import { useAccount, useConnect } from "wagmi";

// Hidden diagnostics overlay for the mobile WalletConnect issue.
// Open https://hamr.fun/?wcdebug=1 — a small monospace panel appears
// showing the live wagmi + WalletConnect internals every 2s, so a
// phone screenshot tells us EXACTLY where the handshake dies.
// Zero impact for normal visitors (renders nothing without the flag).

interface WcProviderLike {
  session?: unknown;
  accounts?: string[];
  connected?: boolean;
  signer?: {
    client?: { core?: { relayer?: { connected?: boolean } } };
  };
}

export default function WcDebugPanel() {
  const [on, setOn] = useState(false);
  const [lines, setLines] = useState<string[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const { status, address, connector } = useAccount();
  const { connectors, connectAsync } = useConnect();

  useEffect(() => {
    try {
      const flagged =
        new URLSearchParams(window.location.search).has("wcdebug") ||
        localStorage.getItem("hamr-wcdebug") === "1";
      if (flagged) localStorage.setItem("hamr-wcdebug", "1");
      setOn(flagged);
    } catch {
      /* private mode etc. */
    }
  }, []);

  useEffect(() => {
    if (!on) return;
    let cancelled = false;
    async function snapshot() {
      const l: string[] = [];
      l.push(`wagmi: ${status} ${address ? address.slice(0, 8) : "-"} via ${connector?.id ?? "-"}`);
      try {
        l.push(`recent: ${localStorage.getItem("wagmi.recentConnectorId") ?? "-"}`);
        const wcKeys = Object.keys(localStorage).filter((k) =>
          k.startsWith("wc@2"),
        );
        l.push(`wc@2 keys: ${wcKeys.length}`);
      } catch {
        l.push("storage: unavailable");
      }
      try {
        const wc = connectors.find((c) => c.id === "walletConnect");
        if (!wc) {
          l.push("wc connector: MISSING");
        } else {
          const p = (await wc.getProvider()) as WcProviderLike;
          l.push(
            `provider: session=${Boolean(p?.session)} accts=${p?.accounts?.length ?? 0} connected=${String(p?.connected ?? "?")}`,
          );
          l.push(
            `relay: ${String(p?.signer?.client?.core?.relayer?.connected ?? "?")}`,
          );
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
        background: "rgba(0,0,0,0.88)",
        color: "#7CFC9A",
        font: "10px/1.6 monospace",
        padding: "6px 9px",
        borderRadius: 8,
        maxWidth: "94vw",
        wordBreak: "break-all",
      }}
    >
      <div style={{ color: "#fff", fontWeight: 700 }}>WC DEBUG</div>
      {lines.map((x, i) => (
        <div key={i}>{x}</div>
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
