import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'placehold.co' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
    ],
  },
  experimental: {
    serverActions: {
      allowedOrigins: [
        'localhost:9002',
        '*.cloudworkstations.dev',
        '*.cluster-gizzoza7hzhfyxzo5d76y3flkw.cloudworkstations.dev'
      ]
    }
  },
  // allowedDevOrigins deve estar no nível superior para autorizar recursos de dev via CORS
  allowedDevOrigins: [
    '6000-firebase-studio-1770637200745.cluster-gizzoza7hzhfyxzo5d76y3flkw.cloudworkstations.dev',
    '*.cloudworkstations.dev',
    '*.cluster-gizzoza7hzhfyxzo5d76y3flkw.cloudworkstations.dev'
  ]
};

export default nextConfig;
