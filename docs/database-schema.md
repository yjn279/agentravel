# データベース設計

Cloudflare D1（SQLite）を使用したデータベース設計。

## 全体方針

- **シンプル**: 必要最低限のテーブル
- **柔軟**: JSON保存で将来の拡張に対応
- **MVP重視**: 一気に完了させる前提（チェックポイント不要）

## テーブル構成

```
users
  ↓ (1:N)
sessions
  ↓ (1:N)
plans
  ↓ (1:N)
days
  ↓ (1:N)
activities
```

## スキーマ定義

### users テーブル

匿名ユーザーの管理。

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,              -- uuidv7
  created_at INTEGER NOT NULL,      -- Unix timestamp (ms)
  last_accessed_at INTEGER NOT NULL -- 最終アクセス時刻
);

CREATE INDEX idx_users_last_accessed ON users(last_accessed_at);
```

**ポイント**:
- 初回アクセス時に自動生成
- `last_accessed_at` で古いユーザーを定期削除（例: 90日以上）

---

### sessions テーブル

エージェントのセッション状態を保存。

```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,              -- uuidv7
  user_id TEXT NOT NULL,
  status TEXT NOT NULL,             -- 'planning' | 'completed' | 'failed'
  current_step INTEGER,             -- 現在のステップ（1-13）
  memory_snapshot TEXT NOT NULL,    -- JSON: AgentMemory全体
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_status ON sessions(status);
```

**ポイント**:
- `memory_snapshot`: AgentMemory全体をJSON文字列で保存
- 柔軟性重視（スキーマ変更に強い）
- MVP: 一気に完了させるため、チェックポイントテーブルは不要

---

### plans テーブル

完成した旅程プラン。

```sql
CREATE TABLE plans (
  id TEXT PRIMARY KEY,              -- uuidv7
  user_id TEXT NOT NULL,
  session_id TEXT,                  -- 元のセッションID（オプション）
  title TEXT NOT NULL,              -- 例: "上海ディズニー 3泊4日"

  -- 基本情報
  destination TEXT NOT NULL,        -- "上海"
  origin TEXT,                      -- "東京"
  start_date TEXT NOT NULL,         -- "2026-01-17"
  end_date TEXT NOT NULL,           -- "2026-01-20"

  -- メタ情報
  status TEXT NOT NULL,             -- 'draft' | 'completed'
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,

  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);

CREATE INDEX idx_plans_user_id ON plans(user_id);
CREATE INDEX idx_plans_status ON plans(status);
CREATE INDEX idx_plans_dates ON plans(start_date, end_date);
```

**ポイント**:
- URL: `/users/{user_id}/plans/{plan_id}`
- `title` はLLMが自動生成
- `session_id` でセッションとの紐付け（デバッグ用）

---

### days テーブル

旅程の各日。

```sql
CREATE TABLE days (
  id TEXT PRIMARY KEY,              -- uuidv7
  plan_id TEXT NOT NULL,
  day_number INTEGER NOT NULL,      -- 1, 2, 3, 4...
  date TEXT NOT NULL,               -- "2026-01-17"
  area TEXT,                        -- "外灘"
  theme TEXT,                       -- "到着日、軽め"

  FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE
);

