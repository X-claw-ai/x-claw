import { ShieldCheck, Wallet, UserCheck, Cpu } from "lucide-react";

const PILLARS = [
  {
    icon: Cpu,
    title: "Agent prepares",
    body: "Grok drafts the launch kit, on-chain metadata, and the unsigned transaction.",
  },
  {
    icon: UserCheck,
    title: "User approves",
    body: "You review token name, ticker, description, links, and the dev buy.",
  },
  {
    icon: Wallet,
    title: "Wallet signs",
    body: "Phantom or Solflare signs the create-token transaction. We never see your keys.",
  },
  {
    icon: ShieldCheck,
    title: "Launch executes",
    body: "Only after your signature does the token go live on Solana mainnet.",
  },
];

export default function SafetySection() {
  return (
    <section className="border-t border-[var(--border)] bg-bg">
      <div className="mx-auto max-w-6xl px-6 py-24 md:py-28">
        <div className="max-w-3xl">
          <div className="eyebrow">Safety model</div>
          <h2 className="mt-3 text-display text-display-md text-balance">
            Agents prepare. <span className="stamp">People</span> decide. Wallets sign.
          </h2>
          <p className="mt-5 text-ink-300/80 text-base md:text-lg leading-relaxed font-medium text-balance">
            Memecoin launches go wrong when an agent silently controls funds.
            KOKi is built so that never happens. The agent is powerful because
            it prepares — not because it holds keys.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {PILLARS.map((p, i) => {
            const Icon = p.icon;
            return (
              <div key={p.title} className="card !p-5">
                <div className="flex items-center justify-between">
                  <div className="h-10 w-10 rounded-full border border-[var(--border-strong)] bg-koki-500 flex items-center justify-center text-ink-300">
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="eyebrow !text-[10px] opacity-60">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <div className="mt-5 text-[18px] font-black tracking-tight text-ink-300">
                  {p.title}
                </div>
                <p className="mt-1.5 text-[13px] text-ink-300/72 leading-snug font-medium">
                  {p.body}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-10 surface-ink p-6 text-[14px] leading-relaxed font-medium">
          <span className="font-extrabold">Hard rules:</span>{" "}
          KOKi does not store private keys. Does not ask for seed phrases.
          Does not move funds without your explicit signature. Does not claim
          partnership with xAI, X, Grok, Pump.fun, PumpPortal, or Solana.
          Memecoin launches involve risk; you are the final decision maker.
        </div>
      </div>
    </section>
  );
}
