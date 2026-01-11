/**
 * Accommodation Search Agent
 *
 * Searches for hotel and accommodation options based on destination and daily plans.
 * Handles step 8 of the travel planning process.
 */

import { generateJSON } from '../tools/gemini-text';
import type { HotelOption, DailyConcept } from '@agentravel/shared/types';

export interface AccommodationSearchInput {
  destination: string;
  check_in: string;  // YYYY-MM-DD
  check_out: string; // YYYY-MM-DD
  daily_concepts?: DailyConcept[]; // To determine best location
  budget?: {
    min?: number;
    max?: number;
  };
}

export interface AccommodationSearchResult {
  options: HotelOption[];
  recommendation: string;
  location_rationale: string; // Why this area is recommended
}

/**
 * Search for accommodation options
 */
export async function searchAccommodation(
  input: AccommodationSearchInput,
  apiKey: string
): Promise<AccommodationSearchResult> {
  const { destination, check_in, check_out, daily_concepts, budget } = input;

  // Build context about daily plans
  const dailyPlansContext = daily_concepts
    ? `\n訪問予定エリア:\n${daily_concepts.map((c) => `- ${c.area} (${c.theme})`).join('\n')}`
    : '';

  const budgetContext = budget
    ? `\n予算: ${budget.min ? `¥${budget.min}以上` : ''}${budget.min && budget.max ? ' - ' : ''}${budget.max ? `¥${budget.max}以下` : ''}`
    : '';

  const prompt = `あなたは宿泊施設検索の専門家です。以下の条件で最適なホテルを提案してください。

条件:
- 目的地: ${destination}
- チェックイン: ${check_in}
- チェックアウト: ${check_out}${dailyPlansContext}${budgetContext}

要件:
1. 2-3個のホテルオプションを提案してください
2. 訪問予定のエリアへのアクセスが良い場所を優先してください
3. 各ホテルには以下の情報を含めてください：
   - ホテル名
   - エリア
   - 1泊あたりの価格
   - 評価（5段階）
   - 主要な設備
   - 緯度経度（概算）

以下のJSON形式で返してください（JSON以外のテキストは含めないでください）：
{
  "options": [
    {
      "name": "ホテル名",
      "area": "エリア名",
      "price_per_night": 15000,
      "rating": 4.5,
      "amenities": ["WiFi", "朝食付き", "空港送迎"],
      "location": {
        "lat": 31.2400,
        "lng": 121.4900
      }
    }
  ],
  "recommendation": "どのホテルをおすすめするか、その理由",
  "location_rationale": "このエリアを選んだ理由（交通の便、観光地へのアクセスなど）"
}

注意:
- 実在する可能性の高いホテル名を使用してください
- 価格は季節を考慮した現実的な金額にしてください
- 訪問予定エリアの中心となる場所を推奨してください`;

  try {
    const result = await generateJSON<AccommodationSearchResult>(prompt, apiKey);

    // Validate result
    if (!Array.isArray(result.options) || result.options.length === 0) {
      throw new Error('No accommodation options returned');
    }

    return result;
  } catch (error: any) {
    console.error('Accommodation search error:', error);
    throw new Error(`Failed to search accommodation: ${error.message || error}`);
  }
}

/**
 * Recommend hotel location based on daily itinerary
 */
export async function recommendHotelLocation(
  destination: string,
  daily_concepts: DailyConcept[],
  apiKey: string
): Promise<{
  recommended_area: string;
  reasoning: string;
  alternative_areas: Array<{ area: string; pros_cons: string }>;
}> {
  const areasText = daily_concepts.map((c) => `- Day ${c.day}: ${c.area} (${c.theme})`).join('\n');

  const prompt = `以下の旅程に基づいて、${destination}で最適なホテルのエリアを推薦してください。

旅程:
${areasText}

以下のJSON形式で返してください：
{
  "recommended_area": "推奨エリア名",
  "reasoning": "このエリアをおすすめする理由（2-3文）",
  "alternative_areas": [
    {
      "area": "代替エリア名",
      "pros_cons": "メリット・デメリット"
    }
  ]
}

考慮事項:
- 各日の訪問エリアへのアクセス
- 交通の便
- 周辺の飲食店やコンビニ
- 治安`;

  try {
    const result = await generateJSON<{
      recommended_area: string;
      reasoning: string;
      alternative_areas: Array<{ area: string; pros_cons: string }>;
    }>(prompt, apiKey);

    return result;
  } catch (error: any) {
    console.error('Hotel location recommendation error:', error);
    throw new Error(`Failed to recommend hotel location: ${error.message || error}`);
  }
}