CREATE INDEX idx_days_plan_id ON days(plan_id);
CREATE INDEX idx_days_plan_day ON days(plan_id, day_number);
```

**ポイント**:
- CASCADE削除: plan削除時にdaysも削除
- `day_number` と `date` の両方を保持

---

### activities テーブル

各日のアクティビティ（観光、食事、移動）。

```sql
CREATE TABLE activities (
  id TEXT PRIMARY KEY,              -- uuidv7
  day_id TEXT NOT NULL,
  order_index INTEGER NOT NULL,     -- その日の中での順序（0始まり）

  -- 時間情報
  start_time TEXT NOT NULL,         -- "09:00"
  end_time TEXT NOT NULL,           -- "10:30"
  duration_minutes INTEGER,         -- 90（計算用）

  -- アクティビティ情報
  activity_type TEXT NOT NULL,      -- 'sightseeing' | 'meal' | 'transport' | 'hotel'
  name TEXT NOT NULL,               -- "豫園" | "南翔饅頭店" | "移動（徒歩）"
  description TEXT,                 -- 簡単な説明（2-3行）
  detailed_description TEXT,        -- 詳細説明（200-300字）

  -- 位置情報
  latitude REAL,
  longitude REAL,
  address TEXT,

  -- 追加情報（JSON）
  metadata TEXT,                    -- JSON: { "price": "¥40", "rating": 4.7, "opening_hours": "..." }

  -- 画像（GPT-5生成）
  image_url TEXT,                   -- 生成された画像URL
  image_prompt TEXT,                -- 画像生成プロンプト（再生成用）

  FOREIGN KEY (day_id) REFERENCES days(id) ON DELETE CASCADE
);

CREATE INDEX idx_activities_day_id ON activities(day_id);
CREATE INDEX idx_activities_day_order ON activities(day_id, order_index);
```

**ポイント**:
- `activity_type` で種類を区別
  - `sightseeing`: 観光スポット
  - `meal`: 食事
  - `transport`: 移動
  - `hotel`: ホテルチェックイン/アウト
- `metadata`: 柔軟に追加情報を保存（JSON）
- `image_url`: GPT-5で生成した画像
- 移動は計算で出すため、保存は任意

---

## データフロー

### 1. セッション開始

```sql
-- 匿名ユーザー作成
INSERT INTO users (id, created_at, last_accessed_at)
VALUES ('user_xxx', 1234567890, 1234567890);

-- セッション作成
INSERT INTO sessions (id, user_id, status, current_step, memory_snapshot, created_at, updated_at)
VALUES ('session_yyy', 'user_xxx', 'planning', 1, '{"session_id":"session_yyy",...}', 1234567890, 1234567890);
```

### 2. セッション進行中（定期保存）

```sql
-- memory_snapshotを更新
UPDATE sessions
SET current_step = 7,
    memory_snapshot = '{"session_id":"session_yyy","current_step":7,...}',
    updated_at = 1234567890
WHERE id = 'session_yyy';
```

### 3. プラン完成

```sql
-- プラン作成
INSERT INTO plans (id, user_id, session_id, title, destination, origin, start_date, end_date, status, created_at, updated_at)
VALUES ('plan_zzz', 'user_xxx', 'session_yyy', '上海ディズニー 3泊4日', '上海', '東京', '2026-01-17', '2026-01-20', 'completed', 1234567890, 1234567890);

-- 各日を作成
INSERT INTO days (id, plan_id, day_number, date, area, theme)
VALUES
  ('day_1', 'plan_zzz', 1, '2026-01-17', '外灘', '到着日、軽め'),
  ('day_2', 'plan_zzz', 2, '2026-01-18', '豫園', '文化体験'),
  ('day_3', 'plan_zzz', 3, '2026-01-19', 'ディズニー', 'メイン'),
  ('day_4', 'plan_zzz', 4, '2026-01-20', '外灘', '帰国日、買い物');

-- アクティビティを作成（Day 1の例）
INSERT INTO activities (id, day_id, order_index, start_time, end_time, duration_minutes, activity_type, name, latitude, longitude, image_url, metadata)
VALUES
  ('act_1', 'day_1', 0, '15:00', '15:30', 30, 'hotel', 'ホテルチェックイン', 31.2400, 121.4900, NULL, NULL),
  ('act_2', 'day_1', 1, '16:00', '18:00', 120, 'sightseeing', '外灘', 31.2400, 121.4900, 'https://...', '{"rating":4.8,...}'),
  ('act_3', 'day_1', 2, '19:00', '21:00', 120, 'meal', '外灘レストランX', 31.2410, 121.4910, 'https://...', '{"price":"¥3000",...}');

