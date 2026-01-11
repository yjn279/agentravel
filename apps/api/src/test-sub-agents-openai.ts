/**
 * Sub-Agent Test Script (OpenAI Version)
 *
 * Test individual sub-agents using OpenAI GPT-5 Mini.
 */

import * as openaiText from './mastra/tools/openai-text';

// Flight Search (OpenAI)
async function searchFlights(input: any, apiKey: string) {
  const prompt = `あなたはフライト検索の専門家です。以下の条件でフライトオプションを提案してください。

条件:
- 出発地: ${input.origin}
- 目的地: ${input.destination}
- 出発日: ${input.start_date}
- 帰国日: ${input.end_date}
- 乗客数: ${input.passengers}人

要件:
1. 2-3個のフライトオプションを提案してください
2. 各オプションには以下の情報を含めてください：
   - 航空会社名
   - 往路フライト（便名と時刻）
   - 復路フライト（便名と時刻）
   - 概算価格（円）
   - 所要時間（時間）

以下のJSON形式で返してください（JSON以外のテキストは含めないでください）：
{
  "options": [
    {
      "airline": "航空会社名",
      "outbound": "便名 時刻",
      "return": "便名 時刻",
      "price": 50000,
      "duration_hours": 2.5
    }
  ],
  "recommendations": "推奨コメント（2-3文）"
}`;

  return await openaiText.generateJSON(prompt, apiKey);
}

// Accommodation Search (OpenAI)
async function searchAccommodation(input: any, apiKey: string) {
  const conceptsText = input.daily_concepts.map((c: any) =>
    `Day ${c.day} (${c.date}): ${c.area} - ${c.theme}`
  ).join('\n');

  const prompt = `あなたはホテル検索の専門家です。以下の条件で最適なホテルを提案してください。

条件:
- 目的地: ${input.destination}
- チェックイン: ${input.check_in}
- チェックアウト: ${input.check_out}

日別の訪問エリア:
${conceptsText}

要件:
1. 2-3個のホテルオプションを提案してください
2. 各ホテルには以下の情報を含めてください：
   - ホテル名
   - エリア
   - 一泊あたりの価格（円）
   - 評価（5段階）
   - アメニティ（配列）

3. 日別の訪問エリアへのアクセスを考慮した最適な立地を選んでください

以下のJSON形式で返してください（JSON以外のテキストは含めないでください）：
{
  "options": [
    {
      "name": "ホテル名",
      "area": "エリア名",
      "price_per_night": 15000,
      "rating": 4.5,
      "amenities": ["WiFi", "レストラン", "プール"]
    }
  ],
  "recommendation": "おすすめのホテルとその理由（2-3文）",
  "location_rationale": "立地を選んだ理由（2-3文）"
}`;

  return await openaiText.generateJSON(prompt, apiKey);
}

// Attraction Search (OpenAI)
async function searchAttractions(input: any, apiKey: string) {
  const prompt = `あなたは観光スポット検索の専門家です。以下の条件で観光スポットを提案してください。

条件:
- 目的地: ${input.destination}
- エリア: ${input.area}
- テーマ: ${input.theme}
- 利用可能時間: ${input.available_hours}時間
- 日付: ${input.date}

要件:
1. 4-6個の観光スポットを提案してください
2. 各スポットには以下の情報を含めてください：
   - スポット名
   - 説明（2-3文）
   - 推奨滞在時間（分）
   - 緯度経度
   - 住所
   - 営業時間
   - 入場料（無料の場合は0）
   - 評価（5段階）

以下のJSON形式で返してください（JSON以外のテキストは含めないでください）：
{
  "attractions": [
    {
      "name": "スポット名",
      "description": "説明",
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
  "summary": "このエリアの特徴（2-3文）"
}`;

  return await openaiText.generateJSON(prompt, apiKey);
}

