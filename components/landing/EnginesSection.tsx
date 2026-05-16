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
    name: "Attention",
    insight: "Memes are born on X. The agent watches first.",
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
    insight: "Alpha is on-chain. Read wallets, holders, liquidity, volume.",
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
    insight: "Three engines into one signature. Pump.fun in a single shot.",
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
    <section className="border-t border-[var(--border)] bg-bg">
      <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
        <div className="max-w-3xl">
          <div className="eyebrow">Four engines · one agent</div>
          <h2 className="mt-3 text-display text-display-md text-balance">
            X attention · community · on-chain · <span className="stamp">launch</span>.
          </h2>
          <p className="mt-5 text-ink-300/80 text-base md:text-lg leading-relaxed font-medium max-w-2xl">
            Memecoins are born on X. Communities move on X. Alpha flows from
            on-chain to X. KOKi is the first to wire all four into a single
            autonomous launch agent.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-4">
          {ENGINES.map((e) => {
            const Icon = e.icon;
            return (
              <Link
                key={e.num}
                href={e.href}
                className="card card-hover group flex flex-col !p-7"
              >
                <div className="flex items-center justify-between">
                  <span className="eyebrow !text-[10px] opacity-70">PHASE {e.num}</span>
                  <div className="h-9 w-9 rounded-full border border-[var(--border-strong)] flex items-center justify-center text-ink-300 bg-koki-500">
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-6">
                  <div className="text-display text-[34px] md:text-[40px]">
                    {e.name}
                  </div>
                  <p className="mt-2 text-[13px] text-ink-300/72 leading-snug font-medium">
                    {e.insight}
                  </p>
                </div>
                <ul className="mt-5 space-y-1.5 text-[13px] text-ink-300 font-semibold">
                  {e.capabilities.map((c) => (
                    <li key={c} className="flex gap-2.5 items-start">
                      <span className="text-ink-300 leading-6">●</span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-7 inline-flex items-center gap-1.5 text-[13px] text-ink-300 font-extrabold group-hover:gap-2.5 transition-all">
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
