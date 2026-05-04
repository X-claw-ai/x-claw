import { ShieldCheck, Wallet, UserCheck, Cpu } from "lucide-react";

const PILLARS = [
  {
    icon: Cpu,
    title: "Agent prepares",
    body:
      "Grok drafts the launch kit, on-chain metadata, and the unsigned transaction.",
  },
  {
    icon: UserCheck,
    title: "User approves",
    body:
      "You review token name, ticker, description, links, and the dev buy.",
  },
  {
    icon: Wallet,
    title: "Wallet signs",
    body:
      "Phantom or Solflare signs the create-token transaction. We never see your keys.",
  },
  {
    icon: ShieldCheck,
    title: "Launch executes",
    body:
      "Only after your signature does the token go live on Solana mainnet.",
  },
];

export default function SafetySection() {
  return (
    <section className="border-t border-white/5">
      <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
        <div className="max-w-3xl">
          <div className="text-[11px] uppercase tracking-[0.18em] text-koki-400">
            Safety model
          </div>
          <h2 className="mt-3 text-display text-4xl md:text-5xl font-semibold tracking-extra-tight text-white leading-[1.05] text-balance">
            Agents prepare. People decide. Wallets sign.
          </h2>
          <p className="mt-5 text-zinc-400 text-lg leading-relaxed text-balance">
            Memecoin launches go wrong when an agent silently controls funds.
            KOKi is built so that never happens. The agent is powerful
            because it prepares — not because it holds keys.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {PILLARS.map((p, i) => {
            const Icon = p.icon;
            return (
              <div key={p.title} className="card">
                <div className="flex items-center justify-between">
                  <div className="h-10 w-10 rounded-full border border-koki-500/30 bg-koki-500/[0.06] flex items-center justify-center text-koki-400">
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-[11px] font-mono text-zinc-600 tracking-[0.18em]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <div className="mt-5 text-base font-semibold text-white tracking-tight">
                  {p.title}
                </div>
                <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                  {p.body}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-10 surface p-6 text-sm text-zinc-300 leading-relaxed">
          <span className="text-koki-400 font-semibold">Hard rules:</span>{" "}
          KOKi does not store private keys. Does not ask for seed phrases.
          Does not move funds without your explicit signature. Does not claim
          a partnership with xAI, X, Grok, Pump.fun, or Solana. Memecoin
          launches involve risk; you are the final decision maker.
        </div>
      </div>
    </section>
  );
}
