import { ShieldCheck, Wallet, UserCheck, Cpu } from "lucide-react";

const PILLARS = [
  {
    icon: Cpu,
    title: "Agent prepares",
    body:
      "Grok drafts the launch kit, on-chain metadata, and unsigned transaction. Nothing executes yet.",
  },
  {
    icon: UserCheck,
    title: "User approves",
    body:
      "You review token name, ticker, description, links, and the dev buy size before anything moves.",
  },
  {
    icon: Wallet,
    title: "Wallet signs",
    body:
      "Phantom or Solflare signs the create-token transaction. X CLAW never sees your private keys.",
  },
  {
    icon: ShieldCheck,
    title: "Launch executes",
    body:
      "Only after your signature does the token go live on Solana mainnet via Pump.fun.",
  },
];

export default function SafetySection() {
  return (
    <section className="border-t border-white/5">
      <div className="mx-auto max-w-7xl px-6 py-20">
        <div className="text-[11px] uppercase tracking-widest text-claw-500">
          Safety model
        </div>
        <h2 className="mt-2 text-3xl md:text-4xl font-semibold tracking-tight max-w-3xl">
          Agent prepares. User approves. Wallet signs. Launch executes.
        </h2>
        <p className="mt-3 max-w-2xl text-zinc-400">
          Memecoin launches go wrong when an agent silently controls funds.
          X CLAW is built so that never happens. The agent is powerful because
          it prepares — not because it holds keys.
        </p>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {PILLARS.map((p) => {
            const Icon = p.icon;
            return (
              <div key={p.title} className="card p-5">
                <div className="h-10 w-10 rounded-md bg-claw-500/10 border border-claw-500/30 flex items-center justify-center text-claw-400">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="mt-3 text-base font-semibold">{p.title}</div>
                <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                  {p.body}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-10 card p-5 text-sm text-zinc-300 leading-relaxed">
          <span className="text-claw-500 font-semibold">Hard rules:</span>{" "}
          X CLAW does not store private keys. Does not ask for seed phrases.
          Does not move funds without your explicit signature. Does not claim
          a partnership with xAI, X, Grok, Pump.fun, or Solana. Memecoin
          launches involve risk; you are the final decision maker.
        </div>
      </div>
    </section>
  );
}
