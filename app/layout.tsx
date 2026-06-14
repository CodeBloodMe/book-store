import type { Metadata } from 'next';
import { Inter, Playfair_Display, Bebas_Neue } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/ui/Navbar';
import Footer from '@/components/ui/Footer';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
});

const bebas = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-bebas',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'ChapterOne — Expert Book Recommendations',
    template: '%s | ChapterOne',
  },
  description:
    'Discover the best books in any genre — curated by field experts, ' +
    'ranked by real reviews. From Data Science to Fantasy, find exactly what to read next.',
  keywords: ['book recommendations', 'best books', 'reading list', 'data science books', 'fiction books'],
  authors: [{ name: 'ChapterOne' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://chapterone.app',
    siteName: 'ChapterOne',
    title: 'ChapterOne — Expert Book Recommendations',
    description: 'Discover the best books in any genre, curated by experts.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable} ${bebas.variable}`}>
      <body
        className="min-h-screen flex flex-col antialiased bg-white text-gray-900"
      >
        <Navbar />
        <main className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
