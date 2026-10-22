import { GoogleGenAI } from '@google/genai';

export interface OmnirouteOptions {
  temperature?: number;
  jsonMode?: boolean;
}

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }> | null;
    };
  }>;
  error?: { message?: string } | string;
};

/**
 * Tries all AI providers one by one until one succeeds.
 * This makes the AI engine extremely resilient and uses free APIs!
 */
export async function callOmniroute(prompt: string, options: OmnirouteOptions = {}): Promise<string> {
  const temperature = options.temperature ?? 0.7;
  const providers = [
    ...(process.env.OMNIROUTE_BASE_URL
      ? [{ name: 'OmniRoute', fn: () => callOmniRouteGateway(prompt, temperature, options.jsonMode) }]
      : []),
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

async function callOmniRouteGateway(prompt: string, temperature: number, jsonMode?: boolean): Promise<string> {
  const configuredBaseUrl = process.env.OMNIROUTE_BASE_URL?.trim();
  if (!configuredBaseUrl) throw new Error('OMNIROUTE_BASE_URL is not configured');

  let baseUrl: URL;
  try {
    baseUrl = new URL(configuredBaseUrl);
  } catch {
    throw new Error('OMNIROUTE_BASE_URL must be a valid absolute URL');
  }
  if (baseUrl.protocol !== 'http:' && baseUrl.protocol !== 'https:') {
    throw new Error('OMNIROUTE_BASE_URL must use HTTP or HTTPS');
  }

  const endpoint = `${configuredBaseUrl.replace(/\/+$/, '')}/chat/completions`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (process.env.OMNIROUTE_API_KEY) {
    headers.Authorization = `Bearer ${process.env.OMNIROUTE_API_KEY}`;
  }

  const body: Record<string, unknown> = {
    model: process.env.OMNIROUTE_MODEL?.trim() || 'auto',
    messages: [{ role: 'user', content: prompt }],
    temperature,
  };
  if (jsonMode) body.response_format = { type: 'json_object' };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  });
  const data = await response.json().catch(() => null) as ChatCompletionResponse | null;
  if (!response.ok) {
    const providerMessage = typeof data?.error === 'string'
      ? data.error
      : data?.error?.message;
    throw new Error(`OmniRoute failed (${response.status}): ${providerMessage || response.statusText}`);
  }

  const content = data?.choices?.[0]?.message?.content;
  const text = typeof content === 'string'
    ? content
    : Array.isArray(content)
      ? content.map((part) => part.text ?? '').join('')
      : '';
  if (!text.trim()) throw new Error('OmniRoute returned an empty response');
  return text;
}

async function callGroq(prompt: string, temperature: number, jsonMode?: boolean): Promise<string> {
  if (!process.env.GROQ_API_KEY) throw new Error('No Groq API Key');
  const body: Record<string, unknown> = {
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
  const config: Record<string, unknown> = { temperature };
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
  const body: Record<string, unknown> = {
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
