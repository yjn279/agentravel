/**
 * Gemini Distance Estimation Tool
 *
 * Uses Gemini 2.5 Flash to estimate distances and travel times between locations.
 * This replaces the Google Maps Distance Matrix API.
 */

import { generateJSON } from './gemini-text';
import type { DistanceMatrixInput, DistanceMatrixResult, Location } from '@agentravel/shared/types';

/**
 * Estimate distance and travel time between two locations using AI
 */
export async function estimateDistance(
  input: DistanceMatrixInput,
  apiKey: string
): Promise<DistanceMatrixResult> {
  const modeText = {
    walking: '徒歩',
    transit: '公共交通機関',
    driving: '車',
  }[input.mode];

  const prompt = `2地点間の移動時間と距離を推定してください：

出発地: 緯度 ${input.origin.lat}, 経度 ${input.origin.lng}
到着地: 緯度 ${input.destination.lat}, 経度 ${input.destination.lng}
移動手段: ${modeText}

以下のJSON形式で返してください（JSON以外のテキストは含めないでください）：
{
  "distance_km": 数値（小数点第1位まで）,
  "duration_minutes": 数値（整数）,
  "mode": "${input.mode}",
  "route_description": "簡単な経路の説明（1-2文）"
}

注意:
- distance_kmは実際の移動距離を推定してください
- duration_minutesは移動手段に応じた現実的な時間を推定してください
- 徒歩の場合、時速4-5kmで計算してください
- 公共交通機関の場合、待ち時間も考慮してください
- route_descriptionは地名や通りの名前を含めて具体的に書いてください`;

  try {
    const result = await generateJSON<DistanceMatrixResult>(prompt, apiKey);

    // Validate result
    if (
      typeof result.distance_km !== 'number' ||
      typeof result.duration_minutes !== 'number' ||
      !result.mode
    ) {
      throw new Error('Invalid distance estimation result format');
    }

    return result;
  } catch (error: any) {
    console.error('Distance estimation error:', error);
    throw new Error(`Failed to estimate distance: ${error.message || error}`);
  }
}

/**
 * Calculate distance matrix for multiple origin-destination pairs
 */
export async function estimateDistanceMatrix(
  origins: Location[],
  destinations: Location[],
  mode: 'walking' | 'transit' | 'driving',
  apiKey: string
): Promise<DistanceMatrixResult[][]> {
  const results: DistanceMatrixResult[][] = [];

  for (const origin of origins) {
    const row: DistanceMatrixResult[] = [];
    for (const destination of destinations) {
      const result = await estimateDistance(
        { origin, destination, mode },
        apiKey
      );
      row.push(result);
    }
    results.push(row);
  }

  return results;
}

/**
 * Find the nearest location from a given origin
 */
export async function findNearest(
  origin: Location,
  destinations: Location[],
  mode: 'walking' | 'transit' | 'driving',
  apiKey: string
): Promise<{
  nearest: Location;
  distance: DistanceMatrixResult;
  index: number;
}> {
  let minDuration = Infinity;
  let nearestIndex = 0;
  let nearestResult: DistanceMatrixResult | null = null;

  for (let i = 0; i < destinations.length; i++) {
    const result = await estimateDistance(
      { origin, destination: destinations[i], mode },
      apiKey
    );

    if (result.duration_minutes < minDuration) {
      minDuration = result.duration_minutes;
      nearestIndex = i;
      nearestResult = result;
    }
  }

  if (!nearestResult) {
    throw new Error('No destinations provided');
  }

  return {
    nearest: destinations[nearestIndex],
    distance: nearestResult,
    index: nearestIndex,
  };
}
