import { Metadata } from 'next';
import BookWebClient from '@/components/features/BookWebClient';

export const metadata: Metadata = {
  title: 'BookWeb — Shortest Reading Path',
  description: 'Find the shortest reading path between any two books using our graph traversal engine.',
};

export default function BookWebPage() {
  return <BookWebClient />;
}
