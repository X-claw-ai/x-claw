import Hero from "@/components/landing/Hero";
import AttentionLayerSection from "@/components/landing/AttentionLayerSection";
import EnginesSection from "@/components/landing/EnginesSection";
import SafetySection from "@/components/landing/SafetySection";
import FinalCTA from "@/components/landing/FinalCTA";

// KOKi — single-product memecoin launch agent.
//
// Core flow:
//   Detect → Analyze → Generate → Launch
//
// Real-time Meme Radar feeds the existing Pump Launch Agent. The user lands
// on a meme card, clicks Generate Launch Kit (or Launch with KOKi), and
// the wizard pre-fills with that meme's concept block.
//
// Sections:
//   1. Hero               — headline + tagline + 4-phase strip
//   2. Attention Layer    — "Most launch tools wait for an idea" + live radar preview
//   3. Engines            — Attention / Community / Intelligence / Execution capabilities
//   4. Safety             — Agent prepares · User approves · Wallet signs · Launch executes
//   5. FinalCTA           — push to /launch
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
