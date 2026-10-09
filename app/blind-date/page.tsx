import { Metadata } from 'next';
import BlindDateClient from '@/components/features/BlindDateClient';

export const metadata: Metadata = {
  title: 'Blind Date With a Book — ChapterOne',
  description: 'Take the quiz and let our algorithm find your perfect book match. No covers. No titles. Just pure vibes.',
};

export default function BlindDatePage() {
  return <BlindDateClient />;
}
