import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { isCronRequest } from '@/lib/security/request-auth';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!isCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  }
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'Embedding service is not configured.' }, { status: 503 });
  }

  try {
    const { data: books, error } = await supabaseAdmin
      .from('books')
      .select('id, title, author, description, genres(name), embedding_model')
      .or('embedding.is.null,embedding_model.is.null,embedding_model.neq.gemini-embedding-001')
      .order('created_at', { ascending: true })
      .limit(10);
    if (error) throw error;

    if (!books?.length) {
      return NextResponse.json({ success: true, processed: 0, failed: 0, message: 'No books need embeddings.' }, { headers: { 'Cache-Control': 'no-store' } });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    let processed = 0;
    const failures: string[] = [];

    for (const book of books) {
      try {
        const genreName = Array.isArray(book.genres)
          ? book.genres[0]?.name ?? 'Unknown genre'
          : (book.genres as { name?: string } | null)?.name ?? 'Unknown genre';
        const content = [
          `Title: ${book.title}`,
          `Author: ${book.author ?? 'Unknown author'}`,
          `Genre: ${genreName}`,
          `Description: ${book.description ?? ''}`,
        ].join('\n');

        const response = await ai.models.embedContent({
          model: 'gemini-embedding-001',
          contents: content,
          config: { outputDimensionality: 768, taskType: 'RETRIEVAL_DOCUMENT' },
        });
        const vector = response.embeddings?.[0]?.values;
        if (!vector || vector.length !== 768 || vector.some((value) => !Number.isFinite(value))) {
          throw new Error('Embedding was missing, non-finite, or had an unexpected dimension.');
        }

        const { error: updateError } = await supabaseAdmin
          .from('books')
          .update({ embedding: vector, embedding_model: 'gemini-embedding-001' })
          .eq('id', book.id);
        if (updateError) throw updateError;
        processed++;
      } catch (error) {
        console.error(`[cron/embed] Failed for book ${book.id}:`, error);
        failures.push(book.id);
      }

      // Keep within provider limits without sleeping unnecessarily after the last item.
      if (processed + failures.length < books.length) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    return NextResponse.json({
      success: failures.length === 0,
      processed,
      failed: failures.length,
      failedBookIds: failures,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[cron/embed] Failed to load/process embedding batch:', error);
    return NextResponse.json({ error: 'Embedding batch failed.' }, { status: 500 });
  }
}
