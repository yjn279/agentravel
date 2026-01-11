/**
 * AgentMemory Type Definitions
 * Based on docs/state-management.md
 *
 * This type represents the complete state of an agent session,
 * including conversation history, decisions made, and detailed daily plans.
 */

// === メッセージ型 ===
export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number; // Unix timestamp (ms)
}

// === 決定事項（Layer 1: 大枠） ===

export interface DateRange {
  outbound: string; // "2026-01-17"
  return: string;   // "2026-01-20"
}

export interface FlightInfo {
  outbound: string;      // "ANA NH123 10:00-12:30"
  return: string;        // "ANA NH124 14:00-18:00"
  total_price: number;   // 35000
}

export interface DailyConcept {
  day: number;           // 1, 2, 3, 4
  date: string;          // "2026-01-17"
  area: string;          // "外灘"
  theme: string;         // "到着日、軽め"
}

export interface HotelInfo {
  name: string;              // "上海外灘ホテル"
  area: string;              // "外灘"
  price_per_night: number;   // 15000
}

export interface Decisions {
  // 手順1-4
  goal?: string;                    // "上海ディズニー"
  destination?: string;             // "上海"
  origin?: string;                  // "東京"

  // 手順5-6
  dates?: DateRange;
  flights?: FlightInfo;

  // 手順7
  daily_concepts?: DailyConcept[];

  // 手順8
  hotel?: HotelInfo;
}

// === 詳細計画（Layer 2） ===

export type ActivityType = 'sightseeing' | 'meal' | 'transport' | 'hotel';

export interface Activity {
  start_time: string;        // "09:00"
  end_time: string;          // "10:30"
  duration_minutes?: number; // 90
  activity_type: ActivityType;
  name: string;              // "豫園"
  description?: string;      // "明清時代の庭園..."
  detailed_description?: string;

  // 位置情報
  latitude?: number;         // 31.2276
  longitude?: number;        // 121.4920
  address?: string;

  // メタデータ
  metadata?: Record<string, any>;

  // 画像
  image_url?: string;
  image_prompt?: string;
}

export interface DaySchedule {
  activities: Activity[];
}

export interface Day {
  number: number;            // 1, 2, 3, 4
  date: string;              // "2026-01-17"
  area: string;              // "外灘"
  theme: string;             // "到着日、軽め"
  schedule?: DaySchedule;    // 手順9-12の結果
}

// === AgentMemory メイン型 ===

export type SessionStatus = 'planning' | 'completed' | 'failed';

export interface AgentMemory {
  // === メタ情報 ===
  session_id: string;              // uuidv7
  user_id: string;                 // uuidv7
  created_at: number;              // Unix timestamp (ms)
  updated_at: number;
  current_step: number;            // 現在のステップ（1-13）
  status: SessionStatus;

  // === 会話履歴 ===
  conversation: ConversationMessage[];

  // === 決定事項（Layer 1: 大枠） ===
  decisions: Decisions;

  // === 詳細計画（Layer 2） ===
  days: Day[];
}

// === ヘルパー型 ===

export interface Location {
  lat: number;
  lng: number;
}

export interface LocationWithName extends Location {
  name: string;
  address?: string;
}

// === 検索結果型 ===

export interface FlightOption {
  outbound: string;
  return: string;
  airline: string;
  price: number;
  duration_hours: number;
}

export interface HotelOption {
  name: string;
  area: string;
  price_per_night: number;
  rating?: number;
  amenities?: string[];
  location: Location;
}

export interface Attraction {
  name: string;
  description: string;
  visit_duration_minutes: number;
  location: Location;
  address?: string;
  business_hours?: string;
  entry_fee?: number;
  rating?: number;
}

export interface Restaurant {
  name: string;
  cuisine: string;
  description: string;
  location: Location;
  address?: string;
  price_range: string; // "¥¥", "¥¥¥", etc.
  business_hours?: string;
  rating?: number;
}

// === ツール入力/出力型 ===

export interface DistanceMatrixInput {
  origin: Location;
  destination: Location;
  mode: 'walking' | 'transit' | 'driving';
}

export interface DistanceMatrixResult {
  distance_km: number;
  duration_minutes: number;
  mode: string;
  route_description?: string;
}

export interface WebSearchInput {
  query: string;
  num_results?: number;
}

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  relevance_score?: number;
}
