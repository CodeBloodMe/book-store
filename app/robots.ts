import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://book-store-eight-zeta.vercel.app';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/login', '/my-books'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
