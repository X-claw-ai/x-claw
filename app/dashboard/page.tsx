import Link from "next/link";
import { Rocket } from "lucide-react";
import PageHeader from "@/components/shell/PageHeader";
import CommandCenter from "@/components/dashboard/CommandCenter";

// "My Launches", wallet-scoped Pump.fun-style gallery of every memecoin
// THIS user has shipped via the KOKi agent. Mirrors the public /launches
// view, but filtered to the connected wallet's own history. Stats card
// strip stays at the top for at-a-glance context.
export default function DashboardPage() {
  return (
    <>
      <PageHeader
        eyebrow="Your KOKi agent"
        title="My Launches"
        description="Every memecoin you've shipped through the KOKi agent. Real launches on Solana mainnet, the meme art that went onchain, and quick links to the live monitor on Pump.fun."
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
