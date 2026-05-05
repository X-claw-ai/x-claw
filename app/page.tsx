import Hero from "@/components/landing/Hero";
import LiveLaunchesSection from "@/components/landing/LiveLaunchesSection";
import AttentionLayerSection from "@/components/landing/AttentionLayerSection";
import EnginesSection from "@/components/landing/EnginesSection";
import SafetySection from "@/components/landing/SafetySection";
import FinalCTA from "@/components/landing/FinalCTA";

// KOKi — single-product memecoin launch agent.
//
// Pump.fun-style ordering: live token gallery first (above the fold so
// visitors see real shipped coins immediately), THEN the explanation
// of what KOKi is. Lets the product prove itself before the pitch.
//
// Sections (top → bottom):
//   1. LiveLaunches       — live mcap + bonding from Pump.fun (social proof)
//   2. Hero               — headline + tagline + 4-phase strip
//   3. Attention Layer    — "Most launch tools wait for an idea"
//   4. Engines            — Attention / Community / Intelligence / Execution
//   5. Safety             — Agent prepares · User approves · Wallet signs · Launches
//   6. FinalCTA           — push to /launch
export default function LandingPage() {
  return (
    <>
      <LiveLaunchesSection />
      <Hero />
      <AttentionLayerSection />
      <EnginesSection />
      <SafetySection />
      <FinalCTA />
    </>
  );
}
