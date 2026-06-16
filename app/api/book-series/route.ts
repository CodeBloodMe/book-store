import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { title, author } = await req.json();

    if (!title) {
      return NextResponse.json({ error: 'Missing title' }, { status: 400 });
    }

    const prompt = `You are a literature database expert. I am going to give you a book title and author.
Your job is to tell me if this book is part of a series, and if so, list all the books in that series in reading order.

Book Title: "${title}"
Author: "${author || 'Unknown'}"

Return ONLY a valid JSON object. No markdown, no explanations.
If the book is NOT part of a series (it is a standalone book), return EXACTLY:
{
  "hasSeries": false
}

If the book IS part of a series (e.g. Harry Potter, Lord of the Rings, Dune, A Song of Ice and Fire, etc.), return EXACTLY this structure:
{
  "hasSeries": true,
  "seriesName": "The actual name of the series",
  "books": [
    "Title of Book 1",
    "Title of Book 2",
    "Title of Book 3"
  ]
}

Include the queried book in the "books" array in its correct chronological reading position.`;

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
      }),
    });

    const aiRes = await res.json();
    const rawText = aiRes.choices?.[0]?.message?.content || '';
    
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid AI response');
    }

    const data = JSON.parse(jsonMatch[0]);
    return NextResponse.json(data);

  } catch (err: any) {
    console.error('Book Series API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
