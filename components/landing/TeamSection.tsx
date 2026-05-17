import { Users } from "lucide-react";

// KOKi AI team. The trio sits at the very top of the landing page —
// credibility-first ordering, since trust matters more than aesthetics
// for a brand-new launch agent product. Add new members by appending
// to MEMBERS; the grid auto-fits 3 wide on desktop, 1 on mobile.

interface Affiliation {
  label: string;
  handle: string;
  href: string;
}

interface Member {
  initial: string;
  name: string;
  role: string;
  affiliations: Affiliation[];
  bio: string;
  focus: string;
}

const MEMBERS: Member[] = [
  {
    initial: "D",
    name: "Dallen",
    role: "Co-Founder / Product & Growth Lead",
    affiliations: [
      {
        label: "Dungeon & Fighter",
        handle: "@DFOglobal",
        href: "https://x.com/DFOglobal",
      },
      {
        label: "Cashtree",
        handle: "@cashtreeglobal",
        href: "https://x.com/cashtreeglobal",
      },
    ],
    bio: "Co-founder of Dungeon & Fighter, one of Asia’s most iconic games, and founder/CEO of Cashtree, a rewards app with 24M users. Deep history in large-scale consumer platforms, gaming communities, reward-based growth, and user acquisition.",
    focus:
      "Leads product strategy, growth, community expansion, and viral mechanism design at KOKi AI.",
  },
  {
    initial: "C",
    name: "Chae Xun",
    role: "Co-Founder / Strategic Lead",
    affiliations: [
      {
        label: "Huobi Korea (HTX)",
        handle: "@HTX_Global",
        href: "https://x.com/HTX_Global",
      },
    ],
    bio: "Former CEO of Huobi Korea and current CEO of BlueHelix Korea. Deep experience across global crypto exchange operations, Web3 business development, listing strategy, blockchain infrastructure, and strategic partnerships.",
    focus:
      "Leads exchange relationships, Web3 strategy, global partnerships, and ecosystem expansion at KOKi AI.",
  },
  {
    initial: "L",
    name: "Landly",
    role: "Founder & CEO of KOKi AI",
    affiliations: [
      {
        label: "KOKi AI",
        handle: "@officialkokiai",
        href: "https://x.com/officialkokiai",
      },
    ],
    bio: "Built the original vision: a fully autonomous AI agent that detects real-time X virality and turns it into onchain launches. Former engineer at BMW, now building AI products across autonomous agents, onchain execution, and internet culture.",
    focus:
      "Sets the product direction at KOKi AI and ships the core agent loop end-to-end.",
  },
];

export default function TeamSection() {
  return (
    <section className="border-b border-[var(--border)] bg-bg">
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-24">
        <div className="max-w-3xl">
          <div className="eyebrow flex items-center gap-2">
            <Users className="h-3 w-3" />
            Team
          </div>
          <h2 className="mt-3 text-display text-display-md text-balance">
            Introducing the <span className="stamp">KOKi AI</span> team.
          </h2>
          <p className="mt-5 text-ink-300/80 text-base md:text-lg leading-relaxed font-medium max-w-2xl">
            We came together under Data Hedge, and we design products with
            real value.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
          {MEMBERS.map((m) => (
            <article
              key={m.name}
              className="card card-hover flex flex-col !p-7"
            >
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-koki-500 text-ink-1000 font-extrabold text-lg flex items-center justify-center border border-[var(--border-strong)]">
                  {m.initial}
                </div>
                <div>
                  <div className="text-display text-[22px] leading-none">
                    {m.name}
                  </div>
                  <div className="mt-1.5 text-[11px] font-extrabold uppercase tracking-wider text-ink-300/70">
                    {m.role}
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-1.5">
                {m.affiliations.map((a) => (
                  <a
                    key={a.handle}
                    href={a.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] px-2 py-1 text-[11px] font-bold text-ink-300/85 hover:text-ink-300 hover:bg-ink-1000/10 transition-colors"
                  >
                    {a.label}
                    <span className="opacity-60">{a.handle}</span>
                  </a>
                ))}
              </div>

              <p className="mt-5 text-[13px] text-ink-300/80 leading-relaxed font-medium">
                {m.bio}
              </p>
              <p className="mt-3 text-[13px] text-ink-300 leading-relaxed font-semibold">
                {m.focus}
              </p>
            </article>
          ))}
        </div>

        <p className="mt-8 text-[13px] text-ink-300/70 font-semibold">
          + several other engineers and designers building KOKi AI alongside us.
        </p>
      </div>
    </section>
  );
}
