import { env } from '../config/env.js';
import { AppError, aiError } from '../lib/errors.js';

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * One non-streaming call to any OpenAI-compatible Chat Completions API
 * (Groq, OpenRouter, Gemini's OpenAI endpoint, Ollama, OpenAI...).
 */
export async function complete(messages: LlmMessage[], opts: { maxTokens?: number; temperature?: number } = {}): Promise<string> {
  let res: Response;
  try {
    res = await fetch(`${env.AI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.AI_API_KEY}`,
        'Content-Type': 'application/json',
        'X-Title': 'Kanbot', // OpenRouter app attribution; ignored elsewhere
      },
      body: JSON.stringify({
        model: env.AI_MODEL,
        messages,
        max_tokens: opts.maxTokens ?? 1500,
        temperature: opts.temperature ?? 0.4,
      }),
      signal: AbortSignal.timeout(env.AI_TIMEOUT_MS),
    });
  } catch (err) {
    const timedOut = err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError');
    throw aiError(timedOut ? 'The AI took too long to answer. Try again.' : 'Could not reach the AI provider.');
  }

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) throw aiError('The AI provider rejected the API key (check AI_API_KEY).');
    if (res.status === 429) {
      throw new AppError(429, 'RATE_LIMITED', 'The AI provider rate limit was reached. Wait a moment and try again.');
    }
    if (res.status === 400 || res.status === 404) {
      throw aiError('The AI provider rejected the model or request. Check AI_MODEL and AI_BASE_URL.');
    }
    throw aiError('The AI provider is unavailable or returned an error. Try again shortly.');
  }

  let text: string;
  try {
    text = await res.text();
  } catch (err) {
    const timedOut = err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError');
    throw aiError(timedOut ? 'The AI took too long to answer. Try again.' : 'Could not reach the AI provider.');
  }

  try {
    const json: unknown = JSON.parse(text);
    if (json && typeof json === 'object' && 'choices' in json && Array.isArray(json.choices)) {
      const message = json.choices[0]?.message;
      if (message && typeof message === 'object' && 'content' in message && typeof message.content === 'string') {
        const content = message.content.trim();
        if (content) return content;
      }
    }
  } catch {
    throw aiError('The AI provider returned an invalid response. Try again.');
  }
  throw aiError('The AI provider returned an empty or invalid response. Try again.');
}

/** Pulls the first JSON object out of a reply (models love wrapping JSON in ```fences``` or prose). */
export function extractJson(reply: string): unknown {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(reply)?.[1];
  const candidate = fenced ?? reply;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end <= start) throw aiError('The AI answer was not in the expected format. Try again.');
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    throw aiError('The AI answer was not in the expected format. Try again.');
  }
}
