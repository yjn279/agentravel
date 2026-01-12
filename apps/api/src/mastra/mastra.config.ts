/**
 * Mastra Configuration for Cloudflare Workers
 *
 * This file sets up the Mastra instance with:
 * - D1Store for storage (Prisma-free)
 * - OpenAI-only agents and tools
 */

import { Mastra } from '@mastra/core/mastra';
import { createOpenAI } from '@ai-sdk/openai';
import { createD1Storage } from './storage/d1-storage';
import { createTravelPlanningAgent } from './agents/main-agent';
import { getAllTools } from './tools';

export function createMastraInstance(config: {
  openaiApiKey: string;
  db: D1Database;
}) {
  // Cloudflare D1 storage (no Prisma dependency)
  const storage = createD1Storage(config.db);

  console.log('Creating OpenAI model instance...');
  const openai = createOpenAI({
    apiKey: config.openaiApiKey,
  });

  console.log('Creating travel planning agent...');
  const travelPlanningAgent = createTravelPlanningAgent({
    openaiApiKey: config.openaiApiKey,
    openai, // Pass the OpenAI provider to create LanguageModel
    storage, // Pass D1Store for Memory instance
  });
  console.log('Travel planning agent created:', travelPlanningAgent);

  console.log('Getting all tools...');
  const tools = getAllTools(config.openaiApiKey);
  console.log('Tools created:', Object.keys(tools));

  console.log('Creating Mastra instance with config...');
  const mastraConfig = {
    agents: {
      travelPlanning: travelPlanningAgent,
    },
    tools,
    storage,
    models: {
      openai,
    },
  };
  console.log('Mastra config:', mastraConfig);

  const mastra = new Mastra(mastraConfig);
  console.log('Mastra instance created:', mastra);

  return mastra;
}
