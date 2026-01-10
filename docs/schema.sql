-- Agentravel Database Schema
-- Cloudflare D1 (SQLite)
-- Version: 1.0
-- Created: 2026-01-10

-- ============================================
-- users テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,              -- uuidv7
  created_at INTEGER NOT NULL,      -- Unix timestamp (ms)
  last_accessed_at INTEGER NOT NULL -- 最終アクセス時刻
);

CREATE INDEX IF NOT EXISTS idx_users_last_accessed ON users(last_accessed_at);

-- ============================================
-- sessions テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,              -- uuidv7
  user_id TEXT NOT NULL,
  status TEXT NOT NULL,             -- 'planning' | 'completed' | 'failed'
  current_step INTEGER,             -- 現在のステップ（1-13）
  memory_snapshot TEXT NOT NULL,    -- JSON: AgentMemory全体
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);

-- ============================================
-- plans テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS plans (
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

CREATE INDEX IF NOT EXISTS idx_plans_user_id ON plans(user_id);
CREATE INDEX IF NOT EXISTS idx_plans_status ON plans(status);
CREATE INDEX IF NOT EXISTS idx_plans_dates ON plans(start_date, end_date);

-- ============================================
-- days テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS days (
  id TEXT PRIMARY KEY,              -- uuidv7
  plan_id TEXT NOT NULL,
  day_number INTEGER NOT NULL,      -- 1, 2, 3, 4...
  date TEXT NOT NULL,               -- "2026-01-17"
  area TEXT,                        -- "外灘"
  theme TEXT,                       -- "到着日、軽め"

  FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_days_plan_id ON days(plan_id);
CREATE INDEX IF NOT EXISTS idx_days_plan_day ON days(plan_id, day_number);

-- ============================================
-- activities テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS activities (
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

CREATE INDEX IF NOT EXISTS idx_activities_day_id ON activities(day_id);
CREATE INDEX IF NOT EXISTS idx_activities_day_order ON activities(day_id, order_index);

-- ============================================
-- 初期データ（オプション）
-- ============================================

-- なし（本番データは実行時に作成される）
