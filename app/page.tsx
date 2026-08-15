import BoardHero from "@/components/landing/BoardHero";
import BoardGrid from "@/components/landing/BoardGrid";

// HAMR.fun home — Pump.fun-style board page. The token grid IS the home;
// marketing sections were pulled off in favor of a compact top strip
// and a live-refreshing grid so visitors see actual product on load,
// not a vibe-coded pitch. wagmi/WalletConnect init happens in the
// layout — this page just needs the grid client component.
//
// The old landing sections (Hero, EnginesSection, SafetySection,
// AttentionLayerSection, FinalCTA, LiveLaunchesSection) stay in the
// tree so an /about page can revive them; they are no longer wired
// into /.
export const dynamic = "force-dynamic";

export default function LandingPage() {
  return (
    <>
      <BoardHero />
      <BoardGrid />
    </>
  );
}
