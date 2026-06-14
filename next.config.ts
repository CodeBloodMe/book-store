import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        // OpenLibrary book covers via ISBN (e.g. https://covers.openlibrary.org/b/isbn/9780441013593-L.jpg)
        protocol: 'https',
        hostname: 'covers.openlibrary.org',
        pathname: '/b/**',
      },
      {
        // Any other CDN-hosted cover images stored directly in Supabase Storage
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/**',
      },
    ],
  },
};

export default nextConfig;
