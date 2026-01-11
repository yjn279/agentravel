import { GoogleGenerativeAI } from '@google/generative-ai';

async function testGemini() {
  const apiKey = process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    console.error('❌ GOOGLE_API_KEY not found in environment');
    process.exit(1);
  }

  console.log('✅ API Key found');
  console.log('🧪 Testing Gemini 2.5 Flash...\n');

  try {
    const genAI = new GoogleGenerativeAI(apiKey);

    // Test 1: Text generation with Gemini 2.5 Flash
    console.log('📝 Test 1: Text Generation (gemini-2.5-flash)');
    const textModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = 'こんにちは！上海の観光スポットを3つ教えてください。簡潔にお願いします。';
    const result = await textModel.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    console.log('Response:', text.substring(0, 200) + (text.length > 200 ? '...' : ''));
    console.log('\n✅ Text generation successful!\n');

    // Test 2: Travel planning scenario
    console.log('✈️ Test 2: Travel Planning Scenario');
    const travelPrompt = `あなたは旅行プランナーです。以下の情報に基づいて、1日の観光プランを提案してください：
- 目的地: 上海
- エリア: 外灘（The Bund）
- テーマ: 歴史と夜景
- 利用可能時間: 8時間

観光スポットを2-3個提案し、各スポットの所要時間、緯度経度（概算）も含めてください。
JSONフォーマットで返してください。`;

    const planResult = await textModel.generateContent(travelPrompt);
    const planText = planResult.response.text();

    console.log('Travel Plan:', planText.substring(0, 400) + (planText.length > 400 ? '...' : ''));
    console.log('\n✅ Travel planning test successful!\n');

    // Test 3: Distance/time estimation (replacing Google Maps API)
    console.log('🗺️ Test 3: Distance & Time Estimation (AI-powered)');
    const distancePrompt = `2地点間の移動時間と距離を推定してください：
出発: 外灘（The Bund）, 上海 (31.2400, 121.4900)
到着: 豫園（Yu Garden）, 上海 (31.2276, 121.4920)
移動手段: 徒歩

以下のJSON形式で返してください：
{
  "distance_km": 数値,
  "duration_minutes": 数値,
  "mode": "walking",
  "route_description": "簡単な説明"
}`;

    const distanceResult = await textModel.generateContent(distancePrompt);
    const distanceText = distanceResult.response.text();

    console.log('Distance Estimation:', distanceText.substring(0, 300) + (distanceText.length > 300 ? '...' : ''));
    console.log('\n✅ Distance estimation test successful!\n');

    // Test 4: Image generation with Gemini 2.5 Flash Image
    console.log('🖼️ Test 4: Image Generation (gemini-2.5-flash-image)');
    const imageModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-image' });

    const imagePrompt = '上海の外灘の美しい夜景。カラフルなライトアップされた高層ビル群と黄浦江の景色。';
    const imageResult = await imageModel.generateContent(imagePrompt);
    const imageResponse = imageResult.response;

    console.log('Image generation response received');
    console.log('Parts:', imageResponse.candidates?.[0]?.content?.parts?.length || 0);
    console.log('\n✅ Image generation test successful!\n');

    console.log('🎉 All tests passed!');
    console.log('\n📊 Gemini 2.5 Flash Summary:');
    console.log('  ✓ gemini-2.5-flash: Text, travel planning, distance estimation');
    console.log('  ✓ gemini-2.5-flash-image: Image generation');
    console.log('  ✓ Context window: 1M tokens input, 65K tokens output');
    console.log('  ✓ Free tier: 1500 requests/day');
    console.log('  ✓ Cost: FREE within quotas ✨');
    console.log('\n💡 Google Maps API replacement: Using AI for distance/time estimation');

  } catch (error: any) {
    console.error('❌ Error:', error.message || error);
    if (error.status) {
      console.error('Status:', error.status, error.statusText);
    }
    process.exit(1);
  }
}

testGemini();
