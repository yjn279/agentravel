/**
 * OpenAI Text Generation Tool
 *
 * Provides a wrapper around OpenAI GPT models for text generation.
 * Used as an alternative to Gemini for testing and production.
 */

import OpenAI from 'openai';

export interface OpenAITextInput {
  prompt: string;
  temperature?: number;
  max_tokens?: number;
}

export interface OpenAITextOutput {
  text: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

/**
 * Generate text using OpenAI GPT models
 */
export async function generateText(
  input: OpenAITextInput,
  apiKey: string,
  model: string = 'gpt-5-mini-2025-08-07'
): Promise<OpenAITextOutput> {
  const client = new OpenAI({ apiKey });

  try {
    // Build completion options
    const completionOptions: any = {
      model,
      messages: [{ role: 'user', content: input.prompt }],
      max_completion_tokens: input.max_tokens ?? 8192,
    };

    // Only add temperature if explicitly provided and is 1 (GPT-5 Mini only supports default value)
    if (input.temperature !== undefined && input.temperature === 1) {
      completionOptions.temperature = 1;
    }

    const completion = await client.chat.completions.create(completionOptions);

    const text = completion.choices[0].message.content || '';

    return {
      text,
      usage: {
        input_tokens: completion.usage?.prompt_tokens || 0,
        output_tokens: completion.usage?.completion_tokens || 0,
      },
    };
  } catch (error: any) {
    console.error('OpenAI text generation error:', error);
    throw new Error(`OpenAI API error: ${error.message || error}`);
  }
}

/**
 * Generate structured JSON output using OpenAI
 */
export async function generateJSON<T = any>(
  prompt: string,
  apiKey: string,
  model: string = 'gpt-5-mini-2025-08-07'
): Promise<T> {
  const fullPrompt = `${prompt}

重要: 必ずJSON形式で返してください。JSON以外のテキストは含めないでください。`;

  const result = await generateText({ prompt: fullPrompt }, apiKey, model);

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
    throw new Error('Failed to parse JSON response from OpenAI');
  }
}