// Restaurant Search (OpenAI)
async function searchRestaurants(input: any, apiKey: string) {
  const mealText = input.meal_type === 'lunch' ? 'ランチ' : 'ディナー';
  const cuisineText = input.cuisine ? `\n希望料理: ${input.cuisine}` : '';

  const prompt = `あなたはレストラン検索の専門家です。以下の条件で最適なレストランを提案してください。

条件:
- 目的地: ${input.destination}
- エリア: ${input.area}
- 食事タイプ: ${mealText}${cuisineText}
- 日付: ${input.date}

要件:
1. 1-2個のレストランを提案してください
2. 各レストランには以下の情報を含めてください：
   - レストラン名
   - 料理ジャンル
   - 説明（2-3文）
   - 緯度経度
   - 住所
   - 価格帯（¥, ¥¥, ¥¥¥）
   - 営業時間
   - 評価（5段階）

以下のJSON形式で返してください（JSON以外のテキストは含めないでください）：
{
  "restaurants": [
    {
      "name": "レストラン名",
      "cuisine": "料理ジャンル",
      "description": "説明",
      "location": {
        "lat": 31.2400,
        "lng": 121.4900
      },
      "address": "住所",
      "price_range": "¥¥",
      "business_hours": "11:00-22:00",
      "rating": 4.5
    }
  ],
  "recommendation": "おすすめとその理由（2-3文）",
  "local_specialties": ["名物料理1", "名物料理2"]
}`;

  return await openaiText.generateJSON(prompt, apiKey);
}

// Route Optimization (OpenAI)
async function optimizeRoute(input: any, apiKey: string) {
  const attractionsText = input.attractions.map((a: any, i: number) =>
    `${i + 1}. ${a.name} (${a.visit_duration_minutes}分, 緯度${a.location.lat} 経度${a.location.lng})`
  ).join('\n');

  const prompt = `あなたはルート最適化の専門家です。以下の観光スポットを効率的に回れる順序に並べ替えてください。

開始時刻: ${input.start_time}
終了時刻: ${input.end_time}
ホテル位置: 緯度${input.hotel_location.lat}, 経度${input.hotel_location.lng}

訪問場所:
${attractionsText}

制約条件:
1. ホテルから出発し、ホテルに戻る
2. 移動距離を最小化
3. バックトラックを避ける

以下のJSON形式で返してください（JSON以外のテキストは含めないでください）：
{
  "timeline": [
    {
      "start_time": "09:00",
      "end_time": "10:30",
      "duration_minutes": 90,
      "activity_type": "sightseeing",
      "name": "スポット名",
      "description": "簡潔な説明"
    }
  ],
  "total_duration_minutes": 480,
  "total_walking_distance_km": 5.2,
  "summary": "ルートの概要（2-3文）"
}`;

  return await openaiText.generateJSON(prompt, apiKey);
}

