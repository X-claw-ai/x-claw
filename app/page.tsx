import Hero from "@/components/landing/Hero";
import LiveLaunchesSection from "@/components/landing/LiveLaunchesSection";
import AttentionLayerSection from "@/components/landing/AttentionLayerSection";
import EnginesSection from "@/components/landing/EnginesSection";
import SafetySection from "@/components/landing/SafetySection";
import FinalCTA from "@/components/landing/FinalCTA";
import TeamSection from "@/components/landing/TeamSection";

// KOKi, single-product memecoin launch agent.
//
// Credibility-first ordering: the team sits at the very top — visitor
// sees founder pedigree (DFO, Cashtree 24M users, Huobi Korea) before
// anything else. Then the live token gallery as social proof, then
// the pitch underneath.
//
// Sections (top → bottom):
//   1. Team              , founders + affiliations (trust anchor)
//   2. LiveLaunches      , live mcap + bonding from Pump.fun (social proof)
//   3. Hero              , pitch + CTAs + safety line
//   4. Attention Layer   , "Most launch tools wait for an idea"
//   5. Engines           , Attention / Community / Intelligence / Execution
//   6. Safety            , Agent prepares, User approves, Wallet signs, Launches
//   7. FinalCTA          , push to /launch
export default function LandingPage() {
  return (
    <>
      <TeamSection />
      <LiveLaunchesSection />
      <Hero />
      <AttentionLayerSection />
      <EnginesSection />
      <SafetySection />
      <FinalCTA />
    </>
  );
}
