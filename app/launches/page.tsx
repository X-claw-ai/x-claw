import PageHeader from "@/components/shell/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import LaunchesTable from "@/components/launches/LaunchesTable";
import { Rocket } from "lucide-react";

export default function LaunchHistoryPage() {
  return (
    <>
      <PageHeader
        eyebrow="History"
        title="Launch History"
        description="Real launches you've run with the Pump Launch Agent. Stored locally per browser; Supabase persistence wires in next."
        breadcrumbs={[
          { href: "/", label: "KOKi" },
          { label: "Launches" },
        ]}
        actions={
          <ButtonLink href="/launch">
            <Rocket className="h-4 w-4" />
            New launch
          </ButtonLink>
        }
      />

      <section className="mx-auto max-w-7xl px-6 py-10">
        <LaunchesTable />

        <p className="mt-6 text-xs text-ink-1000/65">
          Real launches link out to Pump.fun and Solscan. Records are persisted
          in <code className="text-ink-1000/72">localStorage</code> for now —
          connect Supabase to share across devices.
        </p>
      </section>
    </>
  );
}
