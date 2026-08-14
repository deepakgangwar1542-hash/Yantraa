/** @type {import('next').NextConfig} */
// Optional: run a second dev server on the same checkout without sharing the
// .next lockfile (e.g. another preview thread already runs `next dev` here).
// Default behaviour is unchanged: plain `next dev` uses `.next`.
const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || '.next',
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
}

export default nextConfig
