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
