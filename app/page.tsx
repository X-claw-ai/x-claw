import Hero from "@/components/landing/Hero";
import LiveLaunchesSection from "@/components/landing/LiveLaunchesSection";
import AttentionLayerSection from "@/components/landing/AttentionLayerSection";
import EnginesSection from "@/components/landing/EnginesSection";
import SafetySection from "@/components/landing/SafetySection";
import FinalCTA from "@/components/landing/FinalCTA";

// KOKi, single-product memecoin launch agent.
//
// Hero-first ordering: headline + one-line pitch sets the frame above
// the fold, THEN live token gallery as immediate social proof, THEN the
// deeper sections. The visitor reads what the product IS before seeing
// what it ships.
//
// Sections (top → bottom):
//   1. Hero              , headline + tagline + 4-phase strip
//   2. LiveLaunches      , live mcap + bonding from Pump.fun (social proof)
//   3. Attention Layer   , "Most launch tools wait for an idea"
//   4. Engines           , Attention / Community / Intelligence / Execution
//   5. Safety            , Agent prepares, User approves, Wallet signs, Launches
//   6. FinalCTA          , push to /launch
export default function LandingPage() {
  return (
    <>
      <Hero />
      <LiveLaunchesSection />
      <AttentionLayerSection />
      <EnginesSection />
      <SafetySection />
      <FinalCTA />
    </>
  );
}
