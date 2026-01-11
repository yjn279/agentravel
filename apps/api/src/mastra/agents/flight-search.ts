/**
 * Flight Search Agent
 *
 * Searches for flight options between origin and destination.
 * Handles steps 5-6 of the travel planning process.
 */

import { generateJSON } from '../tools/gemini-text';
import type { FlightOption } from '@agentravel/shared/types';

export interface FlightSearchInput {
  origin: string;
  destination: string;
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
  passengers?: number;
}

export interface FlightSearchResult {
  options: FlightOption[];
  recommendations: string;
}

/**
 * Search for flight options
 */
export async function searchFlights(
  input: FlightSearchInput,
  apiKey: string
): Promise<FlightSearchResult> {
  const { origin, destination, start_date, end_date, passengers = 1 } = input;

  const prompt = `あなたはフライト検索の専門家です。以下の条件でフライトオプションを提案してください。

条件:
- 出発地: ${origin}
- 目的地: ${destination}
- 出発日（往路）: ${start_date}
- 帰着日（復路）: ${end_date}
- 乗客数: ${passengers}名

要件:
1. 2-3個のフライトオプションを提案してください
2. 各オプションには航空会社、フライト時間、概算価格を含めてください
3. もし正確な日付でフライトが見つからない場合は、±2日以内の代替案を提案してください
4. 価格は日本円で表示してください

以下のJSON形式で返してください（JSON以外のテキストは含めないでください）：
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
}

注意:
- 実際の航空会社と現実的なフライト時間を使用してください
- 価格は季節や曜日を考慮した現実的な金額にしてください
- 直行便がある場合は優先してください`;

  try {
    const result = await generateJSON<FlightSearchResult>(prompt, apiKey);

    // Validate result
    if (!Array.isArray(result.options) || result.options.length === 0) {
      throw new Error('No flight options returned');
    }

    return result;
  } catch (error: any) {
    console.error('Flight search error:', error);
    throw new Error(`Failed to search flights: ${error.message || error}`);
  }
}

/**
 * Suggest alternative dates if no flights available
 */
export async function suggestAlternativeDates(
  input: FlightSearchInput,
  apiKey: string
): Promise<{
  alternative_dates: Array<{ start: string; end: string; reason: string }>;
  recommendation: string;
}> {
  const { origin, destination, start_date, end_date } = input;

  const prompt = `フライト検索で希望の日程（${start_date} - ${end_date}）でフライトが見つかりませんでした。

出発地: ${origin}
目的地: ${destination}

代替となる日程を3つ提案してください。各日程には以下を含めてください：
- 代替日程（開始日と終了日）
- 理由（価格が安い、空席がある、など）

以下のJSON形式で返してください：
{
  "alternative_dates": [
    {
      "start": "2026-01-20",
      "end": "2026-01-23",
      "reason": "平日で価格が20%安く、空席も十分あります"
    }
  ],
  "recommendation": "全体的なおすすめのアドバイス"
}`;

  try {
    const result = await generateJSON<{
      alternative_dates: Array<{ start: string; end: string; reason: string }>;
      recommendation: string;
    }>(prompt, apiKey);

    return result;
  } catch (error: any) {
    console.error('Alternative dates suggestion error:', error);
    throw new Error(`Failed to suggest alternative dates: ${error.message || error}`);
  }
}
