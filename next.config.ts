import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        // OpenLibrary book covers via ISBN or ID
        protocol: 'https',
        hostname: 'covers.openlibrary.org',
        pathname: '/b/**',
      },
      {
        // Google Books covers
        protocol: 'https',
        hostname: 'books.google.com',
        pathname: '/**',
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
