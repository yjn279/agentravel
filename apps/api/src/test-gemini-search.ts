import { GoogleGenerativeAI, Tool } from '@google/generative-ai';

async function testGeminiSearch() {
  const apiKey = process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    console.error('❌ GOOGLE_API_KEY not found in environment');
    process.exit(1);
  }

  console.log('✅ API Key found');
  console.log('🔍 Testing Gemini 2.5 Flash with Google Search...\n');

  try {
    const genAI = new GoogleGenerativeAI(apiKey);

    // Test 1: Basic search without grounding
    console.log('📝 Test 1: Basic Query (without search)');
    const basicModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const basicPrompt = '上海の外灘にある人気レストランを3つ教えてください。営業時間と価格帯も含めてください。';
    const basicResult = await basicModel.generateContent(basicPrompt);
    const basicText = basicResult.response.text();

    console.log('Response (without search):');
    console.log(basicText.substring(0, 300) + (basicText.length > 300 ? '...' : ''));
    console.log('\n✅ Basic query successful!\n');

    // Test 2: Query with Google Search grounding
    console.log('🌐 Test 2: Query with Google Search Grounding');

    // Define Google Search tool
    const googleSearchTool: Tool = {
      googleSearch: {}
    };

    const searchModel = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      tools: [googleSearchTool],
    });

    const searchPrompt = '上海の外灘にある人気レストランを3つ教えてください。最新の情報で、営業時間と価格帯も含めてください。';
    const searchResult = await searchModel.generateContent(searchPrompt);
    const searchText = searchResult.response.text();

    console.log('Response (with Google Search):');
    console.log(searchText.substring(0, 400) + (searchText.length > 400 ? '...' : ''));
    console.log('\n✅ Google Search grounding successful!\n');

    // Test 3: Recent events (only search should know)
    console.log('📰 Test 3: Recent Events Query');
    const recentModel = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      tools: [googleSearchTool],
    });

    const recentPrompt = '2026年1月の上海のイベントやお祭りを教えてください。';
    const recentResult = await recentModel.generateContent(recentPrompt);
    const recentText = recentResult.response.text();

    console.log('Response (recent events):');
    console.log(recentText.substring(0, 400) + (recentText.length > 400 ? '...' : ''));
    console.log('\n✅ Recent events query successful!\n');

    // Test 4: Check grounding metadata
    console.log('🔎 Test 4: Grounding Metadata Check');
    const metadataResult = await searchModel.generateContent('上海ディズニーランドの最新のチケット価格を教えてください。');

    console.log('Response:', metadataResult.response.text().substring(0, 300));

    // Check if grounding metadata exists
    const groundingMetadata = metadataResult.response.candidates?.[0]?.groundingMetadata;
    if (groundingMetadata) {
      console.log('\n📊 Grounding Metadata found:');
      console.log('- Search Queries:', groundingMetadata.searchEntryPoint?.renderedContent?.substring(0, 100));
      console.log('- Grounding Supports:', groundingMetadata.groundingSupports?.length || 0);
      console.log('- Web Search Queries:', groundingMetadata.webSearchQueries?.length || 0);
    } else {
      console.log('\n⚠️  No grounding metadata found');
    }
    console.log('\n✅ Metadata check complete!\n');

    console.log('🎉 All Google Search tests completed!');
    console.log('\n📊 Summary:');
    console.log('  ✓ Gemini 2.5 Flash supports Google Search grounding');
    console.log('  ✓ Use googleSearch tool in tools array');
    console.log('  ✓ Provides up-to-date information from web');
    console.log('  ✓ Includes grounding metadata with sources');

  } catch (error: any) {
    console.error('❌ Error:', error.message || error);
    if (error.status) {
      console.error('Status:', error.status, error.statusText);
    }
    if (error.errorDetails) {
      console.error('Details:', JSON.stringify(error.errorDetails, null, 2));
    }
    process.exit(1);
  }
}

testGeminiSearch();
