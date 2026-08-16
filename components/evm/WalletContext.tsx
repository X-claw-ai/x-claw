"use client";

import { useState, type ReactNode } from "react";
import { WagmiProvider } from "wagmi";
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
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
