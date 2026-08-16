import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Docs — HAMR.fun",
  description:
    "How the HAMR launchpad works: bonding curve, graduation, fees, and the Auto-pilot agent.",
};

// /docs — plain-language documentation for the HAMR launchpad.
// Numbers here mirror lib/hamr/constants.ts and the deployed contracts;
// if the economics change on-chain, update both.

const LAUNCHPAD = "0xEac5CB9B5e7F32074Aa232EE54e62196cc236b8e";
const LOCKER = "0x93dd19970Ca4CD2Bd405014c9247A0f33DA0f926";

export default function DocsPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 md:px-6 py-12 md:py-16">
      <div className="eyebrow">Docs</div>
      <h1 className="mt-2 text-display text-[clamp(28px,4.5vw,44px)]">
        How HAMR works
      </h1>
      <p className="mt-3 text-[14px] text-ink-300/75 font-medium leading-relaxed">
        HAMR.fun is a memecoin launchpad on Robinhood Chain with its own
        factory contract and an agent that can launch coins for you. This
        page covers everything: launching, the bonding curve, graduation,
        and where the fees go.
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
          on-chain, and opens the bonding curve — all in a single
          transaction. The launch fee is <strong>0.0005 ETH</strong>. You
          can bundle a first buy into the same transaction.
        </p>
      </Doc>

      <Doc title="The bonding curve">
        <p>
          Every new coin trades on a constant-product virtual curve:
          800M tokens are sold along the curve, starting from virtual
          reserves of 1.5 ETH / 1.1B tokens. Price rises deterministically
          as people buy; anyone can sell back to the curve at any time.
          Every trade pays a <strong>1% fee</strong>.
        </p>
        <p>
          There is no team allocation, no presale, and no way to mint more
          supply — the factory deploys every token with the same fixed
          1B supply and the same curve parameters.
        </p>
      </Doc>

      <Doc title="Graduation">
        <p>
          When a curve raises <strong>4 ETH</strong>, it graduates
          automatically in the same transaction: the remaining 200M tokens
          plus the raised ETH open a Uniswap V3 pool (1% tier, full range),
          and the LP position is locked in the HAMR fee locker{" "}
          <strong>forever</strong>. Nobody — including us — can pull that
          liquidity.
        </p>
      </Doc>

      <Doc title="Fees — creators keep 75%">
        <p>
          Every fee the protocol collects is split{" "}
          <strong>75% to the token&apos;s creator / 25% to HAMR</strong>.
          That covers the 1% curve trade fee before graduation and the
          Uniswap LP fees harvested from the locked position after
          graduation. Fees accrue in on-chain ledgers and are
          pull-payment: creators claim whenever they want, independently
          of anyone else.
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
