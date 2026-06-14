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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">

          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <span className="text-2xl">📚</span>
              <span className="font-extrabold text-lg gradient-text">BookSphere</span>
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
        </div>

        {/* Bottom bar */}
        <div
          className="mt-12 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs"
          style={{
            borderTop: '1px solid var(--border-subtle)',
            color: 'var(--text-muted)',
          }}
        >
          <p>© {new Date().getFullYear()} BookSphere. All rights reserved.</p>
          <p>Ratings aggregated from Goodreads, Amazon &amp; field experts.</p>
        </div>
      </div>
    </footer>
  );
}
