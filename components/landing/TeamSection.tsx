import Image from "next/image";
import { Users, Linkedin } from "lucide-react";

// KOKi AI team. The trio sits at the very top of the landing page —
// credibility-first ordering, since trust matters more than aesthetics
// for a brand-new launch agent product. Add new members by appending
// to MEMBERS; the grid auto-fits 3 wide on desktop, 1 on mobile.

interface Affiliation {
  label: string;
  handle: string;
  href: string;
}

interface Socials {
  x?: string;
  linkedin?: string;
}

interface Member {
  /** Pixel-art KOKi shiba mascot, costumed per member. */
  avatar: string;
  name: string;
  role: string;
  affiliations: Affiliation[];
  socials: Socials;
  bio: string;
  focus: string;
}

const MEMBERS: Member[] = [
  {
    avatar: "/team/dallen.png",
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
    socials: {
      x: "https://x.com/dallenhedera",
      linkedin: "https://www.linkedin.com/in/dallen-kim-6a8869b4/",
    },
    bio: "Co-founder of Dungeon & Fighter, one of Asia’s most iconic games, and founder/CEO of Cashtree, a rewards app with 24M users. Deep history in large-scale consumer platforms, gaming communities, reward-based growth, and user acquisition.",
    focus:
      "Leads product strategy, growth, community expansion, and viral mechanism design at KOKi AI.",
  },
  {
    avatar: "/team/chae.png",
    name: "Chae Xun",
    role: "Co-Founder / Strategic Lead",
    affiliations: [
      {
        label: "Huobi Korea (HTX)",
        handle: "@HTX_Global",
        href: "https://x.com/HTX_Global",
      },
    ],
    socials: {
      x: "https://x.com/hoonchae251853",
      linkedin: "https://www.linkedin.com/in/chaexun/",
    },
    bio: "Former CEO of Huobi Korea and current CEO of BlueHelix Korea. Deep experience across global crypto exchange operations, Web3 business development, listing strategy, blockchain infrastructure, and strategic partnerships.",
    focus:
      "Leads exchange relationships, Web3 strategy, global partnerships, and ecosystem expansion at KOKi AI.",
  },
  {
    avatar: "/team/landly.png",
    name: "Landly",
    role: "Founder & CEO of KOKi AI",
    affiliations: [
      {
        label: "KOKi AI",
        handle: "@officialkokiai",
        href: "https://x.com/officialkokiai",
      },
    ],
    socials: {
      x: "https://x.com/LandlyFranscott",
    },
    bio: "Built the original vision: a fully autonomous AI agent that detects real-time X virality and turns it into onchain launches. Former engineer at BMW, now building AI products across autonomous agents, onchain execution, and internet culture.",
    focus:
      "Sets the product direction at KOKi AI and ships the core agent loop end-to-end.",
  },
];

// X (Twitter) logo — same path used in Navbar.
function XIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1200 1227"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path d="M714.163 519.284 1160.89 0H1055.03L667.137 450.887 357.328 0H0L468.492 681.821 0 1226.37H105.866L515.491 750.218 842.672 1226.37H1200L714.137 519.284h.026ZM569.165 687.828l-47.468-67.894-377.686-540.24h162.604l304.797 435.991 47.468 67.894 396.2 566.721H892.476L569.165 687.854v-.026Z" />
    </svg>
  );
}

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
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="h-14 w-14 shrink-0 rounded-full bg-koki-500 border border-[var(--border-strong)] overflow-hidden relative">
                    <Image
                      src={m.avatar}
                      alt={`${m.name} pixel mascot`}
                      fill
                      sizes="56px"
                      className="object-cover [image-rendering:pixelated]"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="text-display text-[22px] leading-none truncate">
                      {m.name}
                    </div>
                    <div className="mt-1.5 text-[11px] font-extrabold uppercase tracking-wider text-ink-300/70">
                      {m.role}
                    </div>
                  </div>
                </div>
                {/* Per-member personal socials, top-right of card. */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {m.socials.x && (
                    <a
                      href={m.socials.x}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${m.name} on X`}
                      title={`${m.name} on X`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border)] text-ink-300/80 hover:text-ink-300 hover:bg-ink-1000/10 transition-colors"
                    >
                      <XIcon className="h-3.5 w-3.5 fill-current" />
                    </a>
                  )}
                  {m.socials.linkedin && (
                    <a
                      href={m.socials.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${m.name} on LinkedIn`}
                      title={`${m.name} on LinkedIn`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border)] text-ink-300/80 hover:text-ink-300 hover:bg-ink-1000/10 transition-colors"
                    >
                      <Linkedin className="h-4 w-4" />
                    </a>
                  )}
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
