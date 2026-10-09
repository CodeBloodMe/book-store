import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { GoogleGenAI } from '@google/genai';
import { fetchAuthorBioFromWikipedia } from '@/lib/external-books';
import { callOmniroute as callAnyAI } from '@/lib/omniroute';


export async function POST(request: Request) {
  try {
    const { authorName } = await request.json();
    if (!authorName) {
      return NextResponse.json({ error: 'Author name is required' }, { status: 400 });
    }

    // 1. Check if we already have this author in the DB
    const { data: existingAuthor } = await supabase
      .from('authors')
      .select('*')
      .ilike('name', authorName)
      .maybeSingle();

    if (existingAuthor && existingAuthor.ai_bio) {
      return NextResponse.json({ success: true, data: existingAuthor });
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
    const { data: upsertedAuthor, error: upsertError } = await supabase
      .from('authors')
      .upsert(
        {
          name: authorName, // Use the provided casing
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
