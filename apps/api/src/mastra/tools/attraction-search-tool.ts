/**
 * Attraction Search Tool (OpenAI-only, Mastra-compliant)
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import OpenAI from 'openai';

const attractionSearchInputSchema = z.object({
  destination: z.string().describe('目的地'),
  area: z.string().describe('エリア名'),
  theme: z.string().describe('テーマ'),
  available_hours: z.number().describe('利用可能時間（時間）'),
  date: z.string().describe('訪問日（YYYY-MM-DD）'),
});

const attractionSearchOutputSchema = z.object({
  attractions: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      visit_duration_minutes: z.number(),
      location: z.object({ lat: z.number(), lng: z.number() }),
      address: z.string(),
      business_hours: z.string(),
      entry_fee: z.number(),
      rating: z.number(),
    })
  ),
  summary: z.string(),
  tips: z.array(z.string()),
});

export function createAttractionSearchTool(apiKey: string) {
  return createTool({
    id: 'attraction-search',
    description: 'エリアとテーマに基づいて観光スポットを検索します',
    inputSchema: attractionSearchInputSchema,
    outputSchema: attractionSearchOutputSchema,
    execute: async (inputData, context) => {
      const { destination, area, theme, available_hours, date } = inputData;
      const client = new OpenAI({ apiKey });

      const prompt = `あなたは観光スポット検索の専門家です。以下の条件で観光スポットを提案してください。

条件:
- 目的地: ${destination}
- エリア: ${area}
- テーマ: ${theme}
- 利用可能時間: ${available_hours}時間
- 日付: ${date}

要件:
1. 4-6個の観光スポットを提案
2. 各スポットには名前、説明、滞在時間、緯度経度、住所、営業時間、入場料、評価を含める
3. 利用可能時間内に回れる現実的な数

以下のJSON形式で返してください：
{
  "attractions": [
    {
      "name": "スポット名",
      "description": "簡潔な説明",
      "visit_duration_minutes": 90,
      "location": {"lat": 31.24, "lng": 121.49},
      "address": "住所",
      "business_hours": "9:00-17:00",
      "entry_fee": 500,
      "rating": 4.5
    }
  ],
  "summary": "このエリアの特徴（2-3文）",
  "tips": ["アドバイス1", "アドバイス2"]
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
