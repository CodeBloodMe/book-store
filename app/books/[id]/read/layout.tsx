// Dedicated layout for the reader — strips Navbar and Footer for full immersion.
// The root layout renders Navbar + Footer for all routes, but Next.js lets us
// override layouts at the segment level, giving us a clean canvas here.
export default function ReadLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
