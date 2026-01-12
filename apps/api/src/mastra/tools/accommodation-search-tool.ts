/**
 * Accommodation Search Tool (OpenAI-only, Mastra-compliant)
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import OpenAI from 'openai';

const accommodationSearchInputSchema = z.object({
  destination: z.string().describe('目的地'),
  check_in: z.string().describe('チェックイン日（YYYY-MM-DD）'),
  check_out: z.string().describe('チェックアウト日（YYYY-MM-DD）'),
});

const accommodationSearchOutputSchema = z.object({
  options: z.array(
    z.object({
      name: z.string(),
      area: z.string(),
      price_per_night: z.number(),
      rating: z.number(),
      amenities: z.array(z.string()),
      location: z.object({ lat: z.number(), lng: z.number() }),
    })
  ),
  recommendation: z.string(),
  location_rationale: z.string(),
});

export function createAccommodationSearchTool(apiKey: string) {
  return createTool({
    id: 'accommodation-search',
    description: '目的地と日程に基づいて最適なホテルを検索します',
    inputSchema: accommodationSearchInputSchema,
    outputSchema: accommodationSearchOutputSchema,
    execute: async (inputData, context) => {
      const { destination, check_in, check_out } = inputData;
      const client = new OpenAI({ apiKey });

      const prompt = `あなたは宿泊施設検索の専門家です。以下の条件で最適なホテルを提案してください。

条件:
- 目的地: ${destination}
- チェックイン: ${check_in}
- チェックアウト: ${check_out}

要件:
1. 2-3個のホテルオプションを提案
2. 各ホテルには名前、エリア、1泊価格、評価、設備、緯度経度を含める
3. アクセスが良い場所を優先

以下のJSON形式で返してください：
{
  "options": [
    {
      "name": "ホテル名",
      "area": "エリア名",
      "price_per_night": 15000,
      "rating": 4.5,
      "amenities": ["WiFi", "朝食付き"],
      "location": {"lat": 31.24, "lng": 121.49}
    }
  ],
  "recommendation": "おすすめのホテルとその理由",
  "location_rationale": "このエリアを選んだ理由"
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
