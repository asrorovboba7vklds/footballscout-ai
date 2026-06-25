import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Увеличиваем лимит тела Server Actions для передачи base64-кадров
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
};

export default nextConfig;
