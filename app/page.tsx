import Hero from "@/components/landing/Hero";
import LiveLaunchesSection from "@/components/landing/LiveLaunchesSection";
import AttentionLayerSection from "@/components/landing/AttentionLayerSection";
import EnginesSection from "@/components/landing/EnginesSection";
import SafetySection from "@/components/landing/SafetySection";
import FinalCTA from "@/components/landing/FinalCTA";

// KOKi — single-product memecoin launch agent.
//
// Sections (top → bottom):
//   1. Hero               — headline + tagline + 4-phase strip
//   2. LiveLaunches       — preview of public 'All Launches' board (social proof,
//                            live mcap + bonding from Pump.fun)
//   3. Attention Layer    — "Most launch tools wait for an idea"
//   4. Engines            — Attention / Community / Intelligence / Execution
//   5. Safety             — Agent prepares · User approves · Wallet signs · Launches
//   6. FinalCTA           — push to /launch
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
