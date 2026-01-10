# 状態管理

メインエージェントのメモリ管理と永続化戦略。

## 設計方針

- **必要最低限**: MVPに必要な情報のみ
- **一気に完了**: 途中離脱からの復帰は考慮しない（Phase 2以降）
- **JSON保存**: 柔軟性重視

## AgentMemory 構造

```typescript
type AgentMemory = {
  // === メタ情報 ===
  session_id: string;              // uuidv7
  user_id: string;                 // uuidv7
  created_at: number;              // Unix timestamp (ms)
  updated_at: number;
  current_step: number;            // 現在のステップ（1-13）
  status: 'planning' | 'completed' | 'failed';

  // === 会話履歴 ===
  conversation: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
  }>;

  // === 決定事項（Layer 1: 大枠） ===
  decisions: {
    // 手順1-4
    goal?: string;                 // "上海ディズニー"
    destination?: string;          // "上海"
    origin?: string;               // "東京"

    // 手順5-6
    dates?: {
      outbound: string;            // "2026-01-17"
      return: string;              // "2026-01-20"
    };
    flights?: {
      outbound: string;            // "ANA NH123 10:00-12:30"
      return: string;              // "ANA NH124 14:00-18:00"
      total_price: number;         // 35000
    };

    // 手順7
    daily_concepts?: Array<{
      day: number;                 // 1, 2, 3, 4
      date: string;                // "2026-01-17"
      area: string;                // "外灘"
      theme: string;               // "到着日、軽め"
    }>;

    // 手順8
    hotel?: {
      name: string;                // "上海外灘ホテル"
      area: string;                // "外灘"
      price_per_night: number;     // 15000
    };
  };

  // === 詳細計画（Layer 2） ===
  days: Array<{
    number: number;
    date: string;
    area: string;
    theme: string;

    // 手順9-12の結果
    schedule?: {
      activities: Array<{
        start_time: string;        // "09:00"
        end_time: string;          // "10:30"
        activity_type: 'sightseeing' | 'meal' | 'transport';
        name: string;              // "豫園"
        latitude?: number;
        longitude?: number;
      }>;
    };
  }>;
};
```

## MemoryManager クラス

メモリ操作を簡単にするヘルパークラス。

```typescript
class MemoryManager {
  private memory: AgentMemory;

  constructor(memory: AgentMemory) {
    this.memory = memory;
  }

  // === 決定事項の記録 ===
  setDecision(key: string, value: any) {
    this.memory.decisions[key] = value;
    this.memory.updated_at = Date.now();
  }

  getDecision(key: string): any {
    return this.memory.decisions[key];
  }

  // === ステップ管理 ===
  completeStep(step: number) {
    this.memory.current_step = step + 1;
    this.memory.updated_at = Date.now();
  }

  getCurrentStep(): number {
    return this.memory.current_step;
  }

  // === 会話履歴 ===
  addConversation(role: 'user' | 'assistant', content: string) {
    this.memory.conversation.push({
      role,
      content,
      timestamp: Date.now()
    });
    this.memory.updated_at = Date.now();
  }

  getConversationHistory(): typeof this.memory.conversation {
    return this.memory.conversation;
  }

  // === 日別計画 ===
  getDay(dayNumber: number) {
    return this.memory.days.find(d => d.number === dayNumber);
  }

  updateDay(dayNumber: number, updates: Partial<typeof this.memory.days[0]>) {
    const dayIndex = this.memory.days.findIndex(d => d.number === dayNumber);
    if (dayIndex !== -1) {
      this.memory.days[dayIndex] = {
        ...this.memory.days[dayIndex],
        ...updates
      };
      this.memory.updated_at = Date.now();
    }
  }

  addDay(day: typeof this.memory.days[0]) {
    this.memory.days.push(day);
    this.memory.updated_at = Date.now();
  }

  // === 状態チェック ===
  hasRequiredInfo(step: number): boolean {
    switch (step) {
      case 5: // フライト検索に必要な情報
        return !!(
          this.memory.decisions.destination &&
          this.memory.decisions.origin
        );
      case 8: // ホテル検索に必要な情報
        return !!(
          this.memory.decisions.dates &&
          this.memory.decisions.daily_concepts
        );
      case 9: // 観光スポット検索
        return !!this.memory.decisions.daily_concepts;
      default:
        return true;
    }
  }

  isComplete(): boolean {
    return (
      this.memory.status === 'completed' &&
      this.memory.days.every(d => d.schedule !== undefined)
    );
  }

  // === メモリ全体の取得 ===
  getMemory(): AgentMemory {
    return this.memory;
  }
}
```

