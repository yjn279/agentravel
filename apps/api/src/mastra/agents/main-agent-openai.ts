/**
 * Main Travel Planning Agent (OpenAI Version)
 *
 * Orchestrates the entire 13-step travel planning process using OpenAI GPT-5 Mini.
 * Uses a ReAct (Reasoning + Acting) pattern to iteratively build a complete itinerary.
 */

import OpenAI from 'openai';
import { MemoryManager, createMemory } from '../memory/manager';
import { SessionPersistence } from '../memory/persistence';
import type { AgentMemory } from '@agentravel/shared/types';
import { generateJSON, generateText } from '../tools/openai-text';

// Import sub-agents
import { searchFlights, suggestAlternativeDates } from './flight-search';
import { searchAccommodation, recommendHotelLocation } from './accommodation-search';
import { searchAttractions } from './attraction-search';
import { searchRestaurants } from './restaurant-search';
import { optimizeRoute } from './route-optimization';

const SYSTEM_PROMPT = `あなたは旅行計画アシスタントです。ユーザーの旅行の夢を、詳細で実現可能な旅程に変換します。

# あなたの役割

ユーザーと自然な対話を通じて、以下の13ステップで旅行計画を作成します：

## Phase 1: 基本情報の収集（ステップ1-4）

1. **目的の明確化**: ユーザーの旅行の目的を理解します（リラックス、冒険、文化体験など）
2. **目的地の決定**: まだ決まっていなければ提案します
3. **時期の決定**: 季節や具体的な日付を決めます
4. **期間の決定**: 何泊何日かを決めます

## Phase 2: フライトと宿泊（ステップ5-8）

5. **フライト検索**: 出発地と目的地間のフライトを検索します
6. **日程の確定**: フライトの空き状況に基づいて最終的な日程を確定します
7. **日別コンセプト決定**: 各日のエリアとテーマを決めます
8. **宿泊先検索**: 日別の訪問エリアに基づいて最適なホテルを提案します

## Phase 3: 詳細プラン（ステップ9-12）

各日について以下を実行：
9. **観光スポット検索**: エリアとテーマに合った観光地を検索
10. **レストラン検索**: ランチとディナーのレストランを検索
11. **ルート最適化**: 訪問順序を最適化
12. **詳細タイムライン作成**: 移動時間を含めた詳細スケジュールを作成

## Phase 4: 最終確認（ステップ13）

13. **検証と調整**: プラン全体を確認し、必要に応じて調整を提案

# 会話スタイル

- 自然で親しみやすい日本語で対話してください
- すでに分かっている情報は再度聞かないでください
- 明確な回答を引き出すため、選択肢を提示することも可能です
- 推薦する際は、その理由も説明してください

# 重要な原則

1. **段階的な進行**: 必要な情報が揃ったら、確認を待たずに次のステップに進んでください
2. **エラーハンドリング**: 検索で結果が見つからない場合は、代替案を自動的に提案してください
3. **現実的な計画**: 移動時間、営業時間、疲労度を考慮した実現可能なプランを作成してください

# 完了の合図

すべてのステップが完了し、完全な旅程が作成できたら、以下のフォーマットで出力してください：

[COMPLETE]
{
  "plan_summary": "旅程の概要（2-3文）",
  "highlights": ["ハイライト1", "ハイライト2", "ハイライト3"],
  "total_cost_estimate": "概算費用（円）",
  "travel_tips": ["アドバイス1", "アドバイス2"]
}

# 現在の状態

現在のステップ: {current_step}
収集済み情報:
- 目的地: {destination}
- 出発地: {origin}
- 日程: {dates}
- 期間: {duration}日間`;

export interface MainAgentConfig {
  apiKey: string;
  db: D1Database;
  userId: string;
  sessionId?: string;
  model?: string; // Default: gpt-5-mini-2025-08-07
}

export class MainAgent {
  private client: OpenAI;
  private apiKey: string;
  private model: string;
  private memoryManager: MemoryManager;
  private persistence: SessionPersistence;
  private maxIterations: number = 30;

  constructor(config: MainAgentConfig) {
    this.client = new OpenAI({ apiKey: config.apiKey });
    this.apiKey = config.apiKey;
    this.model = config.model || 'gpt-5-mini-2025-08-07';
    this.persistence = new SessionPersistence(config.db);
  }

  /**
   * Initialize or resume a session
   */
  async initialize(userId: string, sessionId?: string): Promise<AgentMemory> {
    let memory: AgentMemory;

    if (sessionId) {
      const loaded = await this.persistence.loadSession(sessionId);
      if (loaded) {
        memory = loaded;
        console.log(`📂 Resumed session: ${sessionId}`);
      } else {
        memory = await this.persistence.createSession(userId);
        console.log(`✨ Created new session: ${memory.session_id}`);
      }
    } else {
      memory = await this.persistence.createSession(userId);
      console.log(`✨ Created new session: ${memory.session_id}`);
    }

    this.memoryManager = new MemoryManager(memory);
    return memory;
  }

