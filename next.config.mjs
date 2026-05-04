/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Solana wallet-adapter ships ESM that needs transpiling for Next.js
  transpilePackages: [
    "@solana/web3.js",
    "@solana/wallet-adapter-base",
    "@solana/wallet-adapter-react",
    "@solana/wallet-adapter-react-ui",
    "@solana/wallet-adapter-wallets",
    "@solana/wallet-adapter-phantom",
    "@solana/wallet-adapter-solflare",
  ],
  // WalletConnect (transitively pulled by wallet-adapter-wallets) uses
  // pino as its logger, which dynamically imports pino-pretty in dev only.
  // Vercel's production build can't resolve it. Stub it + a few related
  // optional deps so the build passes cleanly.
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "pino-pretty": false,
      lokijs: false,
      encoding: false,
    };
    config.externals = [
      ...(config.externals || []),
      "pino-pretty",
      "lokijs",
      "encoding",
    ];
    return config;
  },
  // Single-product redirects. Old multi-vertical routes funnel into the
  // memecoin launch agent flow.
  async redirects() {
    return [
      { source: "/agents", destination: "/launch", permanent: false },
      { source: "/agents/pump-launch", destination: "/launch", permanent: false },
      { source: "/agents/wallet-tracking", destination: "/launches", permanent: false },
      { source: "/agents/x-post-generator", destination: "/launches", permanent: false },
      { source: "/billing", destination: "/", permanent: false },
    ];
  },
  experimental: {
    typedRoutes: false,
  },
};

export default nextConfig;
