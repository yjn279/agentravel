/**
 * Restaurant Search Agent (Gourmet Search)
 *
 * Searches for restaurants for meals during the trip.
 * Handles step 10 of the travel planning process.
 */

import { generateJSON } from '../tools/gemini-text';
import type { Restaurant } from '@agentravel/shared/types';

export interface RestaurantSearchInput {
  destination: string;
  area: string;
  meal_type: 'lunch' | 'dinner';
  cuisine?: string; // Optional cuisine preference
  budget?: {
    min?: number;
    max?: number;
  };
  date: string; // YYYY-MM-DD
}

export interface RestaurantSearchResult {
  restaurants: Restaurant[];
  recommendation: string;
  local_specialties: string[];
}

/**
 * Search for restaurants
 */
export async function searchRestaurants(
  input: RestaurantSearchInput,
  apiKey: string
): Promise<RestaurantSearchResult> {
  const { destination, area, meal_type, cuisine, budget, date } = input;

  const mealText = meal_type === 'lunch' ? 'ランチ' : 'ディナー';
  const cuisineText = cuisine ? `\n希望料理: ${cuisine}` : '';
  const budgetText = budget
    ? `\n予算: ${budget.min ? `¥${budget.min}以上` : ''}${budget.min && budget.max ? ' - ' : ''}${budget.max ? `¥${budget.max}以下` : ''}`
    : '';

  const prompt = `あなたはレストラン検索の専門家です。以下の条件で最適なレストランを提案してください。

条件:
- 目的地: ${destination}
- エリア: ${area}
- 食事タイプ: ${mealText}${cuisineText}${budgetText}
- 日付: ${date}

要件:
1. 1-2個のレストランを提案してください
2. 各レストランには以下の情報を含めてください：
   - レストラン名
   - 料理ジャンル
   - 説明（2-3文）
   - 緯度経度（概算）
   - 住所
   - 価格帯（¥, ¥¥, ¥¥¥ で表示）
   - 営業時間
   - 評価（5段階、小数点第1位まで）

3. 地元の名物料理や人気店を優先してください
4. 観光地からアクセスしやすい場所を選んでください

以下のJSON形式で返してください（JSON以外のテキストは含めないでください）：
{
  "restaurants": [
    {
      "name": "レストラン名",
      "cuisine": "料理ジャンル",
      "description": "レストランの説明",
      "location": {
        "lat": 31.2400,
        "lng": 121.4900
      },
      "address": "住所",
      "price_range": "¥¥",
      "business_hours": "11:00-14:00, 17:00-22:00",
      "rating": 4.5
    }
  ],
  "recommendation": "どのレストランをおすすめするか、その理由",
  "local_specialties": [
    "この地域の名物料理1",
    "この地域の名物料理2"
  ]
}

注意:
- 実在する可能性の高いレストラン名を使用してください
- 営業時間は実際のものを参考にしてください
- 価格帯は以下の基準で設定：
  - ¥: ~1000円
  - ¥¥: 1000-3000円
  - ¥¥¥: 3000円以上
- 地元の食文化を反映した推薦をしてください`;

  try {
    const result = await generateJSON<RestaurantSearchResult>(prompt, apiKey);

    // Validate result
    if (!Array.isArray(result.restaurants) || result.restaurants.length === 0) {
      throw new Error('No restaurants returned');
    }

    return result;
  } catch (error: any) {
    console.error('Restaurant search error:', error);
    throw new Error(`Failed to search restaurants: ${error.message || error}`);
  }
}

/**
 * Get restaurant recommendations near a specific location
 */
export async function searchRestaurantsNearby(
  destination: string,
  latitude: number,
  longitude: number,
  meal_type: 'lunch' | 'dinner',
  apiKey: string
): Promise<Restaurant[]> {
  const prompt = `緯度${latitude}、経度${longitude}付近で${meal_type === 'lunch' ? 'ランチ' : 'ディナー'}におすすめのレストランを2つ提案してください。

場所: ${destination}

以下のJSON形式で返してください：
{
  "restaurants": [
    {
      "name": "レストラン名",
      "cuisine": "料理ジャンル",
      "description": "説明",
      "location": {"lat": number, "lng": number},
      "address": "住所",
      "price_range": "¥¥",
      "business_hours": "営業時間",
      "rating": 4.5
    }
  ]
}`;

  try {
    const result = await generateJSON<{ restaurants: Restaurant[] }>(
      prompt,
      apiKey
    );

    return result.restaurants;
  } catch (error: any) {
    console.error('Nearby restaurant search error:', error);
    throw new Error(`Failed to search nearby restaurants: ${error.message || error}`);
  }
}

/**
 * Search for specific cuisine type
 */
export async function searchRestaurantsByCuisine(
  destination: string,
  area: string,
  cuisine: string,
  apiKey: string
): Promise<Restaurant[]> {
  const result = await searchRestaurants(
    {
      destination,
      area,
      meal_type: 'dinner',
      cuisine,
      date: new Date().toISOString().split('T')[0],
    },
    apiKey
  );

  return result.restaurants;
}

/**
 * Get local specialty restaurants
 */
export async function getLocalSpecialtyRestaurants(
  destination: string,
  area: string,
  apiKey: string
): Promise<{
  restaurants: Restaurant[];
  specialties: string[];
}> {
  const result = await searchRestaurants(
    {
      destination,
      area,
      meal_type: 'dinner',
      cuisine: '地元料理・郷土料理',
      date: new Date().toISOString().split('T')[0],
    },
    apiKey
  );

  return {
    restaurants: result.restaurants,
    specialties: result.local_specialties,
  };
}
