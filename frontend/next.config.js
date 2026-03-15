/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  experimental: { missingSuspenseWithCSRBailout: false },
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'https', hostname: '*.creatorlink.io' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
};
module.exports = nextConfig;
