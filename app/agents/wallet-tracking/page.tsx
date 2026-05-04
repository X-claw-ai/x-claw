import { redirect } from "next/navigation";

// Wallet tracking is now part of /launches/[mint] (post-launch monitoring).
export default function WalletTrackingRedirect() {
  redirect("/launches");
}
