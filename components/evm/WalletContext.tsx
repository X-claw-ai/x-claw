"use client";

import { useEffect, useState, type ReactNode } from "react";
import { WagmiProvider, useAccount, useReconnect } from "wagmi";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@rainbow-me/rainbowkit/styles.css";

import { wagmiConfig } from "@/lib/evm/wagmi-config";

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
  const { isConnected } = useAccount();
  const { reconnect } = useReconnect();

  useEffect(() => {
    if (isConnected) return;
    let timers: ReturnType<typeof setTimeout>[] = [];

    const kick = () => {
      if (document.visibilityState !== "visible") return;
      timers.forEach(clearTimeout);
      // Immediate + a couple of delayed retries while the WC relay
      // websocket comes back up.
      timers = [0, 1200, 3500].map((ms) =>
        setTimeout(() => reconnect(), ms),
      );
    };

    document.addEventListener("visibilitychange", kick);
    window.addEventListener("focus", kick);
    window.addEventListener("pageshow", kick);
    return () => {
      timers.forEach(clearTimeout);
      document.removeEventListener("visibilitychange", kick);
      window.removeEventListener("focus", kick);
      window.removeEventListener("pageshow", kick);
    };
  }, [isConnected, reconnect]);

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
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
