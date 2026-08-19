import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Docs — HAMR.fun",
  description:
    "How the HAMR launchpad works: instant Uniswap V3 pools, locked liquidity, fees, and the Auto-pilot agent.",
};

// /docs — plain-language documentation for the HAMR launchpad (v2).
// Numbers here mirror lib/hamr/v2.ts and the deployed contracts;
// if the economics change on-chain, update both.

const LAUNCHPAD = "0x24ad1b88e2af2c6447dc56c182a857c8c3459e18";
const LOCKER = "0x7ce67aa556fa6bf73e6670ccc605b0ab0a69c0b7";

export default function DocsPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 md:px-6 py-12 md:py-16">
      <div className="eyebrow">Docs</div>
      <h1 className="mt-2 text-display text-[clamp(28px,4.5vw,44px)]">
        How HAMR works
      </h1>
      <p className="mt-3 text-[14px] text-ink-300/75 font-medium leading-relaxed">
        HAMR.fun is a memecoin launchpad on Robinhood Chain with its own
        factory contract and an agent that can launch coins for you. Every
        coin launches as a <strong>real Uniswap V3 pool</strong> — no
        virtual curve, no whitelist — so it&apos;s tradeable from any
        wallet, Telegram bot, or aggregator from block one.
      </p>

      <Doc title="Launching a coin">
        <p>
          Two lanes. <strong>Auto-pilot</strong>: the HAMR agent scans X in
          real time, picks the most viral meme of the moment, and drafts the
          whole token — name, ticker, description, the meme&apos;s image as
          the logo, and a link to the source post. <strong>Manual</strong>:
          you upload an image, type a name and ticker, optionally add
          socials, and go.
        </p>
        <p>
          Either way, one wallet signature calls{" "}
          <code>launchToken()</code> on the HAMR factory. It deploys a fixed
          1B-supply ERC-20, stores the logo, description, and social links
          on-chain, creates + initializes a Uniswap V3 pool (1% tier,
          paired with ETH), and locks the <strong>entire supply</strong> as
          one-sided liquidity — all in a single transaction. The launch fee
          is <strong>0.0005 ETH</strong>. An optional first buy runs as a
          normal router swap right after.
        </p>
      </Doc>

      <Doc title="The launch curve — a real pool">
        <p>
          The 1B supply is deposited across a fixed Uniswap V3 price range
          (~1.36 nano-ETH to ~11.8 nano-ETH per token, an ~8.7×
          span). That concentrated one-sided position behaves exactly like
          a bonding curve — price climbs deterministically as buys absorb
          the range — except it&apos;s a standard pool, so{" "}
          <strong>every wallet and bot can quote and trade it
          instantly</strong> through the canonical QuoterV2 and SwapRouter.
          Every trade pays the pool&apos;s <strong>1% fee</strong>.
        </p>
        <p>
          There is no team allocation, no presale, and no way to mint more
          supply — the factory deploys every token with the same fixed
          1B supply and the same range.
        </p>
      </Doc>

      <Doc title="Graduation">
        <p>
          Graduation is a milestone, not a migration: when buys have pushed
          the price through the top of the launch range (~
          <strong>4 ETH</strong> absorbed into the pool), the coin is
          &quot;graduated&quot;. Nothing moves and trading never pauses —
          liquidity was locked in the HAMR fee locker from the very first
          block. Nobody — including us — can ever pull it.
        </p>
      </Doc>

      <Doc title="Fees — creators keep 75%">
        <p>
          The locked LP position earns the pool&apos;s 1% fee on every
          single trade, forever. Anyone can trigger a harvest on the fee
          locker, which ledgers <strong>75% to the token&apos;s creator /
          25% to HAMR</strong>. Fees are pull-payment: creators claim
          whenever they want, independently of anyone else.
        </p>
      </Doc>

      <Doc title="Trust model">
        <p>
          The agent prepares; your wallet signs. HAMR never holds your
          funds, never has your keys, and cannot launch or trade on your
          behalf. Token metadata (logo, description, socials, creator)
          lives on-chain, and the board reads directly from the chain — so
          what you see is what the contract says.
        </p>
      </Doc>

      <Doc title="Contracts">
        <p>Robinhood Chain mainnet (chain ID 4663):</p>
        <ul>
          <li>
            HAMR Launchpad:{" "}
            <a
              href={`https://robinhoodchain.blockscout.com/address/${LAUNCHPAD}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <code>{LAUNCHPAD}</code>
            </a>
          </li>
          <li>
            HAMR Fee Locker:{" "}
            <a
              href={`https://robinhoodchain.blockscout.com/address/${LOCKER}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <code>{LOCKER}</code>
            </a>
          </li>
        </ul>
      </Doc>

      <div className="mt-10 card !p-6 text-center">
        <div className="text-[16px] font-black tracking-tight">
          Ready to try it?
        </div>
        <div className="mt-4 flex items-center justify-center gap-3">
          <Link href="/launch?autopilot=1" className="btn btn-primary !py-2.5 !px-5">
            Run Auto-pilot
          </Link>
          <Link href="/launch" className="btn btn-secondary !py-2.5 !px-5">
            Launch manually
          </Link>
        </div>
      </div>
    </section>
  );
}

function Doc({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-10">
      <h2 className="text-[19px] font-black tracking-tight">{title}</h2>
      <div className="mt-3 space-y-3 text-[13.5px] text-ink-300/80 font-medium leading-relaxed [&_code]:font-mono [&_code]:text-[12px] [&_code]:bg-ink-1000/10 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_a]:text-koki-300 [&_a]:hover:underline [&_strong]:text-ink-300 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5">
        {children}
      </div>
    </div>
  );
}
