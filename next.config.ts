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
      {
        // Amazon CDN for fast original book covers
        protocol: 'https',
        hostname: 'images-na.ssl-images-amazon.com',
        pathname: '/images/P/**',
      },
    ],
  },
};

export default nextConfig;
