/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@imagineer/config',
    '@imagineer/db',
    '@imagineer/domain',
    '@imagineer/providers',
    '@imagineer/shared',
  ],
  experimental: { instrumentationHook: false },
  images: { remotePatterns: [{ protocol: 'http', hostname: 'localhost' }] },
};

export default nextConfig;
