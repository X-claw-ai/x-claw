import { redirect } from "next/navigation";

// Wizard moved to /launch. This file remains as a redirect fallback so any
// shared bookmarks keep working.
export default function PumpLaunchRedirect() {
  redirect("/launch");
}
