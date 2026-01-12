/**
 * Restaurant Search Tool (OpenAI-only, Mastra-compliant)
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import OpenAI from 'openai';

const restaurantSearchInputSchema = z.object({
  destination: z.string().describe('目的地'),
  area: z.string().describe('エリア名'),
  meal_type: z.enum(['lunch', 'dinner']).describe('食事タイプ'),
  date: z.string().describe('訪問日（YYYY-MM-DD）'),
});

const restaurantSearchOutputSchema = z.object({
  restaurants: z.array(
    z.object({
      name: z.string(),
      cuisine: z.string(),
      description: z.string(),
      location: z.object({ lat: z.number(), lng: z.number() }),
      address: z.string(),
      price_range: z.string(),
      business_hours: z.string(),
      rating: z.number(),
    })
  ),
  recommendation: z.string(),
  local_specialties: z.array(z.string()),
});

export function createRestaurantSearchTool(apiKey: string) {
  return createTool({
    id: 'restaurant-search',
    description: 'エリアと食事タイプに基づいてレストランを検索します',
    inputSchema: restaurantSearchInputSchema,
    outputSchema: restaurantSearchOutputSchema,
    execute: async (inputData, context) => {
      const { destination, area, meal_type, date } = inputData;
      const client = new OpenAI({ apiKey });

      const mealText = meal_type === 'lunch' ? 'ランチ' : 'ディナー';

      const prompt = `あなたはレストラン検索の専門家です。以下の条件で最適なレストランを提案してください。

条件:
- 目的地: ${destination}
- エリア: ${area}
- 食事タイプ: ${mealText}
- 日付: ${date}

要件:
1. 1-2個のレストランを提案
2. 各レストランには名前、料理ジャンル、説明、緯度経度、住所、価格帯、営業時間、評価を含める
3. 地元の名物料理や人気店を優先

以下のJSON形式で返してください：
{
  "restaurants": [
    {
      "name": "レストラン名",
      "cuisine": "料理ジャンル",
      "description": "説明",
      "location": {"lat": 31.24, "lng": 121.49},
      "address": "住所",
      "price_range": "¥¥",
      "business_hours": "11:00-14:00, 17:00-22:00",
      "rating": 4.5
    }
  ],
  "recommendation": "おすすめのレストランとその理由",
  "local_specialties": ["名物料理1", "名物料理2"]
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
