import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

// ============================================
// users テーブル
// ============================================
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  lastAccessedAt: integer('last_accessed_at', { mode: 'timestamp_ms' }).notNull(),
});

// ============================================
// sessions テーブル
// ============================================
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  status: text('status').notNull(), // 'planning' | 'completed' | 'failed'
  currentStep: integer('current_step'),
  memorySnapshot: text('memory_snapshot').notNull(), // JSON: AgentMemory全体
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

// ============================================
// plans テーブル
// ============================================
export const plans = sqliteTable('plans', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  sessionId: text('session_id').references(() => sessions.id),
  title: text('title').notNull(),
  destination: text('destination').notNull(),
  origin: text('origin'),
  startDate: text('start_date').notNull(),
  endDate: text('end_date').notNull(),
  status: text('status').notNull(), // 'draft' | 'completed'
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

// ============================================
// days テーブル
// ============================================
export const days = sqliteTable('days', {
  id: text('id').primaryKey(),
  planId: text('plan_id')
    .notNull()
    .references(() => plans.id, { onDelete: 'cascade' }),
  dayNumber: integer('day_number').notNull(),
  date: text('date').notNull(),
  area: text('area'),
  theme: text('theme'),
});

// ============================================
// activities テーブル
// ============================================
export const activities = sqliteTable('activities', {
  id: text('id').primaryKey(),
  dayId: text('day_id')
    .notNull()
    .references(() => days.id, { onDelete: 'cascade' }),
  orderIndex: integer('order_index').notNull(),

  // 時間情報
  startTime: text('start_time').notNull(),
  endTime: text('end_time').notNull(),
  durationMinutes: integer('duration_minutes'),

  // アクティビティ情報
  activityType: text('activity_type').notNull(), // 'sightseeing' | 'meal' | 'transport' | 'hotel'
  name: text('name').notNull(),
  description: text('description'),
  detailedDescription: text('detailed_description'),

  // 位置情報
  latitude: real('latitude'),
  longitude: real('longitude'),
  address: text('address'),

  // 追加情報（JSON）
  metadata: text('metadata'), // JSON: { "price": "¥40", "rating": 4.7, "opening_hours": "..." }

  // 画像（GPT-5.2生成）
  imageUrl: text('image_url'),
  imagePrompt: text('image_prompt'),
});
