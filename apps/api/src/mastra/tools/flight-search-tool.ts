/**
 * Flight Search Tool (OpenAI-only, Mastra-compliant)
 *
 * Searches for flight options between origin and destination using OpenAI GPT-4o-mini.
 * Properly defined with createTool() and Zod schemas.
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import OpenAI from 'openai';

// Input schema
const flightSearchInputSchema = z.object({
  origin: z.string().describe('出発地（都市名または空港コード）'),
  destination: z.string().describe('目的地（都市名または空港コード）'),
  start_date: z.string().describe('出発日（YYYY-MM-DD形式）'),
  end_date: z.string().describe('帰着日（YYYY-MM-DD形式）'),
  passengers: z.number().optional().default(1).describe('乗客数'),
});

// Output schema
const flightSearchOutputSchema = z.object({
  options: z.array(
    z.object({
      outbound: z.string().describe('往路フライト情報'),
      return: z.string().describe('復路フライト情報'),
      airline: z.string().describe('航空会社名'),
      price: z.number().describe('概算価格（円）'),
      duration_hours: z.number().describe('フライト時間（時間）'),
    })
  ),
  recommendations: z.string().describe('おすすめの理由や注意事項'),
});

export function createFlightSearchTool(apiKey: string) {
  return createTool({
    id: 'flight-search',
    description:
      '出発地と目的地間のフライトオプションを検索します。実際の航空会社と現実的なフライト時間・価格を提案します。',
    inputSchema: flightSearchInputSchema,
    outputSchema: flightSearchOutputSchema,
    execute: async (inputData, context) => {
      const { origin, destination, start_date, end_date, passengers = 1 } = inputData;

      const client = new OpenAI({ apiKey });

      const prompt = `あなたはフライト検索の専門家です。以下の条件でフライトオプションを提案してください。

条件:
- 出発地: ${origin}
- 目的地: ${destination}
- 出発日（往路）: ${start_date}
- 帰着日（復路）: ${end_date}
- 乗客数: ${passengers}名

要件:
1. 2-3個のフライトオプションを提案
2. 各オプションには航空会社、フライト時間、概算価格を含める
3. 直行便を優先
4. 価格は日本円で表示
5. 実際に存在する航空会社と現実的な価格を使用

以下のJSON形式で返してください：
{
  "options": [
    {
      "outbound": "ANA NH919 10:00-12:30",
      "return": "ANA NH920 14:00-18:00",
      "airline": "ANA（全日空）",
      "price": 35000,
      "duration_hours": 2.5
    }
  ],
  "recommendations": "おすすめの理由や注意事項（1-2文）"
}`;

      const completion = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      });

      const result = JSON.parse(completion.choices[0].message.content || '{}');
      return result;
    },
  });
}
