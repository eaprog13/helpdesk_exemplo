/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false, // não expor "X-Powered-By: Next.js"
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
