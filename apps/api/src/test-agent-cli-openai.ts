/**
 * Agent CLI Test Tool (OpenAI Version)
 *
 * Test the main agent in an interactive CLI mode using OpenAI GPT-5 Mini.
 * This allows testing the complete 13-step travel planning flow.
 */

import { MainAgent } from './mastra/agents/main-agent-openai';
import * as readline from 'readline';

// Mock D1 Database for local testing
class MockD1Database implements D1Database {
  private data: Map<string, any> = new Map();

  async prepare(query: string) {
    return {
      bind: (...params: any[]) => ({
        run: async () => ({ success: true, results: [] }),
        first: async () => this.data.get(params[0]) || null,
        all: async () => ({ results: [] }),
      }),
    } as any;
  }

  async batch(statements: any[]) {
    return [];
  }

  async dump() {
    return new ArrayBuffer(0);
  }

  async exec(query: string) {
    return { count: 0, duration: 0 };
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║    Agentravel Agent CLI Test Tool (OpenAI GPT-5 Mini)     ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Get API key from environment
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY not found in environment');
    process.exit(1);
  }

  console.log('✅ API Key found');
  console.log('🤖 Initializing agent...\n');

  // Create mock database
  const mockDb = new MockD1Database();

  // Create agent
  const agent = new MainAgent({
    apiKey,
    db: mockDb as any,
    userId: 'test-user-' + Date.now(),
  });

  // Initialize session
  await agent.initialize('test-user-' + Date.now());

  console.log('✨ Agent initialized!\n');
  console.log('💬 Start chatting with the agent. Type "exit" to quit.\n');
  console.log('📝 Example inputs:');
  console.log('   - "上海ディズニーに1月に3泊4日で行きたい。東京から。"');
  console.log('   - "沖縄でビーチリゾート、2泊3日"');
  console.log('   - "京都で寺社巡り"\n');
  console.log('─────────────────────────────────────────────────────────────\n');

  // Create readline interface
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  // Chat loop
  const chat = async () => {
    rl.question('You: ', async (input) => {
      if (input.toLowerCase() === 'exit') {
        console.log('\n👋 Goodbye!');
        rl.close();
        return;
      }

      if (!input.trim()) {
        chat();
        return;
      }

      try {
        console.log('\n🤔 Agent is thinking...\n');

        const result = await agent.chat(input);

        console.log('─────────────────────────────────────────────────────────────');
        console.log('Agent:', result.response);
        console.log('─────────────────────────────────────────────────────────────');

        // Show current state
        const memory = agent.getMemory();
        console.log(`\n📊 Current State:`);
        console.log(`   Step: ${memory.current_step}/13`);
        console.log(`   Status: ${memory.status}`);
        if (memory.decisions.destination) {
          console.log(`   Destination: ${memory.decisions.destination}`);
        }
        if (memory.decisions.dates) {
          console.log(`   Dates: ${memory.decisions.dates.outbound} - ${memory.decisions.dates.return}`);
        }
        console.log(`   Days planned: ${memory.days.length}`);
        console.log('');

        if (result.completed) {
          console.log('\n🎉 Travel plan completed!');
          console.log(`📋 Session ID: ${agent.getSessionId()}`);
          console.log('\nFull plan saved to database.\n');

          rl.question('Continue chatting? (y/n): ', (answer) => {
            if (answer.toLowerCase() === 'y') {
              chat();
            } else {
              console.log('\n👋 Goodbye!');
              rl.close();
            }
          });
        } else {
          chat();
        }
      } catch (error: any) {
        console.error('\n❌ Error:', error.message);
        console.error(error.stack);
        chat();
      }
    });
  };

  // Start chat loop
  chat();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