async function testSubAgents() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY not found');
    process.exit(1);
  }

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║    Sub-Agent Test Suite (OpenAI GPT-5 Mini)               ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // Test 1: Flight Search
    console.log('✈️  Test 1: Flight Search Agent');
    console.log('─────────────────────────────────────────────────────────────');
    const flightResult = await searchFlights(
      {
        origin: '東京',
        destination: '上海',
        start_date: '2026-01-20',
        end_date: '2026-01-23',
        passengers: 1,
      },
      apiKey
    );

    console.log('Flight Options:');
    flightResult.options.forEach((option: any, i: number) => {
      console.log(`\n  ${i + 1}. ${option.airline}`);
      console.log(`     Outbound: ${option.outbound}`);
      console.log(`     Return: ${option.return}`);
      console.log(`     Price: ¥${option.price}`);
      console.log(`     Duration: ${option.duration_hours} hours`);
    });
    console.log(`\n  💡 ${flightResult.recommendations}`);
    console.log('\n✅ Flight search successful!\n');

    // Test 2: Accommodation Search
    console.log('🏨 Test 2: Accommodation Search Agent');
    console.log('─────────────────────────────────────────────────────────────');
    const hotelResult = await searchAccommodation(
      {
        destination: '上海',
        check_in: '2026-01-20',
        check_out: '2026-01-23',
        daily_concepts: [
          { day: 1, date: '2026-01-20', area: '外灘', theme: '到着日・軽め' },
          { day: 2, date: '2026-01-21', area: '外灘', theme: '歴史と夜景' },
          { day: 3, date: '2026-01-22', area: '浦東', theme: 'モダン上海' },
        ],
      },
      apiKey
    );

    console.log('Hotel Options:');
    hotelResult.options.forEach((option: any, i: number) => {
      console.log(`\n  ${i + 1}. ${option.name}`);
      console.log(`     Area: ${option.area}`);
      console.log(`     Price: ¥${option.price_per_night}/night`);
      console.log(`     Rating: ${option.rating}/5.0`);
      console.log(`     Amenities: ${option.amenities?.join(', ')}`);
    });
    console.log(`\n  💡 ${hotelResult.recommendation}`);
    console.log(`\n  📍 ${hotelResult.location_rationale}`);
    console.log('\n✅ Accommodation search successful!\n');

    // Test 3: Attraction Search
    console.log('🎯 Test 3: Attraction Search Agent');
    console.log('─────────────────────────────────────────────────────────────');
    const attractionResult = await searchAttractions(
      {
        destination: '上海',
        area: '外灘',
        theme: '歴史と夜景',
        available_hours: 8,
        date: '2026-01-21',
      },
      apiKey
    );

    console.log('Attractions:');
    attractionResult.attractions.forEach((attraction: any, i: number) => {
      console.log(`\n  ${i + 1}. ${attraction.name}`);
      console.log(`     ${attraction.description}`);
      console.log(`     Duration: ${attraction.visit_duration_minutes} min`);
      console.log(`     Hours: ${attraction.business_hours}`);
      console.log(`     Fee: ¥${attraction.entry_fee || 0}`);
      console.log(`     Rating: ${attraction.rating}/5.0`);
    });
    console.log(`\n  💡 ${attractionResult.summary}`);
    console.log('\n✅ Attraction search successful!\n');

    // Test 4: Restaurant Search
    console.log('🍽️  Test 4: Restaurant Search Agent');
    console.log('─────────────────────────────────────────────────────────────');
    const restaurantResult = await searchRestaurants(
      {
        destination: '上海',
        area: '外灘',
        meal_type: 'dinner',
        cuisine: '上海料理',
        date: '2026-01-21',
      },
      apiKey
    );

    console.log('Restaurants:');
    restaurantResult.restaurants.forEach((restaurant: any, i: number) => {
      console.log(`\n  ${i + 1}. ${restaurant.name}`);
      console.log(`     Cuisine: ${restaurant.cuisine}`);
      console.log(`     ${restaurant.description}`);
      console.log(`     Price: ${restaurant.price_range}`);
      console.log(`     Hours: ${restaurant.business_hours}`);
      console.log(`     Rating: ${restaurant.rating}/5.0`);
    });
    console.log(`\n  💡 ${restaurantResult.recommendation}`);
    console.log(`\n  🥘 Local specialties: ${restaurantResult.local_specialties.join(', ')}`);
    console.log('\n✅ Restaurant search successful!\n');

    // Test 5: Route Optimization
    console.log('🗺️  Test 5: Route Optimization Agent');
    console.log('─────────────────────────────────────────────────────────────');

    const selectedAttractions = attractionResult.attractions.slice(0, 3);
    const routeResult = await optimizeRoute(
      {
        attractions: selectedAttractions,
        hotel_location: { lat: 31.2400, lng: 121.4900 },
        start_time: '09:00',
        end_time: '21:00',
        date: '2026-01-21',
      },
      apiKey
    );

    console.log('Optimized Timeline:');
    routeResult.timeline.forEach((activity: any) => {
      const icon = {
        hotel: '🏨',
        sightseeing: '🎯',
        meal: '🍽️',
        transport: '🚶',
      }[activity.activity_type] || '📍';

      console.log(`\n  ${activity.start_time} - ${activity.end_time} ${icon} ${activity.name}`);
      if (activity.description) {
        console.log(`     ${activity.description}`);
      }
    });

    console.log(`\n  📊 Total duration: ${routeResult.total_duration_minutes} min`);
    console.log(`  🚶 Total distance: ${routeResult.total_walking_distance_km} km`);
    console.log(`\n  💡 ${routeResult.summary}`);

    console.log('\n✅ Route optimization successful!\n');

    console.log('═══════════════════════════════════════════════════════════');
    console.log('🎉 All sub-agent tests passed!');
    console.log('═══════════════════════════════════════════════════════════\n');
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testSubAgents();
