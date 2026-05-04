import { ShieldCheck, Wallet, UserCheck, Cpu } from "lucide-react";

const PILLARS = [
  {
    icon: Cpu,
    title: "Agent prepares",
    body: "Grok가 런치킷, 온체인 메타데이터, 서명 안 된 트랜잭션을 짭니다.",
  },
  {
    icon: UserCheck,
    title: "User approves",
    body: "토큰명·티커·설명·링크·dev buy를 직접 검토하고 승인합니다.",
  },
  {
    icon: Wallet,
    title: "Wallet signs",
    body: "Phantom/Solflare가 create-token 트랜잭션에 사인합니다. 키는 우리 손에 없습니다.",
  },
  {
    icon: ShieldCheck,
    title: "Launch executes",
    body: "사인 후에만 Solana 메인넷에 토큰이 올라갑니다.",
  },
];

export default function SafetySection() {
  return (
    <section className="border-t-[1.5px] border-ink-1000 bg-koki-500">
      <div className="mx-auto max-w-6xl px-6 py-24 md:py-28">
        <div className="max-w-3xl">
          <div className="eyebrow">Safety model</div>
          <h2 className="mt-3 text-display text-display-md text-balance">
            에이전트는 준비. <span className="stamp">사람</span>이 결정. 지갑이 사인.
          </h2>
          <p className="mt-5 text-ink-1000/80 text-base md:text-lg leading-relaxed font-medium text-balance">
            Memecoin 런치는 에이전트가 돈을 조용히 만질 때 망가집니다. KOKi는 그게 절대 일어나지 않게 만들어졌습니다.
            힘은 에이전트가 키를 가져서가 아니라 — 잘 준비해서 나옵니다.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {PILLARS.map((p, i) => {
            const Icon = p.icon;
            return (
              <div key={p.title} className="card !p-5">
                <div className="flex items-center justify-between">
                  <div className="h-10 w-10 rounded-full border-[1.5px] border-ink-1000 bg-koki-500 flex items-center justify-center text-ink-1000">
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="eyebrow !text-[10px] opacity-60">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <div className="mt-5 text-[18px] font-black tracking-tight text-ink-1000">
                  {p.title}
                </div>
                <p className="mt-1.5 text-[13px] text-ink-1000/72 leading-snug font-medium">
                  {p.body}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-10 surface-ink p-6 text-[14px] leading-relaxed font-medium">
          <span className="font-extrabold">Hard rules:</span>{" "}
          KOKi는 private key를 저장하지 않습니다. seed phrase를 묻지 않습니다.
          명시적 서명 없이 자금을 옮기지 않습니다. xAI · X · Grok · Pump.fun · Solana 와의 파트너십을 주장하지 않습니다.
          Memecoin 런치는 리스크가 있고, 최종 결정은 당신이 합니다.
        </div>
      </div>
    </section>
  );
}
