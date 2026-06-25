import { GoogleGenAI } from '@google/genai';

const VALID_SLUGS = [
  'horror', 'comedy-humor', 'fantasy', 'science-fiction',
  'mystery-thriller', 'romance', 'historical-fiction',
  'literary-fiction', 'graphic-novels'
];

export async function categorizeBookGenres(title: string, author: string, description: string | null = null): Promise<string[]> {
  const prompt = `
You are a master librarian. Given a book, classify it into ONE OR MORE of the following genres.
Valid genres: ${VALID_SLUGS.join(', ')}

Book Title: ${title}
Author: ${author}
${description ? `Description: ${description}` : ''}

Rules:
1. ONLY return a comma-separated list of the valid genres.
2. DO NOT return any other text.
3. If it is both Horror and Sci-Fi, return "horror, science-fiction".
4. If it doesn't fit any exactly, return the closest match.
`;

  try {
    // Try Groq via raw fetch (Llama 3 is blazing fast)
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 50
      })
    });

    if (!res.ok) throw new Error(`Groq failed: ${res.statusText}`);
    const data = await res.json();
    return parseGenres(data.choices[0].message.content);
    
  } catch (err) {
    console.warn('[AI Categorize] Groq failed, falling back to Gemini', err);
    try {
      // Fallback to Gemini
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      return parseGenres(response.text || '');
    } catch (fallbackErr) {
      console.warn('[AI Categorize] Gemini failed, falling back to OpenAI', fallbackErr);
      try {
        const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1,
            max_tokens: 50
          })
        });
        if (!openaiRes.ok) throw new Error('OpenAI failed');
        const openaiData = await openaiRes.json();
        return parseGenres(openaiData.choices[0].message.content);
      } catch (openAiErr) {
        console.warn('[AI Categorize] All AI providers failed', openAiErr);
        return [];
      }
    }
  }
}

function parseGenres(text: string): string[] {
  const words = text.toLowerCase().replace(/[^a-z0-9-,\s]/g, '').split(/[,\s]+/);
  const matched = new Set<string>();
  
  for (const word of words) {
    if (VALID_SLUGS.includes(word)) {
      matched.add(word);
    }
  }

  // Fallback if the AI returned something weird
  if (matched.size === 0) {
    for (const valid of VALID_SLUGS) {
      if (text.toLowerCase().includes(valid)) {
        matched.add(valid);
      }
    }
  }

  return Array.from(matched);
}

export async function getAIBookRecommendations(genres: string[], lengthCategory: string | null): Promise<Array<{ title: string, author: string, pages: number }>> {
  const prompt = `
You are a master librarian. I need you to find 3 real, published, well-known books that perfectly fit the following criteria:
Genres: ${genres.join(', ')}
${lengthCategory ? `Length: ${lengthCategory} (Quick Read is <300 pages, Standard is 300-500, Epic is >500 pages)` : ''}

Return ONLY a valid JSON array of objects with the following keys. Do not return markdown, just the JSON:
[
  { "title": "string", "author": "string", "pages": number }
]
`;

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        response_format: { type: "json_object" } // llama3 doesn't fully support json_object sometimes, so we parse manually
      })
    });

    if (!res.ok) throw new Error('Groq failed');
    const data = await res.json();
    const text = data.choices[0].message.content;
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      return JSON.parse(match[0]);
    }
    return JSON.parse(text);
  } catch (err) {
    console.warn('[AI Search] Groq failed, falling back to Gemini', err);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      const text = response.text || '';
      const match = text.match(/\[[\s\S]*\]/);
      if (match) return JSON.parse(match[0]);
      return JSON.parse(text);
    } catch (fallbackErr) {
      console.warn('[AI Search] Gemini failed, falling back to OpenAI', fallbackErr);
      try {
        const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3,
            response_format: { type: "json_object" }
          })
        });
        if (!openaiRes.ok) {
          const text = await openaiRes.text();
          throw new Error('OpenAI failed: ' + text);
        }
        const openaiData = await openaiRes.json();
        const text = openaiData.choices[0].message.content;
        const match = text.match(/\[[\s\S]*\]/);
        if (match) return JSON.parse(match[0]);
        return JSON.parse(text);
      } catch (openAiErr) {
        console.warn('[AI Search] All AI providers failed', openAiErr);
        return [];
      }
    }
  }
}

