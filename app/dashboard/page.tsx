import Link from "next/link";
import { Rocket } from "lucide-react";
import PageHeader from "@/components/shell/PageHeader";
import CommandCenter from "@/components/dashboard/CommandCenter";

// "My Launches" — wallet-scoped gallery of every Pons token this user has
// shipped via the HAMR agent. Mirrors the public /launches view, filtered
// to the connected wallet.
//
// wagmi + WalletConnect touch indexedDB during hydration, which throws
// during Next.js prerender. Skip static generation so the wallet stack
// only ever runs in the browser.
export const dynamic = "force-dynamic";

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        eyebrow="Your HAMR agent"
        title="My Launches"
        description="Every memecoin you've shipped through the HAMR agent. Real launches on Robinhood Chain mainnet, and quick links to the live monitor on Pons."
        actions={
          <Link
            href="/launch"
            className="btn btn-primary !py-2 !px-3.5 !text-sm"
          >
            <Rocket className="h-4 w-4" />
            Launch a Memecoin
          </Link>
        }
      />
      <div className="mx-auto max-w-7xl pb-16 pt-8 space-y-8">
        <CommandCenter />
      </div>
    </>
  );
}
