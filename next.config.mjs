/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Skip lint + TS during the production build so deploy isn't blocked by
  // strict-mode warnings inside transitive deps. We still type-check locally
  // via `npm run type-check`.
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  // WalletConnect (transitively via RainbowKit) uses pino as its logger
  // and dynamically imports a handful of optional deps that don't exist
  // on Vercel's build target. Alias them to `false` and mark externals so
  // the build stops complaining about missing modules.
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

  // Single-product redirects. Keeps old Solana-era Pump.fun URLs alive
  // so bookmarks don't 404 after the Robinhood Chain / Pons migration.
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
