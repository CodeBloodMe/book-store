import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireRole } from '@/lib/require-role';
import { fetchAuthorBioFromWikipedia } from '@/lib/external-books';
import { callOmniroute as callAnyAI } from '@/lib/omniroute';


export async function POST(request: Request) {
  try {
    const body: unknown = await request.json().catch(() => null);
    const authorName = body && typeof body === 'object' && !Array.isArray(body)
      ? (body as Record<string, unknown>).authorName
      : null;
    if (typeof authorName !== 'string' || authorName.trim().length < 1 || authorName.trim().length > 120) {
      return NextResponse.json({ error: 'Author name is required' }, { status: 400 });
    }
    const normalizedAuthorName = authorName.trim();

    // 1. Check if we already have this author in the DB
    const { data: existingAuthor } = await supabase
      .from('authors')
      .select('*')
      .eq('name', normalizedAuthorName)
      .maybeSingle();

    if (existingAuthor && existingAuthor.ai_bio) {
      return NextResponse.json({ success: true, data: existingAuthor });
    }

    const access = await requireRole(['Admin', 'User', 'Faculty', 'Student']);
    if (!access.ok) {
      return NextResponse.json({ error: 'Sign in to generate author information.' }, { status: access.status, headers: { 'Cache-Control': 'no-store' } });
    }

    // 2. If not, try Wikipedia first
    let aiBio = await fetchAuthorBioFromWikipedia(authorName);
    let aiStyle: string[] = [];

    if (!aiBio) {
      // 3. Fallback to Gemini to generate the bio and style analysis
      const prompt = `
You are an expert literary critic and biographer.
Generate a fascinating, insightful profile for the author "${authorName}".

Return ONLY a structured JSON object with the following keys:
- "ai_bio": A 2-3 paragraph biography focusing on their major themes, impact on literature, and background.
- "ai_style": An array of exactly 3 strings describing their unique writing style or hallmarks (e.g., ["Lyrical prose", "Deep character psychology", "Non-linear timelines"]).

Make it engaging and specific. If the author is extremely obscure or unknown, provide a best-effort generic profile noting their known works.
      `;

      const resultText = await callAnyAI(prompt, { temperature: 0.7, jsonMode: true });
      const aiData = JSON.parse(resultText);
      aiBio = aiData.ai_bio;
      aiStyle = aiData.ai_style;
    }

    // 4. Upsert into database
    const { data: upsertedAuthor, error: upsertError } = await supabaseAdmin
      .from('authors')
      .upsert(
        {
          name: normalizedAuthorName,
          ai_bio: aiBio,
          ai_style: aiStyle,
          ai_last_updated: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        { onConflict: 'name' }
      )
      .select()
      .single();

    if (upsertError) {
      console.error('Failed to save author to DB:', upsertError);
      return NextResponse.json({ error: 'Failed to save author' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: upsertedAuthor });
  } catch (error: any) {
    console.error('Generate Author Bio Error:', error);
    return NextResponse.json({ error: `Failed to generate bio: ${error?.message || String(error)}` }, { status: 500 });
  }
}
