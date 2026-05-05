import Link from "next/link";
import { Rocket } from "lucide-react";
import PageHeader from "@/components/shell/PageHeader";
import CommandCenter from "@/components/dashboard/CommandCenter";

// KOKi Command Center.
//
// Pump.fun-style gallery of every memecoin the KOKi agent has shipped,
// plus a top-line stats strip. Replaces the older 4-phase command center.
export default function DashboardPage() {
  return (
    <>
      <PageHeader
        eyebrow="Command Center"
        title="KOKi"
        description="Every memecoin the KOKi agent has shipped. Real launches on Solana mainnet, the meme art that went on-chain, and quick links to the live monitor on Pump.fun."
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
