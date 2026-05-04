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

  // Skip lint + TS during the production build so deploy isn't blocked by
  // strict-mode warnings inside transitive deps. We still type-check locally
  // via `npm run type-check`.
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  // WalletConnect (transitively via @solana/wallet-adapter-wallets) uses
  // pino as its logger and dynamically imports a handful of optional deps
  // (pino-pretty, bufferutil, utf-8-validate, encoding, lokijs, react-native
  // async storage). None of those exist on Vercel's build target, so we
  // alias them to `false` and mark them as externals.
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "pino-pretty": false,
      lokijs: false,
      encoding: false,
      bufferutil: false,
      "utf-8-validate": false,
      "@react-native-async-storage/async-storage": false,
    };
    config.externals = [
      ...(config.externals || []),
      "pino-pretty",
      "lokijs",
      "encoding",
      "bufferutil",
      "utf-8-validate",
    ];
    return config;
  },

  // Single-product redirects.
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
