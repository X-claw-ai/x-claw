import Link from "next/link";
import { Rocket } from "lucide-react";
import PageHeader from "@/components/shell/PageHeader";
import CommandCenter from "@/components/dashboard/CommandCenter";

// X CLAW Command Center.
//
// Four-section dashboard mirroring the agent loop:
//   01 Attention Signals · 02 Community Momentum · 03 On-chain Intelligence · 04 Launch Execution
export default function DashboardPage() {
  return (
    <>
      <PageHeader
        eyebrow="Command Center"
        title="X CLAW"
        description="X attention · community momentum · on-chain intelligence · launch execution. One agent, four engines."
        actions={
          <Link
            href="/launch"
            className="inline-flex items-center gap-2 rounded-md bg-claw-500 text-ink-950 px-3.5 py-2 text-sm font-semibold hover:bg-claw-400 transition"
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
