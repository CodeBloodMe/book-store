import { GoogleGenAI } from '@google/genai';

export interface OmnirouteOptions {
  temperature?: number;
  jsonMode?: boolean;
}

/**
 * Tries all AI providers one by one until one succeeds.
 * This makes the AI engine extremely resilient and uses free APIs!
 */
export async function callOmniroute(prompt: string, options: OmnirouteOptions = {}): Promise<string> {
  const temperature = options.temperature ?? 0.7;
  const providers = [
    { name: 'Groq', fn: () => callGroq(prompt, temperature, options.jsonMode) },
    { name: 'Gemini', fn: () => callGemini(prompt, temperature, options.jsonMode) },
    { name: 'OpenAI', fn: () => callOpenAI(prompt, temperature, options.jsonMode) },
  ];
  
  let lastError: Error | null = null;
  
  for (const provider of providers) {
    try {
      console.log(`[Omniroute] Trying ${provider.name}...`);
      const result = await provider.fn();
      if (result) {
        console.log(`[Omniroute] ✅ Success with ${provider.name}`);
        return result; 
      }
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[Omniroute] ❌ ${provider.name} failed:`, lastError.message);
    }
  }
  
  throw new Error(`All AI providers failed. Last Error: ${lastError?.message}`);
}

async function callGroq(prompt: string, temperature: number, jsonMode?: boolean): Promise<string> {
  if (!process.env.GROQ_API_KEY) throw new Error('No Groq API Key');
  const body: any = {
    model: 'qwen/qwen3.8-27b',
    messages: [{ role: 'user', content: prompt }],
    temperature,
  };
  if (jsonMode) {
    body.response_format = { type: 'json_object' };
  }
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Groq failed: ${res.statusText}`);
  const data = await res.json();
  return data.choices[0].message.content;
}

async function callGemini(prompt: string, temperature: number, jsonMode?: boolean): Promise<string> {
  if (!process.env.GEMINI_API_KEY) throw new Error('No Gemini API Key');
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const config: any = { temperature };
  if (jsonMode) {
    config.responseMimeType = 'application/json';
  }
  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config,
  });
  const text = response.text ?? '';
  if (!text) throw new Error('Gemini returned empty response');
  return text;
}

async function callOpenAI(prompt: string, temperature: number, jsonMode?: boolean): Promise<string> {
  if (!process.env.OPENAI_API_KEY) throw new Error('No OpenAI API Key');
  const body: any = {
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature,
  };
  if (jsonMode) {
    body.response_format = { type: 'json_object' };
  }
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`OpenAI failed: ${res.statusText}`);
  const data = await res.json();
  return data.choices[0].message.content;
}
