import Link from "next/link";
import { ArrowRight, Radar } from "lucide-react";

export default function AttentionLayerSection() {
  return (
    <section className="border-t-[1.5px] border-ink-1000 bg-koki-500">
      <div className="mx-auto max-w-6xl px-6 py-24 md:py-28">
        <div className="max-w-4xl">
          <div className="eyebrow flex items-center gap-2">
            <Radar className="h-3 w-3" />
            Attention layer
          </div>
          <h2 className="mt-3 text-display text-display-md text-balance">
            대부분 런치툴은 아이디어를 기다립니다.
            <br />
            <span className="opacity-60">KOKi는 먼저 본다.</span>
          </h2>
          <p className="mt-6 text-ink-1000/80 text-base md:text-lg leading-relaxed max-w-2xl text-balance font-medium">
            KOKi는 X 밈 시그널, 커뮤니티 모멘텀, 온체인 관련성을 먼저 분석한 후 런치킷을 짜고 Pump.fun 실행을 준비합니다.
            너는 빈 폼이 아니라 — 깔끔히 정리된 기회 위에서 시작합니다.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link href="/dashboard" className="btn btn-primary !py-3 !px-5">
              Open the Meme Radar
              <ArrowRight className="h-4 w-4" />
            </Link>
            <span className="text-[12px] font-bold text-ink-1000/72">
              Real-time trends connect once X API is wired.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
