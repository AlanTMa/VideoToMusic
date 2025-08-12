/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable TypeScript strict mode
  typescript: {
    ignoreBuildErrors: false,
  },

  // ESLint configuration
  eslint: {
    ignoreDuringBuilds: false,
  },

  // Environment variables
  env: {
    NEXT_PUBLIC_APP_NAME: 'MusicPairer',
    NEXT_PUBLIC_APP_VERSION: '1.0.0',
  },

  // API routes configuration
  async rewrites() {
    return [
      {
        source: '/api/backend/:path*',
        destination: `${process.env.BACKEND_URL || 'http://localhost:8000'}/api/:path*`,
      },
    ]
  },

  // Headers configuration for security and CORS
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ]
  },

  // Image optimization
  images: {
    domains: ['localhost'],
    formats: ['image/webp', 'image/avif'],
  },

  // Webpack configuration for audio/video handling
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Handle audio files
    config.module.rules.push({
      test: /\.(mp3|wav|ogg|m4a)$/,
      type: 'asset/resource',
      generator: {
        filename: 'static/audio/[hash][ext]',
      },
    })

    // Handle MIDI files
    config.module.rules.push({
      test: /\.(mid|midi)$/,
      type: 'asset/resource',
      generator: {
        filename: 'static/midi/[hash][ext]',
      },
    })

    // Handle video files
    config.module.rules.push({
      test: /\.(mp4|webm|ogg|avi|mov)$/,
      type: 'asset/resource',
      generator: {
        filename: 'static/video/[hash][ext]',
      },
    })

    return config
  },

  // Performance optimizations
  poweredByHeader: false,
  compress: true,

  // Static file handling
  trailingSlash: false,

  // Output configuration for deployment
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,

  // Experimental features (for Next.js 14)
  experimental: {
    serverComponentsExternalPackages: ['@mui/material'],
  },
}

module.exports = nextConfig