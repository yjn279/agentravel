import { GoogleGenerativeAI } from '@google/generative-ai';

async function listModels() {
  const apiKey = process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    console.error('❌ GOOGLE_API_KEY not found');
    process.exit(1);
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  try {
    console.log('📋 Listing available Gemini models...\n');

    const models = await genAI.listModels();

    console.log('Available models:');
    for (const model of models) {
      console.log(`- ${model.name}`);
      console.log(`  Display name: ${model.displayName}`);
      console.log(`  Supported methods: ${model.supportedGenerationMethods?.join(', ')}`);
      console.log('');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

listModels();
