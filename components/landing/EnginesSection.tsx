import Link from "next/link";
import { Sparkles, Users2, LineChart, Rocket, ArrowRight } from "lucide-react";

interface Engine {
  num: string;
  name: string;
  insight: string;
  capabilities: string[];
  icon: React.ElementType;
  href: string;
  cta: string;
}

const ENGINES: Engine[] = [
  {
    num: "01",
    name: "Attention Engine",
    insight: "Memes are born on X. The agent watches first, then shapes.",
    capabilities: [
      "Real-time Meme Radar (live)",
      "Meme idea generation",
      "Narrative hooks + viral angles",
      "10 X launch posts per kit",
    ],
    icon: Sparkles,
    href: "/dashboard",
    cta: "Open the radar",
  },
  {
    num: "02",
    name: "Community Engine",
    insight: "Communities move on X and Telegram. The agent prepares the wave.",
    capabilities: [
      "20 community raid replies",
      "Telegram announcement",
      "Influencer DM templates (5)",
      "7-day campaign plan",
    ],
    icon: Users2,
    href: "/launch",
    cta: "Draft the campaign",
  },
  {
    num: "03",
    name: "On-chain Intelligence",
    insight:
      "Alpha is on-chain. The agent reads wallets, holders, liquidity, volume.",
    capabilities: [
      "Wallet tracking",
      "Holder analytics",
      "Liquidity monitoring",
      "Volume + sniper signals",
      "Launch monitoring",
    ],
    icon: LineChart,
    href: "/dashboard",
    cta: "Open intelligence",
  },
  {
    num: "04",
    name: "Launch Execution",
    insight:
      "Nobody connects the three above into one launch flow. X CLAW does.",
    capabilities: [
      "Token concept + ticker",
      "Pump.fun metadata (IPFS)",
      "Direct Pump.fun launch (real tx)",
      "Live launch status",
    ],
    icon: Rocket,
    href: "/launch",
    cta: "Launch now",
  },
];

export default function EnginesSection() {
  return (
    <section className="border-t border-white/5">
      <div className="mx-auto max-w-7xl px-6 py-20">
        <div className="text-[11px] uppercase tracking-widest text-claw-500">
          Four engines · one agent
        </div>
        <h2 className="mt-2 text-3xl md:text-4xl font-semibold tracking-tight max-w-3xl">
          X attention · community momentum · on-chain intelligence · launch execution
        </h2>
        <p className="mt-3 max-w-2xl text-zinc-400">
          Meme coins are born on X. Communities move on X. Narratives spread
          on X. On-chain alpha is amplified on X. Nobody has connected those
          four into an autonomous launch agent — until now.
        </p>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {ENGINES.map((e) => {
            const Icon = e.icon;
            return (
              <div key={e.num} className="card card-hover p-5 flex flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="h-10 w-10 rounded-md bg-claw-500/15 border border-claw-500/40 flex items-center justify-center text-claw-400">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] uppercase tracking-widest text-zinc-500">
                    Phase {e.num}
                  </span>
                </div>
                <div className="mt-4">
                  <div className="text-base font-semibold text-zinc-100">
                    {e.name}
                  </div>
                  <p className="mt-1 text-xs text-zinc-500 leading-relaxed italic">
                    {e.insight}
                  </p>
                </div>
                <ul className="mt-4 space-y-1 text-sm text-zinc-300">
                  {e.capabilities.map((c) => (
                    <li key={c} className="flex gap-2">
                      <span className="text-claw-500">•</span>
                      {c}
                    </li>
                  ))}
                </ul>
                <Link
                  href={e.href}
                  className="mt-5 inline-flex items-center gap-1 text-xs text-claw-400 hover:text-claw-500"
                >
                  {e.cta} <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
