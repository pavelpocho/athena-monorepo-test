/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  typescript: {
    tsconfigPath: '../../tsconfig.json'
  }
}

module.exports = nextConfig
