import { redirect } from "next/navigation";

// No paid tiers in the single-product memecoin agent. Token-gating with
// $KOKI will be wired in later directly into the wizard.
export default function BillingRedirect() {
  redirect("/");
}
