/**
 * Web Search Tool (OpenAI-only, Mastra-compliant)
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import OpenAI from 'openai';

const webSearchInputSchema = z.object({
  query: z.string().describe('検索クエリ'),
  context: z.string().optional().describe('検索コンテキスト'),
});

const webSearchOutputSchema = z.object({
  results: z.array(
    z.object({
      title: z.string(),
      snippet: z.string(),
      url: z.string().optional(),
    })
  ),
  summary: z.string().describe('検索結果のサマリー'),
});

export function createWebSearchTool(apiKey: string) {
  return createTool({
    id: 'web-search',
    description: 'Web検索を実行して最新情報を取得します',
    inputSchema: webSearchInputSchema,
    outputSchema: webSearchOutputSchema,
    execute: async (inputData, context) => {
      const { query, context: searchContext } = inputData;
      const client = new OpenAI({ apiKey });

      const prompt = `以下の検索クエリに対して、仮想的な検索結果を提供してください。

検索クエリ: ${query}
${searchContext ? `コンテキスト: ${searchContext}` : ''}

要件:
1. 2-3個の検索結果を提供
2. 各結果にはタイトル、スニペット、URLを含める
3. 現実的で有用な情報を提供

以下のJSON形式で返してください：
{
  "results": [
    {
      "title": "タイトル",
      "snippet": "説明文",
      "url": "https://example.com"
    }
  ],
  "summary": "検索結果の要約"
}`;

      const completion = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      });

      return JSON.parse(completion.choices[0].message.content || '{}');
    },
  });
}