-- セッション完了
UPDATE sessions SET status = 'completed', updated_at = 1234567890 WHERE id = 'session_yyy';
```

### 4. プラン編集

```sql
-- アクティビティの時間を変更
UPDATE activities
SET start_time = '16:30', end_time = '18:30', updated_at = 1234567890
WHERE id = 'act_2';

-- プランの更新日時も更新
UPDATE plans SET updated_at = 1234567890 WHERE id = 'plan_zzz';
```

### 5. プラン読み込み

```sql
-- プラン情報取得
SELECT * FROM plans WHERE id = 'plan_zzz';

-- 全日取得
SELECT * FROM days WHERE plan_id = 'plan_zzz' ORDER BY day_number;

-- 各日のアクティビティ取得
SELECT * FROM activities WHERE day_id = 'day_1' ORDER BY order_index;
```

---

## データサイズ見積もり

### 想定
- 1プラン: 4日間
- 1日: 6アクティビティ
- 合計: 24アクティビティ/プラン

### サイズ
- users: ~100 bytes/行
- sessions: ~5KB/行（memory_snapshot）
- plans: ~300 bytes/行
- days: ~200 bytes/行 × 4 = 800 bytes
- activities: ~1KB/行 × 24 = 24KB

**1プラン合計**: 約30KB

**10,000プラン**: 約300MB → D1の無料枠内（5GB）

---

## パフォーマンス最適化

### インデックス
- 重要な外部キーにインデックス作成済み
- 検索頻度が高いカラム（user_id, status, dates）にインデックス

### クエリ最適化
- JOIN を最小限に
- 必要なデータのみSELECT

### キャッシュ戦略（Phase 2以降）
- Cloudflare Workers KVでプランをキャッシュ
- TTL: 1時間

---

## データ削除戦略

### 古い匿名ユーザーの削除

```sql
-- 90日以上アクセスのないユーザーを削除
DELETE FROM users
WHERE last_accessed_at < (unixepoch('now') - 90*24*60*60) * 1000;

-- CASCADE削除により関連データも自動削除
```

### 未完了セッションの削除

```sql
-- 7日以上経過した未完了セッションを削除
DELETE FROM sessions
WHERE status = 'planning'
  AND created_at < (unixepoch('now') - 7*24*60*60) * 1000;
```

---

## マイグレーション

初期セットアップ用のSQLファイル。

```sql
-- schema.sql

-- users
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  last_accessed_at INTEGER NOT NULL
);
CREATE INDEX idx_users_last_accessed ON users(last_accessed_at);

-- sessions
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  status TEXT NOT NULL,
  current_step INTEGER,
  memory_snapshot TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_status ON sessions(status);

-- plans
CREATE TABLE plans (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  session_id TEXT,
  title TEXT NOT NULL,
  destination TEXT NOT NULL,
  origin TEXT,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);
CREATE INDEX idx_plans_user_id ON plans(user_id);
CREATE INDEX idx_plans_status ON plans(status);
CREATE INDEX idx_plans_dates ON plans(start_date, end_date);

-- days
CREATE TABLE days (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL,
  day_number INTEGER NOT NULL,
  date TEXT NOT NULL,
  area TEXT,
  theme TEXT,
  FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE
);
CREATE INDEX idx_days_plan_id ON days(plan_id);
CREATE INDEX idx_days_plan_day ON days(plan_id, day_number);

-- activities
CREATE TABLE activities (
  id TEXT PRIMARY KEY,
  day_id TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  duration_minutes INTEGER,
  activity_type TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  detailed_description TEXT,
  latitude REAL,
  longitude REAL,
  address TEXT,
  metadata TEXT,
  image_url TEXT,
  image_prompt TEXT,
  FOREIGN KEY (day_id) REFERENCES days(id) ON DELETE CASCADE
);
CREATE INDEX idx_activities_day_id ON activities(day_id);
CREATE INDEX idx_activities_day_order ON activities(day_id, order_index);
```

## 関連ドキュメント

- [状態管理](./state-management.md)
- [AIエージェントアーキテクチャ](./agent-architecture.md)
