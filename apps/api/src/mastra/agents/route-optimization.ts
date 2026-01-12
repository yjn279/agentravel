/**
 * Route Optimization Agent
 *
 * Optimizes the visiting order of attractions and restaurants to create a detailed timeline.
 * Handles steps 11-12 of the travel planning process.
 */

import { generateJSON } from '../tools/gemini-text';
import { estimateDistance } from '../tools/gemini-distance';
import type { Activity, Attraction, Restaurant, Location } from '@agentravel/shared/types';

export interface RouteOptimizationInput {
  attractions: Attraction[];
  restaurants: {
    lunch?: Restaurant;
    dinner?: Restaurant;
  };
  hotel_location: Location;
  start_time: string; // "09:00"
  end_time: string;   // "21:00"
  date: string;       // YYYY-MM-DD
}

export interface RouteOptimizationResult {
  timeline: Activity[];
  total_duration_minutes: number;
  total_walking_distance_km: number;
  summary: string;
  warnings?: string[];
}

/**
 * Optimize route and create detailed timeline
 */
export async function optimizeRoute(
  input: RouteOptimizationInput,
  apiKey: string
): Promise<RouteOptimizationResult> {
  const { attractions, restaurants, hotel_location, start_time, end_time, date } = input;

  // Convert attractions and restaurants to location items
  const locationItems = [
    ...attractions.map((a) => ({
      name: a.name,
      location: a.location,
      duration_minutes: a.visit_duration_minutes,
      type: 'attraction' as const,
      business_hours: a.business_hours,
      data: a,
    })),
  ];

  if (restaurants.lunch) {
    locationItems.push({
      name: restaurants.lunch.name,
      location: restaurants.lunch.location,
      duration_minutes: 60,
      type: 'lunch' as const,
      business_hours: restaurants.lunch.business_hours,
      data: restaurants.lunch,
    });
  }

  if (restaurants.dinner) {
    locationItems.push({
      name: restaurants.dinner.name,
      location: restaurants.dinner.location,
      duration_minutes: 90,
      type: 'dinner' as const,
      business_hours: restaurants.dinner.business_hours,
      data: restaurants.dinner,
    });
  }

  // Create a prompt for Gemini to optimize the route
  const locationsText = locationItems
    .map(
      (item, i) =>
        `${i + 1}. ${item.name} (${item.type}, ${item.duration_minutes}分, 緯度${item.location.lat} 経度${item.location.lng})`
    )
    .join('\n');

  const prompt = `あなたはルート最適化の専門家です。以下の観光スポットとレストランを、効率的に回れる順序に並べ替えてください。

開始時刻: ${start_time}
終了時刻: ${end_time}
ホテル位置: 緯度${hotel_location.lat}, 経度${hotel_location.lng}

訪問場所:
${locationsText}

制約条件:
1. ホテルから出発し、ホテルに戻る
2. ランチは12:00-13:00の間
3. ディナーは18:00-20:00の間
4. 各スポットの滞在時間を守る
5. 移動時間は徒歩または公共交通機関を想定（スポット間15-30分程度）
6. 営業時間を考慮する

以下のJSON形式で返してください（JSON以外のテキストは含めないでください）：
{
  "optimized_order": [インデックス番号の配列, 例: [0, 2, 1, 3, 4]],
  "reasoning": "この順序にした理由（30文字以内で簡潔に）"
}

最適化の目標:
- 移動距離を最小化
- バックトラックを避ける
- 時間制約を守る
- 実現可能なスケジュール

重要: reasoningは30文字以内で簡潔に記述し、JSONを必ず完結させてください。`;

  try {
    // Get optimized order from Gemini
    const optimizationResult = await generateJSON<{
      optimized_order: number[];
      reasoning: string;
    }>(prompt, apiKey);

    // Build timeline based on optimized order
    const timeline: Activity[] = [];
    let currentTime = parseTime(start_time);
    let currentLocation = hotel_location;
    let totalDistance = 0;
    const warnings: string[] = [];

    // Add hotel checkout as first activity
    timeline.push({
      start_time: formatTime(currentTime),
      end_time: formatTime(currentTime),
      duration_minutes: 0,
      activity_type: 'hotel',
      name: 'ホテル出発',
      latitude: hotel_location.lat,
      longitude: hotel_location.lng,
    });

    // Process each location in optimized order
    for (const idx of optimizationResult.optimized_order) {
      const item = locationItems[idx];

      // Calculate travel time to this location
      const travelResult = await estimateDistance(
        {
          origin: currentLocation,
          destination: item.location,
          mode: 'transit',
        },
        apiKey
      );

      // Add travel activity if distance > 0
      if (travelResult.duration_minutes > 0) {
        const travelStartTime = currentTime;
        currentTime += travelResult.duration_minutes;
        totalDistance += travelResult.distance_km;

        timeline.push({
          start_time: formatTime(travelStartTime),
          end_time: formatTime(currentTime),
          duration_minutes: travelResult.duration_minutes,
          activity_type: 'transport',
          name: `${timeline[timeline.length - 1].name} → ${item.name}`,
          description: travelResult.route_description,
        });
      }

      // Check if we need to adjust time for meal constraints
      if (item.type === 'lunch' && currentTime < parseTime('12:00')) {
        // Wait until lunch time
        const waitTime = parseTime('12:00') - currentTime;
        if (waitTime > 30) {
          warnings.push(`ランチまで${waitTime}分の空き時間があります`);
        }
        currentTime = parseTime('12:00');
      } else if (item.type === 'dinner' && currentTime < parseTime('18:00')) {
        // Wait until dinner time
        const waitTime = parseTime('18:00') - currentTime;
        if (waitTime > 30) {
          warnings.push(`ディナーまで${waitTime}分の空き時間があります`);
        }
        currentTime = parseTime('18:00');
      }

      // Add main activity
      const activityStartTime = currentTime;
      currentTime += item.duration_minutes;

      const activity: Activity = {
        start_time: formatTime(activityStartTime),
        end_time: formatTime(currentTime),
        duration_minutes: item.duration_minutes,
        activity_type: getActivityType(item.type),
        name: item.name,
        latitude: item.location.lat,
        longitude: item.location.lng,
      };

      if (item.type === 'attraction') {
        activity.description = (item.data as Attraction).description;
        activity.address = (item.data as Attraction).address;
      } else if (item.type === 'lunch' || item.type === 'dinner') {
        activity.description = (item.data as Restaurant).description;
        activity.address = (item.data as Restaurant).address;
      }

      timeline.push(activity);
      currentLocation = item.location;
    }

    // Return to hotel
    const returnTravel = await estimateDistance(
      {
        origin: currentLocation,
        destination: hotel_location,
        mode: 'transit',
      },
      apiKey
    );

    if (returnTravel.duration_minutes > 0) {
      const travelStartTime = currentTime;
      currentTime += returnTravel.duration_minutes;
      totalDistance += returnTravel.distance_km;

      timeline.push({
        start_time: formatTime(travelStartTime),
        end_time: formatTime(currentTime),
        duration_minutes: returnTravel.duration_minutes,
        activity_type: 'transport',
        name: `${timeline[timeline.length - 1].name} → ホテル`,
        description: returnTravel.route_description,
      });
    }

    // Add hotel return
    timeline.push({
      start_time: formatTime(currentTime),
      end_time: formatTime(currentTime),
      duration_minutes: 0,
      activity_type: 'hotel',
      name: 'ホテル到着',
      latitude: hotel_location.lat,
      longitude: hotel_location.lng,
    });

    // Check if we exceed end time
    const endTimeMinutes = parseTime(end_time);
    if (currentTime > endTimeMinutes) {
      warnings.push(
        `予定終了時刻を${currentTime - endTimeMinutes}分超過しています`
      );
    }

    return {
      timeline,
      total_duration_minutes: currentTime - parseTime(start_time),
      total_walking_distance_km: totalDistance,
      summary: optimizationResult.reasoning,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (error: any) {
    console.error('Route optimization error:', error);
    throw new Error(`Failed to optimize route: ${error.message || error}`);
  }
}

/**
 * Map location item type to activity type
 */
function getActivityType(type: 'attraction' | 'lunch' | 'dinner'): Activity['activity_type'] {
  switch (type) {
    case 'attraction':
      return 'sightseeing';
    case 'lunch':
    case 'dinner':
      return 'meal';
    default:
      return 'transport';
  }
}

/**
 * Parse time string to minutes since midnight
 */
function parseTime(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Format minutes since midnight to time string
 */
function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Validate if schedule is feasible
 */
export async function validateSchedule(
  activities: Activity[],
  maxHours: number = 14
): Promise<{
  is_feasible: boolean;
  issues: string[];
  suggestions: string[];
}> {
  // Calculate total duration
  let totalMinutes = 0;
  const issues: string[] = [];
  const suggestions: string[] = [];

  for (const activity of activities) {
    if (activity.duration_minutes) {
      totalMinutes += activity.duration_minutes;
    }
  }

  const totalHours = totalMinutes / 60;

  // Check if too long
  if (totalHours > maxHours) {
    issues.push(`スケジュールが長すぎます（${totalHours.toFixed(1)}時間 > ${maxHours}時間）`);
    suggestions.push('いくつかのアクティビティを削除するか、複数日に分散することを検討してください');
  }

  // Check if too packed (< 15 min between activities)
  for (let i = 0; i < activities.length - 1; i++) {
    const current = activities[i];
    const next = activities[i + 1];

    const currentEnd = parseTime(current.end_time);
    const nextStart = parseTime(next.start_time);

    if (nextStart - currentEnd < 0) {
      issues.push(`${current.name}と${next.name}の時間が重複しています`);
    }
  }

  return {
    is_feasible: issues.length === 0,
    issues,
    suggestions,
  };
}
