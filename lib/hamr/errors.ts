// Turn viem/wallet error walls into one human sentence. The raw error
// (hex calldata and all) is useless to end users — map the common
// cases and truncate the rest.

export function humanizeTxError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  const m = msg.toLowerCase();
  if (m.includes("insufficient funds") || m.includes("exceeds the balance")) {
    return "Not enough ETH in your wallet to cover the launch fee + gas. Top up a little ETH on Robinhood Chain and try again.";
  }
  if (m.includes("user rejected") || m.includes("user denied")) {
    return "Signature rejected in your wallet — nothing was sent.";
  }
  if (m.includes("nonce")) {
    return "Wallet nonce out of sync — reset the account activity in your wallet settings or retry in a moment.";
  }
  if (m.includes("http client error") || m.includes("http request failed")) {
    return "Network hiccup talking to the chain — wait a few seconds and try again.";
  }
  if (m.includes("reverted")) {
    // On this chain an underfunded wallet often surfaces as a bare
    // revert during gas estimation — say so instead of showing nothing.
    return "The chain rejected this transaction in simulation. Most common cause: not enough ETH on Robinhood Chain for the amount + gas. Top up and retry; if it persists, try a smaller amount.";
  }
  // Fallback: first line only, no calldata walls.
  return msg.split("\n")[0].slice(0, 200);
}
