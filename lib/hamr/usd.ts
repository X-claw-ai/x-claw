// ETH→USD spot price + compact money formatting ("$4.5K", "$1.2M").
// Pump.fun shows market caps in dollars with K/M suffixes — so do we.

let cached: { price: number; at: number } | null = null;
const TTL_MS = 60_000;

/** Spot ETH/USD, cached for a minute. Returns null if every source fails. */
export async function fetchEthUsd(): Promise<number | null> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.price;
  const sources = [
    async () => {
      const r = await fetch("https://api.coinbase.com/v2/prices/ETH-USD/spot");
      const j = (await r.json()) as { data?: { amount?: string } };
      return Number(j.data?.amount);
    },
    async () => {
      const r = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd",
      );
      const j = (await r.json()) as { ethereum?: { usd?: number } };
      return Number(j.ethereum?.usd);
    },
  ];
  for (const src of sources) {
    try {
      const p = await src();
      if (Number.isFinite(p) && p > 0) {
        cached = { price: p, at: Date.now() };
        return p;
      }
    } catch {
      /* try next source */
    }
  }
  return null;
}

/** "$1.2M", "$45.3K", "$982", "$0.42" — pump.fun-style compact dollars. */
export function formatUsd(v: number): string {
  const sign = v < 0 ? "-" : "";
  const n = Math.abs(v);
  if (n >= 1_000_000_000) return `${sign}$${trim(n / 1_000_000_000)}B`;
  if (n >= 1_000_000) return `${sign}$${trim(n / 1_000_000)}M`;
  if (n >= 1_000) return `${sign}$${trim(n / 1_000)}K`;
  if (n >= 1) return `${sign}$${n.toFixed(0)}`;
  if (n >= 0.01) return `${sign}$${n.toFixed(2)}`;
  if (n === 0) return `${sign}$0`;
  // Sub-cent memecoin prices — keep significant digits instead of "$0.00".
  return `${sign}$${n.toLocaleString("en-US", {
    maximumSignificantDigits: 3,
    maximumFractionDigits: 12,
  })}`;
}

function trim(n: number): string {
  return n >= 100 ? n.toFixed(0) : n >= 10 ? n.toFixed(1) : n.toFixed(2);
}