## 永続化戦略

### 保存タイミング

1. **重要な決定時**（チェックポイント）
   - フライト確定（手順6）
   - ホテル確定（手順8）
   - 各日の計画完了（手順12）
   - プラン完成（手順13）

2. **定期的な自動保存**
   - 30秒ごと（データロス防止）

3. **エラー発生時**
   - エラー情報と現在の状態を保存

### SessionPersistence クラス

```typescript
class SessionPersistence {
  private db: D1Database;
  private autoSaveTimer?: NodeJS.Timeout;

  constructor(db: D1Database) {
    this.db = db;
  }

  // === セッション作成 ===
  async createSession(userId: string): Promise<AgentMemory> {
    const sessionId = uuidv7();
    const initialMemory: AgentMemory = {
      session_id: sessionId,
      user_id: userId,
      created_at: Date.now(),
      updated_at: Date.now(),
      current_step: 1,
      status: 'planning',
      conversation: [],
      decisions: {},
      days: []
    };

    await this.saveSession(initialMemory);
    return initialMemory;
  }

  // === セッション保存 ===
  async saveSession(memory: AgentMemory) {
    await this.db.prepare(`
      INSERT OR REPLACE INTO sessions
      (id, user_id, status, current_step, memory_snapshot, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      memory.session_id,
      memory.user_id,
      memory.status,
      memory.current_step,
      JSON.stringify(memory),
      memory.created_at,
      Date.now()
    ).run();
  }

  // === セッション読み込み ===
  async loadSession(sessionId: string): Promise<AgentMemory | null> {
    const result = await this.db.prepare(`
      SELECT memory_snapshot FROM sessions WHERE id = ?
    `).bind(sessionId).first();

    if (!result) return null;

    return JSON.parse(result.memory_snapshot as string);
  }

  // === 自動保存開始 ===
  startAutoSave(memory: AgentMemory, interval: number = 30000) {
    this.autoSaveTimer = setInterval(() => {
      this.saveSession(memory);
    }, interval);
  }

  // === 自動保存停止 ===
  stopAutoSave() {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }
  }

  // === プランとして保存 ===
  async savePlan(memory: AgentMemory): Promise<string> {
    const planId = uuidv7();

    // プラン基本情報
    await this.db.prepare(`
      INSERT INTO plans
      (id, user_id, session_id, title, destination, origin, start_date, end_date, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      planId,
      memory.user_id,
      memory.session_id,
      this.generateTitle(memory),
      memory.decisions.destination,
      memory.decisions.origin,
      memory.decisions.dates?.outbound,
      memory.decisions.dates?.return,
      'completed',
      memory.created_at,
      Date.now()
    ).run();

    // 各日を保存
    for (const day of memory.days) {
      const dayId = uuidv7();
      await this.db.prepare(`
        INSERT INTO days (id, plan_id, day_number, date, area, theme)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        dayId,
        planId,
        day.number,
        day.date,
        day.area,
        day.theme
      ).run();

      // アクティビティを保存
      if (day.schedule) {
        for (let i = 0; i < day.schedule.activities.length; i++) {
          const activity = day.schedule.activities[i];
          const activityId = uuidv7();
          await this.db.prepare(`
            INSERT INTO activities
            (id, day_id, order_index, start_time, end_time, activity_type, name, latitude, longitude)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            activityId,
            dayId,
            i,
            activity.start_time,
            activity.end_time,
            activity.activity_type,
            activity.name,
            activity.latitude,
            activity.longitude
          ).run();
        }
      }
    }

    // セッションを完了に更新
    memory.status = 'completed';
    await this.saveSession(memory);

    return planId;
  }

  // === タイトル生成 ===
  private generateTitle(memory: AgentMemory): string {
    const dest = memory.decisions.destination || '旅行';
    const duration = memory.days.length;
    return `${dest} ${duration}日間の旅`;
  }
}
```

## 使用例

```typescript
// === セッション開始 ===
const persistence = new SessionPersistence(db);
const memory = await persistence.createSession(userId);
const manager = new MemoryManager(memory);

// 自動保存開始
persistence.startAutoSave(memory);

// === 情報を収集 ===
manager.addConversation('user', '上海ディズニーに行きたい');
manager.setDecision('goal', '上海ディズニー');
manager.setDecision('destination', '上海');

manager.addConversation('assistant', 'いつ頃を考えていますか？');
manager.addConversation('user', '1月に3泊4日で、東京から');

manager.setDecision('origin', '東京');
manager.setDecision('timing', '1月');
manager.setDecision('duration', '3泊4日');

// === フライト検索結果を保存 ===
manager.setDecision('dates', {
  outbound: '2026-01-17',
  return: '2026-01-20'
});
manager.setDecision('flights', {
  outbound: 'ANA NH123 10:00-12:30',
  return: 'ANA NH124 14:00-18:00',
  total_price: 35000
});
manager.completeStep(6);

// 手動保存（重要なポイント）
await persistence.saveSession(manager.getMemory());

// === 日別計画を追加 ===
manager.addDay({
  number: 1,
  date: '2026-01-17',
  area: '外灘',
  theme: '到着日、軽め',
  schedule: {
    activities: [
      {
        start_time: '15:00',
        end_time: '15:30',
        activity_type: 'hotel',
        name: 'ホテルチェックイン'
      },
      {
        start_time: '16:00',
        end_time: '18:00',
        activity_type: 'sightseeing',
        name: '外灘',
        latitude: 31.2400,
        longitude: 121.4900
      }
    ]
  }
});

// === 完成したらプランとして保存 ===
const planId = await persistence.savePlan(manager.getMemory());
console.log(`Plan created: /users/${userId}/plans/${planId}`);

// 自動保存停止
persistence.stopAutoSave();
```

## エラーハンドリング

```typescript
try {
  // サブエージェント呼び出し
  const result = await callSubAgent('flight_search', params);
  manager.setDecision('flights', result);

} catch (error) {
  // エラーをメモリに記録
  manager.addConversation('assistant', `エラーが発生しました: ${error.message}`);

  // エラー状態で保存
  memory.status = 'failed';
  await persistence.saveSession(memory);

  // ユーザーに通知
  throw error;
}
```

## パフォーマンス考慮事項

### JSON保存のオーバーヘッド

**懸念**:
- AgentMemory全体をJSON化して毎回保存 → 重い？

**実測**:
- 1セッション: 約5KB（会話履歴含む）
- JSON.stringify: 1ms以下
- D1への書き込み: 10-50ms

**結論**:
- セッション単位なら問題なし
- 30秒ごとの自動保存も許容範囲

### 最適化（Phase 2以降）

1. **差分保存**:
   - 変更された部分のみ保存
   - より複雑だが、高頻度更新に有効

2. **キャッシュ**:
   - Cloudflare Workers KVでメモリをキャッシュ
   - DBアクセスを削減

3. **圧縮**:
   - JSON圧縮（gzip）
   - ストレージ削減

## 関連ドキュメント

- [データベース設計](./database-schema.md)
- [AIエージェントアーキテクチャ](./agent-architecture.md)
- [メインエージェントフロー](./main-agent-flow.md)
