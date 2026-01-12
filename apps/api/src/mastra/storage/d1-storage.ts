/**
 * Mastra D1 Storage Adapter for Cloudflare Workers
 *
 * Uses @mastra/cloudflare-d1 to integrate Mastra with Cloudflare D1 database.
 * This creates separate tables (mastra_threads, mastra_messages, mastra_metadata)
 * that coexist with existing Drizzle tables.
 */

import { D1Store } from '@mastra/cloudflare-d1';

export function createD1Storage(db: D1Database) {
  return new D1Store({
    id: 'agentravel-storage', // Required in Mastra v1
    binding: db,
    tablePrefix: 'mastra_', // Prefix to separate Mastra tables from Drizzle tables
  });
}
