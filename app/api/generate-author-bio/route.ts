import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { GoogleGenAI } from '@google/genai';
import { fetchAuthorBioFromWikipedia } from '@/lib/external-books';

async function callAnyAI(prompt: string): Promise<string> {
  const providers = [
    {
      name: 'Groq',
      fn: async () => {
        if (!process.env.GROQ_API_KEY) throw new Error('No Groq API Key');
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: "json_object" },
            temperature: 0.7,
          }),
        });
        if (!res.ok) throw new Error(`Groq failed: ${res.statusText}`);
        const data = await res.json();
        return data.choices[0].message.content;
      }
    },
    {
      name: 'Gemini',
      fn: async () => {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
        let retries = 3;
        while (retries > 0) {
          try {
            const response = await ai.models.generateContent({
              model: 'gemini-2.0-flash',
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
              await new Promise(resolve => setTimeout(resolve, 7000));
            } else {
              throw err;
            }
          }
        }
        throw new Error('Failed to call Gemini after retries');
      }
    }
  ];

  let lastError: any = null;
  for (const provider of providers) {
    try {
      const result = await provider.fn();
      if (result) return result;
    } catch (err) {
      console.warn(`[Author Bio] ${provider.name} failed:`, err);
      lastError = err;
    }
  }
  throw new Error(`All AI providers failed. Last error: ${lastError?.message || 'Unknown'}`);
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

      const resultText = await callAnyAI(prompt);
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
