import Link from "next/link";
import {
  Sparkles,
  Users2,
  LineChart,
  Rocket,
  ArrowRight,
} from "lucide-react";

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
    name: "Attention",
    insight: "Memes are born on X. The agent watches first, then shapes.",
    capabilities: [
      "Real-time Meme Radar",
      "Meme idea generation",
      "Narrative hooks · viral angles",
      "10 X launch posts per kit",
    ],
    icon: Sparkles,
    href: "/dashboard",
    cta: "Open the radar",
  },
  {
    num: "02",
    name: "Community",
    insight: "Communities move on X and Telegram. The agent prepares the wave.",
    capabilities: [
      "20 community raid replies",
      "Telegram announcement",
      "5 influencer DM templates",
      "7-day campaign plan",
    ],
    icon: Users2,
    href: "/launch",
    cta: "Draft the campaign",
  },
  {
    num: "03",
    name: "Intelligence",
    insight:
      "Alpha is on-chain. The agent reads wallets, holders, liquidity, volume.",
    capabilities: [
      "Wallet tracking",
      "Holder analytics",
      "Liquidity monitoring",
      "Volume + sniper signals",
    ],
    icon: LineChart,
    href: "/dashboard",
    cta: "Open intelligence",
  },
  {
    num: "04",
    name: "Execution",
    insight: "Three engines feed one signature. Pump.fun launch in one flow.",
    capabilities: [
      "Token concept · ticker",
      "Pump.fun metadata (IPFS)",
      "Direct Pump.fun launch",
      "Live launch status",
    ],
    icon: Rocket,
    href: "/launch",
    cta: "Launch a memecoin",
  },
];

export default function EnginesSection() {
  return (
    <section className="border-t border-white/5">
      <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
        <div className="max-w-3xl">
          <div className="text-[11px] uppercase tracking-[0.18em] text-claw-400">
            Four engines · one agent
          </div>
          <h2 className="mt-3 text-display text-4xl md:text-5xl font-semibold tracking-extra-tight text-white leading-[1.05] text-balance">
            X attention · community momentum · on-chain intelligence · launch
            execution.
          </h2>
          <p className="mt-5 text-zinc-400 text-lg leading-relaxed">
            Memecoins are born on X. Communities move on X. Narratives spread
            on X. On-chain alpha is amplified on X. Nobody had connected those
            four into a single autonomous launch agent — until now.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-px bg-white/[0.04] rounded-2xl overflow-hidden border border-white/5">
          {ENGINES.map((e) => {
            const Icon = e.icon;
            return (
              <Link
                key={e.num}
                href={e.href}
                className="group bg-ink-950 p-7 md:p-9 flex flex-col hover:bg-ink-900 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-zinc-500 tracking-[0.18em]">
                    PHASE {e.num}
                  </span>
                  <div className="h-9 w-9 rounded-full border border-white/10 flex items-center justify-center text-claw-400 group-hover:border-claw-500/40 transition-colors">
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-8">
                  <div className="text-display text-3xl md:text-4xl font-semibold tracking-extra-tight text-white">
                    {e.name}
                  </div>
                  <p className="mt-2 text-sm text-zinc-500 leading-relaxed italic">
                    {e.insight}
                  </p>
                </div>
                <ul className="mt-6 space-y-1.5 text-sm text-zinc-300">
                  {e.capabilities.map((c) => (
                    <li key={c} className="flex gap-2.5 items-start">
                      <span className="text-claw-400 leading-6">•</span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-8 inline-flex items-center gap-1.5 text-sm text-claw-400 font-medium group-hover:gap-2 transition-all">
                  {e.cta}
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
