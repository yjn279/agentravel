/**
 * Gemini Text Generation Tool
 *
 * Provides a wrapper around Gemini 2.5 Flash for text generation.
 * Used by agents for general text tasks, travel planning, and information gathering.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

export interface GeminiTextInput {
  prompt: string;
  temperature?: number;
  max_tokens?: number;
}

export interface GeminiTextOutput {
  text: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

/**
 * Generate text using Gemini 2.5 Flash
 */
export async function generateText(
  input: GeminiTextInput,
  apiKey: string
): Promise<GeminiTextOutput> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      temperature: input.temperature ?? 0.7,
      maxOutputTokens: input.max_tokens ?? 8192,
    },
  });

  try {
    const result = await model.generateContent(input.prompt);
    const response = result.response;
    const text = response.text();

    return {
      text,
      usage: {
        // Note: Gemini API doesn't always provide usage info
        input_tokens: 0,
        output_tokens: 0,
      },
    };
  } catch (error: any) {
    console.error('Gemini text generation error:', error);
    throw new Error(`Gemini API error: ${error.message || error}`);
  }
}

/**
 * Generate structured JSON output using Gemini 2.5 Flash
 */
export async function generateJSON<T = any>(
  prompt: string,
  apiKey: string
): Promise<T> {
  const fullPrompt = `${prompt}

重要: 必ずJSON形式で返してください。JSON以外のテキストは含めないでください。`;

  const result = await generateText({ prompt: fullPrompt }, apiKey);

  try {
    // Extract JSON from markdown code blocks if present
    let jsonText = result.text.trim();

    // Remove markdown code block markers
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    return JSON.parse(jsonText) as T;
  } catch (error) {
    console.error('JSON parsing error:', error);
    console.error('Raw response:', result.text);
    throw new Error('Failed to parse JSON response from Gemini');
  }
}
