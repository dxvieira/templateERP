
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Otimização de Imagens e Performance
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'placehold.co' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'picsum.photos' },
    ],
  },
  // Em Next.js 15, allowedDevOrigins é uma propriedade de nível superior
  allowedDevOrigins: [
    '6000-firebase-studio-1770637200745.cluster-gizzoza7hzhfyxzo5d76y3flkw.cloudworkstations.dev',
    '*.cloudworkstations.dev'
  ],
};

export default nextConfig;
