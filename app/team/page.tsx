import type { Metadata } from "next";
import TeamSection from "@/components/landing/TeamSection";

// Dedicated Team page — kept off the landing page on purpose, only
// reachable through the navbar "Team" link. Lets visitors who want
// the founder pedigree drill into it without slowing the main pitch
// flow on /.
export const metadata: Metadata = {
  title: "Team · KOKi AI",
  description:
    "Meet the KOKi AI team — founders behind Dungeon & Fighter, Cashtree, Huobi Korea, and the autonomous launch agent.",
};

export default function TeamPage() {
  return <TeamSection />;
}
