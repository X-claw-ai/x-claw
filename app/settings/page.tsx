import PageHeader from "@/components/shell/PageHeader";
import { Field, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { ShieldAlert } from "lucide-react";

// Minimal settings page kept for the single-product narrative. Profile fields
// are local-only in the MVP; persistence wires to Supabase later.
export default function SettingsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Settings"
        title="Settings"
        description="Local profile fields. Persistence wires in once Supabase is connected."
        breadcrumbs={[
          { href: "/", label: "KOKi" },
          { label: "Settings" },
        ]}
      />

      <section className="mx-auto max-w-3xl px-6 py-10 space-y-6">
        <div className="card p-6 space-y-4">
          <h2 className="text-base font-semibold">Profile</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Display name">
              <Input defaultValue="" placeholder="Your handle" />
            </Field>
            <Field label="Email (optional)">
              <Input type="email" placeholder="you@domain.com" />
            </Field>
            <Field label="X / Twitter handle">
              <Input placeholder="koki_builder" />
            </Field>
            <Field label="Telegram handle">
              <Input placeholder="koki_builder" />
            </Field>
          </div>
          <div className="pt-2">
            <Button>Save profile (mock)</Button>
          </div>
        </div>

        <div className="card p-6 space-y-3 border-red-500/20">
          <div className="flex items-center gap-2 text-red-300">
            <ShieldAlert className="h-4 w-4" />
            <h2 className="text-base font-semibold">Clear local data</h2>
          </div>
          <p className="text-sm text-zinc-400">
            Wipe locally stored launch history. This does NOT touch on-chain
            tokens — only your browser's history list.
          </p>
          <Button variant="danger">Clear (mock)</Button>
        </div>
      </section>
    </>
  );
}
