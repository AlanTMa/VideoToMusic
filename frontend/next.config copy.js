/** @type {import('next').NextConfig} */
const nextConfig = {
  // Core settings
  reactStrictMode: true,
  
  // Disable source maps in production for smaller builds
  productionBrowserSourceMaps: false,

  // Image optimization
  images: {
    formats: ['image/webp'],
    domains: [], // Add external image domains if needed
  },

  // Experimental features that are safe and useful
  experimental: {
    // Optimize imports for these packages
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-dialog',
      '@radix-ui/react-tabs',
    ],
  },

  // Module imports optimization (safe version)
  modularizeImports: {
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{member}}',
    },
    'lodash': {
      transform: 'lodash/{{member}}',
    },
  },

  // Transpile packages that might have issues
  transpilePackages: ['recharts'],

  // Development experience improvements
  typescript: {
    // Set to true in production
    ignoreBuildErrors: process.env.NODE_ENV === 'development',
  },
  
  eslint: {
    // Set to true in production
    ignoreDuringBuilds: process.env.NODE_ENV === 'development',
  },

  // Simple webpack config for caching only
  webpack: (config, { dev }) => {
    // Enable filesystem cache in development
    if (dev) {
      config.cache = {
        type: 'filesystem',
      };
    }
    
    return config;
  },
}

module.exports = nextConfig