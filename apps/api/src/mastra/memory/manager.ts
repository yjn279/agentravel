/**
 * MemoryManager
 *
 * Manages the agent's memory state throughout the conversation.
 * Based on docs/state-management.md
 */

import type {
  AgentMemory,
  ConversationMessage,
  Decisions,
  Day,
  Activity,
  DailyConcept,
  SessionStatus,
} from '@agentravel/shared/types';

export class MemoryManager {
  private memory: AgentMemory;

  constructor(initialMemory: AgentMemory) {
    this.memory = initialMemory;
  }

  // === Memory Access ===

  /**
   * Get the complete memory object
   */
  getMemory(): AgentMemory {
    return this.memory;
  }

  /**
   * Get current session ID
   */
  getSessionId(): string {
    return this.memory.session_id;
  }

  /**
   * Get current user ID
   */
  getUserId(): string {
    return this.memory.user_id;
  }

  /**
   * Get current step number
   */
  getCurrentStep(): number {
    return this.memory.current_step;
  }

  /**
   * Get session status
   */
  getStatus(): SessionStatus {
    return this.memory.status;
  }

  // === Conversation Management ===

  /**
   * Add a message to the conversation history
   */
  addMessage(role: 'user' | 'assistant', content: string): void {
    const message: ConversationMessage = {
      role,
      content,
      timestamp: Date.now(),
    };

    this.memory.conversation.push(message);
    this.memory.updated_at = Date.now();
  }

  /**
   * Get the full conversation history
   */
  getConversation(): ConversationMessage[] {
    return this.memory.conversation;
  }

  /**
   * Get the last N messages
   */
  getRecentMessages(n: number): ConversationMessage[] {
    return this.memory.conversation.slice(-n);
  }

  // === Step Management ===

  /**
   * Advance to the next step
   */
  advanceStep(): void {
    this.memory.current_step += 1;
    this.memory.updated_at = Date.now();
  }

  /**
   * Set the current step explicitly
   */
  setStep(step: number): void {
    this.memory.current_step = step;
    this.memory.updated_at = Date.now();
  }

  // === Status Management ===

  /**
   * Update session status
   */
  setStatus(status: SessionStatus): void {
    this.memory.status = status;
    this.memory.updated_at = Date.now();
  }

  /**
   * Mark session as completed
   */
  complete(): void {
    this.setStatus('completed');
  }

  /**
   * Mark session as failed
   */
  fail(): void {
    this.setStatus('failed');
  }

  // === Decision Management (Layer 1) ===

  /**
   * Set a decision value
   */
  setDecision<K extends keyof Decisions>(key: K, value: Decisions[K]): void {
    this.memory.decisions[key] = value;
    this.memory.updated_at = Date.now();
  }

  /**
   * Get a decision value
   */
  getDecision<K extends keyof Decisions>(key: K): Decisions[K] {
    return this.memory.decisions[key];
  }

  /**
   * Check if a decision has been made
   */
  hasDecision<K extends keyof Decisions>(key: K): boolean {
    return this.memory.decisions[key] !== undefined;
  }

  /**
   * Get all decisions
   */
  getDecisions(): Decisions {
    return this.memory.decisions;
  }

  /**
   * Set the travel goal
   */
  setGoal(goal: string): void {
    this.setDecision('goal', goal);
  }

  /**
   * Set the destination
   */
  setDestination(destination: string): void {
    this.setDecision('destination', destination);
  }

  /**
   * Set the origin
   */
  setOrigin(origin: string): void {
    this.setDecision('origin', origin);
  }

  // === Day Management (Layer 2) ===

  /**
   * Add a day to the itinerary
   */
  addDay(day: Day): void {
    this.memory.days.push(day);
    this.memory.updated_at = Date.now();
  }

  /**
   * Get a specific day by number
   */
  getDay(dayNumber: number): Day | undefined {
    return this.memory.days.find((d) => d.number === dayNumber);
  }

  /**
   * Get all days
   */
  getDays(): Day[] {
    return this.memory.days;
  }

  /**
   * Update a day's schedule
   */
  updateDaySchedule(dayNumber: number, activities: Activity[]): void {
    const day = this.getDay(dayNumber);
    if (day) {
      day.schedule = { activities };
      this.memory.updated_at = Date.now();
    }
  }

  /**
   * Add an activity to a specific day
   */
  addActivity(dayNumber: number, activity: Activity): void {
    const day = this.getDay(dayNumber);
    if (day) {
      if (!day.schedule) {
        day.schedule = { activities: [] };
      }
      day.schedule.activities.push(activity);
      this.memory.updated_at = Date.now();
    }
  }

  /**
   * Get the number of days in the itinerary
   */
  getDayCount(): number {
    return this.memory.days.length;
  }

  // === Daily Concepts Management ===

  /**
   * Set daily concepts (Step 7)
   */
  setDailyConcepts(concepts: DailyConcept[]): void {
    this.setDecision('daily_concepts', concepts);

    // Also initialize days array based on concepts
    this.memory.days = concepts.map((concept) => ({
      number: concept.day,
      date: concept.date,
      area: concept.area,
      theme: concept.theme,
    }));

    this.memory.updated_at = Date.now();
  }

  // === Helper Methods ===

  /**
   * Get a summary of the current state
   */
  getSummary(): {
    step: number;
    status: SessionStatus;
    destination?: string;
    origin?: string;
    dates?: { start: string; end: string };
    dayCount: number;
  } {
    const dates = this.memory.decisions.dates;

    return {
      step: this.memory.current_step,
      status: this.memory.status,
      destination: this.memory.decisions.destination,
      origin: this.memory.decisions.origin,
      dates: dates
        ? { start: dates.outbound, end: dates.return }
        : undefined,
      dayCount: this.memory.days.length,
    };
  }

  /**
   * Check if all required decisions have been made
   */
  isReadyForPlanning(): boolean {
    const { destination, origin, dates, hotel } = this.memory.decisions;
    return !!(destination && origin && dates && hotel);
  }

  /**
   * Check if the itinerary is complete
   */
  isComplete(): boolean {
    if (this.memory.days.length === 0) return false;

    // Check if all days have schedules with activities
    return this.memory.days.every(
      (day) => day.schedule && day.schedule.activities.length > 0
    );
  }

  /**
   * Create a snapshot of the current memory for serialization
   */
  toJSON(): string {
    return JSON.stringify(this.memory);
  }

  /**
   * Restore memory from a JSON string
   */
  static fromJSON(json: string): MemoryManager {
    const memory: AgentMemory = JSON.parse(json);
    return new MemoryManager(memory);
  }
}

/**
 * Create a new empty memory instance
 */
export function createMemory(userId: string, sessionId: string): AgentMemory {
  return {
    session_id: sessionId,
    user_id: userId,
    created_at: Date.now(),
    updated_at: Date.now(),
    current_step: 1,
    status: 'planning',
    conversation: [],
    decisions: {},
    days: [],
  };
}
