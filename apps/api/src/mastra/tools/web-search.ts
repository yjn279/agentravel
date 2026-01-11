/**
 * Web Search Tool
 *
 * Provides web search functionality for finding information about
 * destinations, attractions, hotels, restaurants, and flights.
 *
 * TODO: Implement with Tavily API or alternative when API key is available.
 * For now, uses Gemini to simulate search results based on knowledge.
 */

import { generateJSON } from './gemini-text';
import type { WebSearchInput, WebSearchResult } from '@agentravel/shared/types';

/**
 * Search the web for information
 */
export async function searchWeb(
  input: WebSearchInput,
  apiKey: string
): Promise<WebSearchResult[]> {
  // TODO: Replace with actual Tavily API when available
  // For MVP, we'll use Gemini to generate search-like results based on its knowledge

  const prompt = `あなたはWeb検索エンジンです。以下のクエリに対して、実際のWebページを検索したかのような結果を返してください。

検索クエリ: ${input.query}
結果数: ${input.num_results || 5}

以下のJSON形式で返してください（JSON以外のテキストは含めないでください）：
{
  "results": [
    {
      "title": "ページタイトル",
      "url": "https://example.com/...",
      "snippet": "ページの説明文（2-3文）",
      "relevance_score": 0.0から1.0の数値
    }
  ]
}

注意:
- 実際に存在しそうなURLを生成してください
- snippetは具体的で有用な情報を含めてください
- 関連性の高い順に並べてください
- 旅行関連の情報の場合、公式サイト、旅行ガイド、レビューサイトなど多様なソースを含めてください`;

  try {
    const result = await generateJSON<{ results: WebSearchResult[] }>(
      prompt,
      apiKey
    );

    if (!Array.isArray(result.results)) {
      throw new Error('Invalid search results format');
    }

    return result.results;
  } catch (error: any) {
    console.error('Web search error:', error);
    throw new Error(`Failed to search web: ${error.message || error}`);
  }
}

/**
 * Search for flights
 */
export async function searchFlights(
  origin: string,
  destination: string,
  departureDate: string,
  returnDate: string,
  apiKey: string
): Promise<WebSearchResult[]> {
  const query = `フライト ${origin} から ${destination} ${departureDate} 出発 ${returnDate} 帰着`;
  return searchWeb({ query, num_results: 5 }, apiKey);
}

/**
 * Search for hotels
 */
export async function searchHotels(
  destination: string,
  area: string,
  checkIn: string,
  checkOut: string,
  apiKey: string
): Promise<WebSearchResult[]> {
  const query = `ホテル ${destination} ${area} ${checkIn} チェックイン ${checkOut} チェックアウト`;
  return searchWeb({ query, num_results: 5 }, apiKey);
}

/**
 * Search for attractions
 */
export async function searchAttractions(
  destination: string,
  area: string,
  theme: string,
  apiKey: string
): Promise<WebSearchResult[]> {
  const query = `観光スポット ${destination} ${area} ${theme}`;
  return searchWeb({ query, num_results: 10 }, apiKey);
}

/**
 * Search for restaurants
 */
export async function searchRestaurants(
  destination: string,
  area: string,
  cuisine: string,
  apiKey: string
): Promise<WebSearchResult[]> {
  const query = `レストラン ${destination} ${area} ${cuisine}`;
  return searchWeb({ query, num_results: 5 }, apiKey);
}