  /**
   * Process user message and generate response
   */
  async chat(userMessage: string): Promise<{
    response: string;
    memory: AgentMemory;
    completed: boolean;
  }> {
    // Add user message to memory
    this.memoryManager.addMessage('user', userMessage);

    // Build conversation history
    const messages = this.buildConversationHistory();

    // Generate response with OpenAI
    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: this.buildSystemPrompt() },
          ...messages,
        ],
        max_completion_tokens: 4096,
      });

      const responseText = completion.choices[0].message.content || '';

      // Add assistant response to memory
      this.memoryManager.addMessage('assistant', responseText);

      // Check if completed
      const completed = responseText.includes('[COMPLETE]');

      if (completed) {
        this.memoryManager.complete();
      }

      // Auto-save
      await this.persistence.saveSession(this.memoryManager.getMemory());

      return {
        response: responseText,
        memory: this.memoryManager.getMemory(),
        completed,
      };
    } catch (error: any) {
      console.error('OpenAI chat error:', error);
      throw new Error(`Chat failed: ${error.message || error}`);
    }
  }

  /**
   * Run the agent with a single user input until completion
   */
  async run(userInput: string, sessionId?: string): Promise<AgentMemory> {
    // Initialize session
    const memory = await this.initialize(
      this.memoryManager?.getUserId() || 'anonymous',
      sessionId
    );

    this.memoryManager = new MemoryManager(memory);

    // Start auto-save
    this.persistence.startAutoSave(this.memoryManager.getMemory(), 30000);

    try {
      // First message
      const firstResponse = await this.chat(userInput);

      let iterations = 0;
      let completed = firstResponse.completed;
      let lastResponse = firstResponse.response;

      // Continue conversation until complete or max iterations
      while (!completed && iterations < this.maxIterations) {
        // Auto-generate next message based on current state
        const nextMessage = await this.generateNextMessage(lastResponse);

        if (!nextMessage) {
          console.log('⚠️  No next message generated, stopping');
          break;
        }

        const response = await this.chat(nextMessage);
        lastResponse = response.response;
        completed = response.completed;
        iterations++;

        // Log progress
        console.log(`\n📍 Step ${this.memoryManager.getCurrentStep()}: ${lastResponse.substring(0, 100)}...`);
      }

      if (!completed) {
        console.log('⚠️  Max iterations reached without completion');
        this.memoryManager.setStatus('failed');
      }

      // Stop auto-save
      this.persistence.stopAutoSave();

      // Final save
      await this.persistence.saveSession(this.memoryManager.getMemory());

      // If completed, create permanent plan
      if (completed) {
        const planId = await this.persistence.createPlan(this.memoryManager.getMemory());
        console.log(`\n✅ Plan created: ${planId}`);
      }

      return this.memoryManager.getMemory();
    } catch (error) {
      this.persistence.stopAutoSave();
      throw error;
    }
  }

  /**
   * Build conversation history for OpenAI
   */
  private buildConversationHistory(): Array<{ role: 'user' | 'assistant'; content: string }> {
    const conversation = this.memoryManager.getConversation();

    return conversation.map((msg) => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content,
    }));
  }

  /**
   * Build system prompt with current state
   */
  private buildSystemPrompt(): string {
    const memory = this.memoryManager.getMemory();
    const { destination, origin, dates } = memory.decisions;
    const duration = memory.days.length || (dates ? this.calculateDuration(dates.outbound, dates.return) : '未定');

    return SYSTEM_PROMPT.replace('{current_step}', memory.current_step.toString())
      .replace('{destination}', destination || '未定')
      .replace('{origin}', origin || '未定')
      .replace('{dates}', dates ? `${dates.outbound} 〜 ${dates.return}` : '未定')
      .replace('{duration}', duration.toString());
  }

  /**
   * Generate next message based on current state (for autonomous mode)
   */
  private async generateNextMessage(lastResponse: string): Promise<string | null> {
    const memory = this.memoryManager.getMemory();
    const step = memory.current_step;

    // If last response asks a question, we can't auto-generate
    if (lastResponse.includes('？') || lastResponse.includes('?')) {
      return null;
    }

    // Based on current step, generate appropriate next input
    switch (step) {
      case 1: // Purpose clarification
        if (!memory.decisions.goal) {
          return null; // Need user input
        }
        return '進めてください';

      case 2: // Destination
        if (!memory.decisions.destination) {
          return null;
        }
        return '進めてください';

      case 3: // Timing
      case 4: // Duration
        return '進めてください';

      case 5: // Flight search
      case 6: // Date confirmation
        if (!memory.decisions.flights) {
          return 'フライトを検索してください';
        }
        return '進めてください';

      case 7: // Daily concepts
        if (!memory.decisions.daily_concepts) {
          return '各日のプランを提案してください';
        }
        return '進めてください';

      case 8: // Accommodation
        if (!memory.decisions.hotel) {
          return 'ホテルを検索してください';
        }
        return '進めてください';

      case 9: // Attractions
      case 10: // Restaurants
      case 11: // Route optimization
      case 12: // Detailed timeline
        return '次の日のプランも作成してください';

      case 13: // Validation
        return '完成したプランを見せてください';

      default:
        return null;
    }
  }

  /**
   * Calculate duration in days
   */
  private calculateDuration(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diff = end.getTime() - start.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end days
  }

  /**
   * Get current session memory
   */
  getMemory(): AgentMemory {
    return this.memoryManager.getMemory();
  }

  /**
   * Get session ID
   */
  getSessionId(): string {
    return this.memoryManager.getSessionId();
  }

  /**
   * Get user ID
   */
  getUserId(): string {
    return this.memoryManager.getUserId();
  }
}
