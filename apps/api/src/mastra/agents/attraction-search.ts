/**
 * Attraction Search Agent
 *
 * Searches for tourist attractions and sightseeing spots for each day.
 * Handles step 9 of the travel planning process.
 */

import { generateJSON } from '../tools/gemini-text';
import type { Attraction } from '@agentravel/shared/types';

export interface AttractionSearchInput {
  destination: string;
  area: string;
  theme: string;
  available_hours: number; // Available time in hours
  date: string; // YYYY-MM-DD
}

export interface AttractionSearchResult {
  attractions: Attraction[];
  summary: string;
  tips: string[];
}

/**
 * Search for attractions
 */
export async function searchAttractions(
  input: AttractionSearchInput,
  apiKey: string
): Promise<AttractionSearchResult> {
  const { destination, area, theme, available_hours, date } = input;

  const prompt = `あなたは観光スポット検索の専門家です。以下の条件で観光スポットを提案してください。

条件:
- 目的地: ${destination}
- エリア: ${area}
- テーマ: ${theme}
- 利用可能時間: ${available_hours}時間
- 日付: ${date}

要件:
1. 4-6個の観光スポットを提案してください
2. テーマに合ったスポットを選んでください
3. 各スポットには以下の情報を含めてください：
   - スポット名
   - 説明（2-3文）
   - 推奨滞在時間（分）
   - 緯度経度（概算）
   - 住所
   - 営業時間
   - 入場料（無料の場合は0）
   - 評価（5段階、小数点第1位まで）

4. 利用可能時間内に回れる現実的な数のスポットを提案してください
5. 移動時間も考慮してください

以下のJSON形式で返してください（JSON以外のテキストは含めないでください）：
{
  "attractions": [
    {
      "name": "スポット名",
      "description": "簡潔な説明",
      "visit_duration_minutes": 90,
      "location": {
        "lat": 31.2400,
        "lng": 121.4900
      },
      "address": "住所",
      "business_hours": "9:00-17:00",
      "entry_fee": 500,
      "rating": 4.5
    }
  ],
  "summary": "このエリアの特徴と訪問のポイント（2-3文）",
  "tips": [
    "訪問時のアドバイス1",
    "訪問時のアドバイス2"
  ]
}

注意:
- 実在する観光スポットを使用してください
- 営業時間は実際のものを参考にしてください
- 入場料は現実的な金額にしてください
- 曜日や季節による営業時間の違いも考慮してください`;

  try {
    const result = await generateJSON<AttractionSearchResult>(prompt, apiKey);

    // Validate result
    if (!Array.isArray(result.attractions) || result.attractions.length === 0) {
      throw new Error('No attractions returned');
    }

    return result;
  } catch (error: any) {
    console.error('Attraction search error:', error);
    throw new Error(`Failed to search attractions: ${error.message || error}`);
  }
}

/**
 * Filter attractions by available time
 */
export async function filterAttractionsByTime(
  attractions: Attraction[],
  available_hours: number,
  apiKey: string
): Promise<{
  selected: Attraction[];
  reason: string;
}> {
  const attractionsText = attractions
    .map(
      (a, i) =>
        `${i + 1}. ${a.name} - ${a.visit_duration_minutes}分 (${a.description})`
    )
    .join('\n');

  const prompt = `以下の観光スポットから、${available_hours}時間以内で回れる最適な組み合わせを選んでください。

利用可能時間: ${available_hours}時間（移動時間も含む）

候補スポット:
${attractionsText}

以下のJSON形式で返してください：
{
  "selected": [インデックス番号の配列, 例: [0, 2, 4]],
  "reason": "この組み合わせを選んだ理由"
}

考慮事項:
- スポット間の移動時間（徒歩15-30分程度）も考慮
- 疲労を考慮して適度な数に絞る
- テーマの一貫性を保つ`;

  try {
    const result = await generateJSON<{
      selected: number[];
      reason: string;
    }>(prompt, apiKey);

    const selectedAttractions = result.selected.map((idx) => attractions[idx]);

    return {
      selected: selectedAttractions,
      reason: result.reason,
    };
  } catch (error: any) {
    console.error('Attraction filtering error:', error);
    throw new Error(`Failed to filter attractions: ${error.message || error}`);
  }
}

/**
 * Get popular attractions in an area
 */
export async function getPopularAttractions(
  destination: string,
  area: string,
  apiKey: string
): Promise<Attraction[]> {
  const result = await searchAttractions(
    {
      destination,
      area,
      theme: '人気観光スポット',
      available_hours: 8,
      date: new Date().toISOString().split('T')[0],
    },
    apiKey
  );

  return result.attractions;
}
