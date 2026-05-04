import { redirect } from "next/navigation";

// X post generation is now part of /launches/[mint] (post-launch promo tools).
export default function XPostGeneratorRedirect() {
  redirect("/launches");
}
