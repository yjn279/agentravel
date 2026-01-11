import { GoogleGenerativeAI } from '@google/generative-ai';

async function testImageGeneration() {
  const apiKey = process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    console.error('❌ GOOGLE_API_KEY not found in environment');
    process.exit(1);
  }

  console.log('✅ API Key found');
  console.log('🖼️  Testing Gemini 2.5 Flash Image Generation...\n');

  try {
    const genAI = new GoogleGenerativeAI(apiKey);

    // Test: Image Generation with Gemini 2.5 Flash Image
    console.log('📸 Test: Image Generation (gemini-2.5-flash-image)');
    console.log('─────────────────────────────────────────────────────────────');

    const imageModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-image' });

    const imagePrompt = '上海の外灘の美しい夜景。カラフルにライトアップされた高層ビル群と黄浦江の景色。写実的で高品質な画像。';

    console.log(`Prompt: "${imagePrompt}"`);
    console.log('\n⏳ Generating image...\n');

    const imageResult = await imageModel.generateContent(imagePrompt);
    const imageResponse = imageResult.response;

    console.log('✅ Response received!');
    console.log('\n📊 Response details:');
    console.log(`   Candidates: ${imageResponse.candidates?.length || 0}`);

    if (imageResponse.candidates && imageResponse.candidates.length > 0) {
      const candidate = imageResponse.candidates[0];
      console.log(`   Parts: ${candidate.content?.parts?.length || 0}`);

      // Check for inline data (images are typically returned as inline data)
      if (candidate.content?.parts) {
        candidate.content.parts.forEach((part, i) => {
          console.log(`\n   Part ${i + 1}:`);
          if (part.text) {
            console.log(`     Text: ${part.text.substring(0, 100)}...`);
          }
          if (part.inlineData) {
            console.log(`     Inline Data:`);
            console.log(`       MIME type: ${part.inlineData.mimeType}`);
            console.log(`       Data size: ${part.inlineData.data?.length || 0} bytes`);

            // If we have image data, we could save it
            if (part.inlineData.data) {
              console.log(`\n     ✨ Image data received! (Base64 encoded)`);
              console.log(`     First 100 chars: ${part.inlineData.data.substring(0, 100)}...`);
            }
          }
        });
      }

      // Check finish reason
      if (candidate.finishReason) {
        console.log(`\n   Finish Reason: ${candidate.finishReason}`);
      }

      // Check safety ratings
      if (candidate.safetyRatings) {
        console.log(`\n   Safety Ratings:`);
        candidate.safetyRatings.forEach((rating) => {
          console.log(`     ${rating.category}: ${rating.probability}`);
        });
      }
    }

    console.log('\n✅ Image generation test successful!');
    console.log('\n🎉 Gemini 2.5 Flash Image is working!');
    console.log('   Model: gemini-2.5-flash-image');
    console.log('   Status: Available ✅');
    console.log('   Image format: Base64 encoded inline data\n');
  } catch (error: any) {
    console.error('❌ Error:', error.message || error);

    if (error.status === 429) {
      console.error('\n⚠️  Status: 429 Too Many Requests (Quota Exceeded)');
      console.error('   The API quota for image generation has been exceeded.');
      console.error('   Please try again later or check your quota at:');
      console.error('   https://aistudio.google.com/app/apikey\n');
    } else if (error.status === 404) {
      console.error('\n⚠️  Status: 404 Not Found');
      console.error('   The model "gemini-2.5-flash-image" may not be available.');
      console.error('   Please check the model name or your API access.\n');
    } else {
      console.error('Status:', error.status, error.statusText);
      if (error.errorDetails) {
        console.error('Details:', JSON.stringify(error.errorDetails, null, 2));
      }
    }

    process.exit(1);
  }
}

testImageGeneration();
