/**
 * Distance Calculation Tool (OpenAI-only, Mastra-compliant)
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import OpenAI from 'openai';

const distanceCalculationInputSchema = z.object({
  from_location: z.object({ lat: z.number(), lng: z.number() }).describe('出発地点'),
  to_location: z.object({ lat: z.number(), lng: z.number() }).describe('到着地点'),
  mode: z.enum(['walking', 'driving', 'transit']).default('walking').describe('移動手段'),
});

const distanceCalculationOutputSchema = z.object({
  distance_km: z.number().describe('距離（km）'),
  duration_minutes: z.number().describe('所要時間（分）'),
  mode: z.string().describe('移動手段'),
});

export function createDistanceCalculationTool(apiKey: string) {
  return createTool({
    id: 'distance-calculation',
    description: '2地点間の距離と移動時間を推定します',
    inputSchema: distanceCalculationInputSchema,
    outputSchema: distanceCalculationOutputSchema,
    execute: async (inputData, context) => {
      const { from_location, to_location, mode } = inputData;
      const client = new OpenAI({ apiKey });

      const prompt = `以下の2地点間の距離と移動時間を推定してください。

出発地点: (${from_location.lat}, ${from_location.lng})
到着地点: (${to_location.lat}, ${to_location.lng})
移動手段: ${mode}

現実的な値を推定してください。

以下のJSON形式で返してください：
{
  "distance_km": 2.5,
  "duration_minutes": 30,
  "mode": "${mode}"
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
