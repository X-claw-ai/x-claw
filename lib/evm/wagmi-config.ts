// Wagmi + RainbowKit config for HAMR on Robinhood Chain.
//
// This file is the single source of truth for the wallet stack. The
// client provider (components/evm/WalletContext) and any server-side
// viem callers that need to reference the same chain both import from
// here.
//
// Wallet coverage:
//   - MetaMask (injected) — largest EVM user base
//   - Coinbase Wallet     — 2nd largest, first-party mobile app
//   - WalletConnect       — covers Robinhood Wallet + Rainbow + Trust + Zerion + everything mobile
//
// Robinhood Wallet supports WalletConnect v2, so as long as WalletConnect
// is in the connector list the "Robinhood" tile shows up automatically
// via the RainbowKit modal.

import { createConfig, http } from "wagmi";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { robinhoodChain } from "../robinhood/chain";

/** WalletConnect Cloud project id. Free tier is fine. */
const WC_PROJECT_ID =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ||
  // Fallback demo id — Vercel deployment MUST override this or
  // WalletConnect returns 403 on the mobile pairing request.
  "hamr-dev";

export const wagmiConfig = getDefaultConfig({
  appName: "HAMR.fun",
  appDescription:
    "Autonomous Grok-native memecoin launch agent on Robinhood Chain.",
  appUrl: "https://hamr.fun",
  appIcon: "https://hamr.fun/hamr-logo.jpg",
  projectId: WC_PROJECT_ID,
  chains: [robinhoodChain],
  transports: {
    [robinhoodChain.id]: http(),
  },
  ssr: true,
}) as ReturnType<typeof createConfig>;
