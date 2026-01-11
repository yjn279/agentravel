/**
 * SessionPersistence
 *
 * Handles database operations for saving and loading agent sessions.
 * Implements auto-save functionality and plan creation.
 * Based on docs/state-management.md
 */

import type { AgentMemory, Day, Activity } from '@agentravel/shared/types';
import { getDb } from '../../db';
import * as schema from '../../db/schema';

/**
 * Generate a UUIDv7 (time-ordered UUID)
 * For production, use a proper UUID v7 library
 */
function generateUuidV7(): string {
  // Simplified implementation - for production use a proper library
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${random}`;
}

export class SessionPersistence {
  private db: ReturnType<typeof getDb>;
  private autoSaveTimer?: NodeJS.Timeout;

  constructor(d1Database: D1Database) {
    this.db = getDb(d1Database);
  }

  // === Session Operations ===

  /**
   * Create a new session
   */
  async createSession(userId: string): Promise<AgentMemory> {
    const sessionId = generateUuidV7();
    const now = Date.now();

    const memory: AgentMemory = {
      session_id: sessionId,
      user_id: userId,
      created_at: now,
      updated_at: now,
      current_step: 1,
      status: 'planning',
      conversation: [],
      decisions: {},
      days: [],
    };

    // Create user if doesn't exist
    try {
      await this.db
        .insert(schema.users)
        .values({
          id: userId,
          createdAt: new Date(now),
          lastAccessedAt: new Date(now),
        })
        .onConflictDoUpdate({
          target: schema.users.id,
          set: { lastAccessedAt: new Date(now) },
        });
    } catch (error) {
      console.error('Error creating/updating user:', error);
    }

    // Save initial session
    await this.saveSession(memory);

    return memory;
  }

  /**
   * Save session to database
   */
  async saveSession(memory: AgentMemory): Promise<void> {
    const now = Date.now();

    try {
      await this.db
        .insert(schema.sessions)
        .values({
          id: memory.session_id,
          userId: memory.user_id,
          status: memory.status,
          currentStep: memory.current_step,
          memorySnapshot: JSON.stringify(memory),
          createdAt: new Date(memory.created_at),
          updatedAt: new Date(now),
        })
        .onConflictDoUpdate({
          target: schema.sessions.id,
          set: {
            status: memory.status,
            currentStep: memory.current_step,
            memorySnapshot: JSON.stringify(memory),
            updatedAt: new Date(now),
          },
        });
    } catch (error) {
      console.error('Error saving session:', error);
      throw new Error('Failed to save session to database');
    }
  }

  /**
   * Load session from database
   */
  async loadSession(sessionId: string): Promise<AgentMemory | null> {
    try {
      const result = await this.db.query.sessions.findFirst({
        where: (sessions, { eq }) => eq(sessions.id, sessionId),
      });

      if (!result) {
        return null;
      }

      const memory: AgentMemory = JSON.parse(result.memorySnapshot);
      return memory;
    } catch (error) {
      console.error('Error loading session:', error);
      return null;
    }
  }

  /**
   * Get all sessions for a user
   */
  async getUserSessions(userId: string): Promise<AgentMemory[]> {
    try {
      const results = await this.db.query.sessions.findMany({
        where: (sessions, { eq }) => eq(sessions.userId, userId),
        orderBy: (sessions, { desc }) => [desc(sessions.updatedAt)],
      });

      return results.map((result) => JSON.parse(result.memorySnapshot));
    } catch (error) {
      console.error('Error loading user sessions:', error);
      return [];
    }
  }

  // === Auto-Save ===

  /**
   * Start auto-save timer
   * Saves the memory snapshot every `interval` milliseconds
   */
  startAutoSave(memory: AgentMemory, interval: number = 30000): void {
    // Clear existing timer if any
    this.stopAutoSave();

    this.autoSaveTimer = setInterval(() => {
      this.saveSession(memory).catch((error) => {
        console.error('Auto-save failed:', error);
      });
    }, interval);
  }

  /**
   * Stop auto-save timer
   */
  stopAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = undefined;
    }
  }

  // === Plan Creation ===

  /**
   * Create a permanent plan from a completed session
   * Converts session memory into plans/days/activities tables
   */
  async createPlan(memory: AgentMemory): Promise<string> {
    const planId = generateUuidV7();
    const now = Date.now();

    const { destination, origin, dates } = memory.decisions;

    if (!destination || !dates) {
      throw new Error('Cannot create plan: missing required information');
    }

    try {
      // Create plan
      await this.db.insert(schema.plans).values({
        id: planId,
        userId: memory.user_id,
        sessionId: memory.session_id,
        title: `${destination}への旅`,
        destination,
        origin: origin || null,
        startDate: dates.outbound,
        endDate: dates.return,
        status: 'completed',
        createdAt: new Date(now),
        updatedAt: new Date(now),
      });

      // Create days and activities
      for (const day of memory.days) {
        const dayId = generateUuidV7();

        await this.db.insert(schema.days).values({
          id: dayId,
          planId,
          dayNumber: day.number,
          date: day.date,
          area: day.area || null,
          theme: day.theme || null,
        });

        // Create activities if schedule exists
        if (day.schedule && day.schedule.activities) {
          for (let i = 0; i < day.schedule.activities.length; i++) {
            const activity = day.schedule.activities[i];
            const activityId = generateUuidV7();

            await this.db.insert(schema.activities).values({
              id: activityId,
              dayId,
              orderIndex: i,
              startTime: activity.start_time,
              endTime: activity.end_time,
              durationMinutes: activity.duration_minutes || null,
              activityType: activity.activity_type,
              name: activity.name,
              description: activity.description || null,
              detailedDescription: activity.detailed_description || null,
              latitude: activity.latitude || null,
              longitude: activity.longitude || null,
              address: activity.address || null,
              metadata: activity.metadata ? JSON.stringify(activity.metadata) : null,
              imageUrl: activity.image_url || null,
              imagePrompt: activity.image_prompt || null,
            });
          }
        }
      }

      return planId;
    } catch (error) {
      console.error('Error creating plan:', error);
      throw new Error('Failed to create plan');
    }
  }

  /**
   * Get a plan with all days and activities
   */
  async getPlan(planId: string): Promise<{
    plan: typeof schema.plans.$inferSelect;
    days: Array<{
      day: typeof schema.days.$inferSelect;
      activities: Array<typeof schema.activities.$inferSelect>;
    }>;
  } | null> {
    try {
      const plan = await this.db.query.plans.findFirst({
        where: (plans, { eq }) => eq(plans.id, planId),
      });

      if (!plan) {
        return null;
      }

      const days = await this.db.query.days.findMany({
        where: (days, { eq }) => eq(days.planId, planId),
        orderBy: (days, { asc }) => [asc(days.dayNumber)],
      });

      const daysWithActivities = await Promise.all(
        days.map(async (day) => {
          const activities = await this.db.query.activities.findMany({
            where: (activities, { eq }) => eq(activities.dayId, day.id),
            orderBy: (activities, { asc }) => [asc(activities.orderIndex)],
          });

          return { day, activities };
        })
      );

      return { plan, days: daysWithActivities };
    } catch (error) {
      console.error('Error getting plan:', error);
      return null;
    }
  }

  /**
   * Get all plans for a user
   */
  async getUserPlans(userId: string): Promise<Array<typeof schema.plans.$inferSelect>> {
    try {
      const plans = await this.db.query.plans.findMany({
        where: (plans, { eq }) => eq(plans.userId, userId),
        orderBy: (plans, { desc }) => [desc(plans.createdAt)],
      });

      return plans;
    } catch (error) {
      console.error('Error getting user plans:', error);
      return [];
    }
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<void> {
    try {
      await this.db.delete(schema.sessions).where((sessions, { eq }) => eq(sessions.id, sessionId));
    } catch (error) {
      console.error('Error deleting session:', error);
      throw new Error('Failed to delete session');
    }
  }

  /**
   * Delete a plan (cascade deletes days and activities)
   */
  async deletePlan(planId: string): Promise<void> {
    try {
      await this.db.delete(schema.plans).where((plans, { eq }) => eq(plans.id, planId));
    } catch (error) {
      console.error('Error deleting plan:', error);
      throw new Error('Failed to delete plan');
    }
  }
}
