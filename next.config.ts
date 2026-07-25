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
        // Google Books API — cover thumbnails
        protocol: 'https',
        hostname: 'books.google.com',
        pathname: '/**',
      },
      {
        // Google Books actual image CDN (most cover images are served from here)
        protocol: 'https',
        hostname: '*.googleusercontent.com',
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
      {
        // Local PC cover server (dev mode)
        protocol: 'http',
        hostname: 'localhost',
        port: '4000',
        pathname: '/covers/**',
      },
      {
        // Cloudflare Tunnel for PC cover server (production/remote access)
        protocol: 'https',
        hostname: '*.trycloudflare.com',
        pathname: '/covers/**',
      },
      {
        // Apple Books CDN — covers fetched from iTunes API
        protocol: 'https',
        hostname: '*.mzstatic.com',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
