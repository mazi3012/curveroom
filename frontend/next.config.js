/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve.modules = [__dirname, 'node_modules', 'src']
    return config
  },
}

module.exports = nextConfig
