import { redirect } from "next/navigation";

// Single-product narrative — /agents is no longer a catalog. The redirect in
// next.config.mjs handles this at the edge; this server-side fallback exists
// so direct file access still routes correctly.
export default function AgentsPage() {
  redirect("/launch");
}
