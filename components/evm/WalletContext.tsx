"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { WagmiProvider, useAccount, useConnect } from "wagmi";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@rainbow-me/rainbowkit/styles.css";

import { wagmiConfig } from "@/lib/evm/wagmi-config";
import WcDebugPanel from "@/components/debug/WcDebugPanel";

// Wallet provider boundary. Wraps the entire app so any client component
// can call wagmi hooks (useAccount / useSignMessage / useWriteContract).
//
// HAMR ships on Robinhood Chain via Pons — RainbowKit's default modal
// surfaces MetaMask, Coinbase Wallet, and every WalletConnect-compatible
// wallet (Robinhood Wallet, Rainbow, Trust, Zerion, etc.) automatically.
// We deliberately do NOT ship a custodial / browser-keypair wallet;
// the user's wallet is the only signer.
// ── Mobile session resume ────────────────────────────────────────────
// On phone browsers (Safari/Chrome) the page gets FROZEN while the user
// switches to their wallet app to approve the WalletConnect session.
// The approval lands on the relay, but the suspended page never
// processes it — so the site keeps showing "Connect Wallet" even though
// the wallet says it's connected. Fix: every time the page comes back
// to the foreground (visibility/focus/bfcache-restore), kick wagmi's
// reconnect so any session that settled while we were frozen is picked
// up immediately. Also retry a few times right after resume because the
// relay socket takes a moment to re-establish.
function MobileSessionResume() {
  const { status } = useAccount();
  const { connectAsync, connectors } = useConnect();
  const busy = useRef(false);
  const statusRef = useRef(status);
  statusRef.current = status;

  useEffect(() => {
    let cancelled = false;
    let timers: ReturnType<typeof setTimeout>[] = [];

    // Adopt a WalletConnect session that settled while this page was
    // frozen/reloaded during wallet approval. STRICTLY passive: only
    // acts when wagmi is fully disconnected AND a live WC session
    // already exists — never interferes with a user-initiated connect.
    const adopt = async () => {
      if (cancelled || busy.current) return;
      if (statusRef.current !== "disconnected") return;
      const wc = connectors.find((c) => c.id === "walletConnect");
      if (!wc) return;
      busy.current = true;
      try {
        const p = (await wc.getProvider()) as {
          session?: unknown;
          accounts?: string[];
        } | null;
        if (
          !cancelled &&
          statusRef.current === "disconnected" &&
          p?.session &&
          (p.accounts?.length ?? 0) > 0
        ) {
          await connectAsync({ connector: wc });
        }
      } catch {
        /* nothing to adopt */
      } finally {
        busy.current = false;
      }
    };

    const kick = () => {
      if (document.visibilityState !== "visible") return;
      timers.forEach(clearTimeout);
      // Delayed only — gives any user-initiated connect flow room, and
      // lets the relay socket re-establish after the app switch.
      timers = [2000, 6000].map((ms) => setTimeout(() => void adopt(), ms));
    };

    kick();
    document.addEventListener("visibilitychange", kick);
    window.addEventListener("pageshow", kick);
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      document.removeEventListener("visibilitychange", kick);
      window.removeEventListener("pageshow", kick);
    };
  }, [connectAsync, connectors]);

  return null;
}

export function KokiWalletProvider({ children }: { children: ReactNode }) {
  // Create the query client once per app instance. Fresh instance per
  // provider mount avoids sharing state across Next.js reloads.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000, // wallet + on-chain reads don't need sub-second freshness
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: "#8B5CF6", // HAMR violet
            accentColorForeground: "#FFFFFF",
            borderRadius: "medium",
            fontStack: "system",
          })}
          modalSize="compact"
          initialChain={wagmiConfig.chains[0]}
          appInfo={{
            appName: "HAMR.fun",
            learnMoreUrl: "https://hamr.fun",
          }}
        >
          <MobileSessionResume />
          <WcDebugPanel />
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
