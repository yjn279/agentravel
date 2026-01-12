/**
 * Route Optimization Tool (OpenAI-only, Mastra-compliant)
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import OpenAI from 'openai';

const routeOptimizationInputSchema = z.object({
  locations: z
    .array(
      z.object({
        name: z.string(),
        location: z.object({ lat: z.number(), lng: z.number() }),
        visit_duration_minutes: z.number(),
      })
    )
    .describe('訪問地点のリスト'),
  start_location: z.object({ lat: z.number(), lng: z.number() }).describe('出発地点'),
  end_location: z.object({ lat: z.number(), lng: z.number() }).describe('終了地点'),
  available_time_minutes: z.number().describe('利用可能時間（分）'),
});

const routeOptimizationOutputSchema = z.object({
  optimized_route: z.array(z.string()).describe('最適化された訪問順序'),
  total_duration_minutes: z.number().describe('総所要時間（分）'),
  rationale: z.string().describe('ルート選択の理由'),
});

export function createRouteOptimizationTool(apiKey: string) {
  return createTool({
    id: 'route-optimization',
    description: '観光スポットとレストランの訪問順序を最適化します',
    inputSchema: routeOptimizationInputSchema,
    outputSchema: routeOptimizationOutputSchema,
    execute: async (inputData, context) => {
      const { locations, start_location, end_location, available_time_minutes } = inputData;
      const client = new OpenAI({ apiKey });

      const locationsText = locations.map((l) => `${l.name} (${l.visit_duration_minutes}分)`).join(', ');

      const prompt = `あなたはルート最適化の専門家です。以下の条件で最適なルートを提案してください。

条件:
- 訪問地点: ${locationsText}
- 出発地点: (${start_location.lat}, ${start_location.lng})
- 終了地点: (${end_location.lat}, ${end_location.lng})
- 利用可能時間: ${available_time_minutes}分

要件:
1. 移動距離を最小化
2. 利用可能時間内に収める
3. 現実的な移動時間を考慮

以下のJSON形式で返してください：
{
  "optimized_route": ["地点1", "地点2", "地点3"],
  "total_duration_minutes": 300,
  "rationale": "ルート選択の理由"
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
