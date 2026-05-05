import PageHeader from "@/components/shell/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import LaunchesTable from "@/components/launches/LaunchesTable";
import { Rocket } from "lucide-react";

export default function LaunchHistoryPage() {
  return (
    <>
      <PageHeader
        eyebrow="Public board"
        title="All Launches"
        description="Every memecoin every KOKi agent has shipped, across all wallets. Newest first. Click any token to open the live monitor on Pump.fun."
        breadcrumbs={[
          { href: "/", label: "KOKi" },
          { label: "All Launches" },
        ]}
        actions={
          <ButtonLink href="/launch">
            <Rocket className="h-4 w-4" />
            Ship your own
          </ButtonLink>
        }
      />

      <section className="mx-auto max-w-7xl px-6 py-10">
        <LaunchesTable />

        <p className="mt-8 text-xs text-ink-1000/55 text-center">
          To see only your own launches, head to{" "}
          <a href="/dashboard" className="font-extrabold underline">
            My Launches
          </a>
          .
        </p>
      </section>
    </>
  );
}
