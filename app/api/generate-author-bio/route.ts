import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { GoogleGenAI } from '@google/genai';

async function callGemini(prompt: string): Promise<string> {
  if (!process.env.GEMINI_API_KEY) throw new Error('No Gemini API Key');
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  let retries = 3;
  while (retries > 0) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          responseMimeType: 'application/json',
          temperature: 0.7,
        }
      });
      const text = response.text ?? '';
      if (!text) throw new Error('Gemini returned empty response');
      return text;
    } catch (err: any) {
      if (err?.status === 429 || err?.message?.includes('429')) {
        retries--;
        if (retries === 0) throw err;
        // Wait 7 seconds before retrying
        await new Promise(resolve => setTimeout(resolve, 7000));
      } else {
        throw err;
      }
    }
  }
  throw new Error('Failed to call Gemini after retries');
}

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

    // 2. If not, ask Gemini to generate the bio and style analysis
    const prompt = `
You are an expert literary critic and biographer.
Generate a fascinating, insightful profile for the author "${authorName}".

Return ONLY a structured JSON object with the following keys:
- "ai_bio": A 2-3 paragraph biography focusing on their major themes, impact on literature, and background.
- "ai_style": An array of exactly 3 strings describing their unique writing style or hallmarks (e.g., ["Lyrical prose", "Deep character psychology", "Non-linear timelines"]).

Make it engaging and specific. If the author is extremely obscure or unknown, provide a best-effort generic profile noting their known works.
    `;

    const resultText = await callGemini(prompt);
    const aiData = JSON.parse(resultText);

    // 3. Upsert into database
    const { data: upsertedAuthor, error: upsertError } = await supabase
      .from('authors')
      .upsert(
        {
          name: authorName, // Use the provided casing
          ai_bio: aiData.ai_bio,
          ai_style: aiData.ai_style,
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
