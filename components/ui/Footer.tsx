// ============================================================
// Footer — Site footer with links and branding.
// Server Component.
// ============================================================

import Link from 'next/link';

const footerLinks = {
  Explore: [
    { label: 'All Genres', href: '/#genres' },
    { label: 'Fiction Finder', href: '/fiction' },
    { label: 'Editor\'s Picks', href: '/#picks' },
    { label: 'Search Books', href: '/search' },
  ],
  Learning: [
    { label: 'Data Science', href: '/genres/data-science' },
    { label: 'Machine Learning', href: '/genres/machine-learning' },
    { label: 'Programming', href: '/genres/programming' },
    { label: 'Finance', href: '/genres/finance' },
  ],
  Fiction: [
    { label: 'Sci-Fi', href: '/genres/science-fiction' },
    { label: 'Fantasy', href: '/genres/fantasy' },
    { label: 'Comedy', href: '/genres/comedy-humor' },
    { label: 'Mystery', href: '/genres/mystery-thriller' },
  ],
};

export default function Footer() {
  return (
    <footer
      style={{
        background: 'var(--bg-primary)',
        borderTop: '1px solid var(--border-subtle)',
        marginTop: 'auto',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">

          {/* Brand */}
          <div className="col-span-2 md:col-span-3 lg:col-span-1">
            <Link href="/" className="flex items-center mb-6 inline-block">
              <div className="h-28 w-28 rounded-full border-2 border-gray-900 bg-[#f5f5f0] flex items-center justify-center overflow-hidden transition-transform hover:-translate-y-1" style={{ boxShadow: '4px 4px 0 #0a0a0a' }}>
                <img src="/logo.png" alt="ChapterOne Logo" className="h-full w-full object-contain mix-blend-multiply grayscale contrast-125 brightness-110 scale-125 pl-1" />
              </div>
              <span className="sr-only">ChapterOne</span>
            </Link>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              Expert-curated book recommendations for every interest, every level.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="text-xs font-bold uppercase tracking-widest mb-4"
                style={{ color: 'var(--text-muted)' }}>
                {title}
              </h4>
              <ul className="flex flex-col gap-2.5">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm hover:text-white transition-colors"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* About Me Column */}
          <div className="col-span-2 md:col-span-1 flex flex-col">
            <h4 className="text-xs font-bold uppercase tracking-widest mb-4"
              style={{ color: 'var(--text-muted)' }}>
              About Developer
            </h4>
            <div className="mb-2">
              <span className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
                KRISH KAUSHIK
              </span>
            </div>
            <p className="text-sm mb-4 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              I hope this project help you find best books
            </p>
            <div className="flex gap-4 items-center">
              <a
                href="https://www.linkedin.com/in/krishkaushik5178/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold hover:text-white transition-colors flex items-center gap-1 group"
                style={{ color: 'var(--text-secondary)' }}
              >
                LinkedIn <span className="group-hover:translate-x-1 transition-transform">→</span>
              </a>
              <a
                href="https://github.com/CodeBloodMe"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold hover:text-white transition-colors flex items-center gap-1 group"
                style={{ color: 'var(--text-secondary)' }}
              >
                GitHub <span className="group-hover:translate-x-1 transition-transform">→</span>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="mt-12 pt-6 flex flex-col sm:flex-row items-center justify-center text-center gap-3 text-xs"
          style={{
            borderTop: '1px solid var(--border-subtle)',
            color: 'var(--text-muted)',
          }}
        >
          <p>Ratings aggregated from Goodreads, Amazon &amp; field experts.</p>
        </div>
      </div>
    </footer>
  );
}
