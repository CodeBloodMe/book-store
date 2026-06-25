import { notFound } from 'next/navigation';
import { getBookById } from '@/lib/queries';
import EpubReaderClient from '@/components/EpubReaderClient';
import './reader.css';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ReadBookPage({ params }: PageProps) {
  const { id } = await params;
  const book = await getBookById(id);

  if (!book || !book.free_reading_url) {
    notFound();
  }

  return (
    <EpubReaderClient
      url={book.free_reading_url}
      title={book.title}
      author={book.author}
      coverUrl={book.cover_image_url}
      genreColor={book.genres?.color}
      bookId={book.id}
    />
  );
}
