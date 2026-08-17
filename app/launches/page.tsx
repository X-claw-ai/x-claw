import BoardGrid from "@/components/landing/BoardGrid";

// Skip prerender — the wagmi provider in RootLayout initializes
// WalletConnect which touches indexedDB during hydration.
export const dynamic = "force-dynamic";

// /launches — the public board. Same live grid as the home page: DB
// rows merged with tokens read straight from the factory contract, so
// every launch shows up here no matter how it was made.
export default function LaunchHistoryPage() {
  return <BoardGrid />;
}
