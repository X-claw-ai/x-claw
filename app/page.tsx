import Hero from "@/components/landing/Hero";
import AttentionLayerSection from "@/components/landing/AttentionLayerSection";
import EnginesSection from "@/components/landing/EnginesSection";
import SafetySection from "@/components/landing/SafetySection";
import FinalCTA from "@/components/landing/FinalCTA";

// KOKi, single-product memecoin launch agent.
//
// Hero now does the work of both the brand pitch AND the social proof,
// laying out the headline + one-liner on the left and a live 4-card
// preview on the right. The standalone LiveLaunchesSection is retired
// from the home page; the full gallery still lives at /launches.
//
// Sections (top → bottom):
//   1. Hero              , pitch (left) + live 4 cards (right)
//   2. Attention Layer   , "Most launch tools wait for an idea"
//   3. Engines           , Attention / Community / Intelligence / Execution
//   4. Safety            , Agent prepares, User approves, Wallet signs, Launches
//   5. FinalCTA          , push to /launch
export default function LandingPage() {
  return (
    <>
      <Hero />
      <AttentionLayerSection />
      <EnginesSection />
      <SafetySection />
      <FinalCTA />
    </>
  );
}
