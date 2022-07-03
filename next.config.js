/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: function (config, options) {
    if (!options.isServer) {
      config.resolve.fallback.fs = false;
    }
    return config;
  },  
}

module.exports = nextConfig
