# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Agentravel** is an AI agent application that transforms travel inspiration into detailed itineraries. The user provides a simple input like "I want to go to Shanghai Disneyland," and the system generates a complete multi-day travel plan with flights, accommodation, attractions, restaurants, and optimized schedules.

**Target Users**: Individual travelers who want detailed plans but lack time for manual planning.

**Core Value**: Convert vague inspiration → detailed, beautiful itinerary

## Technology Stack

- **Frontend**: TanstackStart
- **AI Orchestration**: Mastra
- **LLM**: GPT-5 (text + image generation)
- **Backend**: Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite)
- **External APIs**: Google Distance Matrix API, Web Search API
- **Package Manager**: pnpm

## Development Phases

The project follows a 3-phase MVP approach:

- **Phase 0**: Setup and connection verification (1-2 days)
- **Phase 1**: Agent construction (7-10 days) - Build and test agents in Mastra Playground
- **Phase 2**: Full app implementation with UI (10-14 days)

Don't be constrained by phases - implement as needed.

## Architecture

### Multi-Agent System

The system uses a hybrid architecture: **Main Agent (orchestrator)** coordinates **5 Sub-Agents**:

1. **Flight Search Agent** (Steps 5-6): Finds and proposes flight options
2. **Accommodation Search Agent** (Step 8): Recommends hotels based on daily plans
3. **Spot Search Agent** (Step 9): Lists tourist attractions for each day
4. **Gourmet Search Agent** (Step 10): Suggests restaurants for meals
5. **Route Optimization Agent** (Steps 11-12): Optimizes visit order and creates detailed timeline

### Main Agent

- **Pattern**: Hybrid (Fixed flow for steps 1-8 + ReAct for steps 9-13)
- **Responsibilities**:
  - User dialogue (steps 1-4, 7, 13)
  - State management (AgentMemory)
  - Sub-agent orchestration
  - Validation and adjustment decisions
- **ReAct Loop**: Thought → Action → Observation → repeat until complete
- **Error Handling**: Automatically proposes alternatives (e.g., if flights unavailable, suggests different dates)
- **Parallel Execution**: Where possible (e.g., spot + gourmet search for same day)

### Tools

All agents use shared tools:
- **Web Search**: Gathers information about spots, hotels, restaurants
- **Google Distance Matrix API**: Calculates travel times and distances
- **DB Operations**: Session/plan persistence
- **Image Generation**: GPT-5 generates spot images

## Database Schema

Uses Cloudflare D1 (SQLite) with 5 tables:

1. **users**: Anonymous user management (uuidv7)
2. **sessions**: Agent session state with `memory_snapshot` (JSON)
3. **plans**: Completed travel plans
4. **days**: Each day of the trip (day_number, area, theme)
5. **activities**: Individual activities (sightseeing, meal, transport, hotel)

Key design decisions:
- JSON storage for flexibility (`memory_snapshot`, `metadata`)
- uuidv7 for IDs
- CASCADE deletion (plan → days → activities)
- URL format: `/users/{userId}/plans/{planId}`

See `docs/database-schema.md` for complete SQL schema.

## State Management

### AgentMemory Structure

The main agent maintains an `AgentMemory` object (TypeScript type) containing:
- Session metadata (session_id, user_id, current_step, status)
- Conversation history
- Decisions (Layer 1: goal, destination, dates, flights, hotel, daily_concepts)
- Days array (Layer 2: detailed schedules with activities)

### Persistence Strategy

**Save timing**:
- Important decisions (flights confirmed, hotel confirmed, each day completed, plan finished)
- Auto-save every 30 seconds
- On error

**Classes**:
- `MemoryManager`: Helper for memory operations
- `SessionPersistence`: Handles DB save/load, auto-save timer, plan creation

See `docs/state-management.md` for implementation details.

## User Journey

Travel planning follows 13 steps:
1. Clarify purpose
2. Decide destination
3. Decide timing
4. Decide duration
5. Search flights
6. Finalize dates
7. Determine daily concepts (area + theme per day)
8. Search accommodation
9. Search spots
10. Search restaurants
11. Optimize route (TSP problem considering hours, meal times)
12. Create detailed timeline (with travel time)
13. Validate and adjust

The system supports backtracking and iterative refinement.

## Development Setup

### Initial Setup
```bash
# Install dependencies
pnpm init
pnpm add @tanstack/start mastra wrangler

# Create D1 database
wrangler d1 create agentravel-db

# Apply schema
wrangler d1 execute agentravel-db --file=./docs/database-schema.md
```

### API Keys
Set up environment variables for:
- OpenAI API key (GPT-5)
- Google Distance Matrix API key
- Web Search API key (TBD: Perplexity/Tavily/Google Search)

### Phase 1: Testing Agents
Use Mastra Playground for end-to-end testing before UI integration.

### Phase 2: Deployment
- **Backend**: Cloudflare Workers (wrangler deploy)
- **Frontend**: Cloudflare Pages or similar

## Key Design Decisions

### Conversation Style
Natural dialogue format - the LLM determines what information is needed and asks naturally, rather than rigid forms.

### Sub-agent Invocation
Immediate execution when info is ready (Pattern A) - don't make users wait for confirmation.

### Error Handling
Automatic alternative proposals (Pattern B) - if search fails, try different options and present to user.

### Data Format
JSON storage for flexibility over rigid schemas - easier to iterate during MVP.

### MVP Scope
Exclude from MVP:
- Interest tags
- "Too packed" warnings
- Generate alternatives button
- PDF export
- Calendar export
- Map display
- Authentication (Phase 3+)

## Cost Estimates

Per itinerary (approximate):
- GPT-5 text generation: $0.20 (10K tokens)
- Image generation: $0.16 (4 images)
- Distance Matrix: $0.10 (20 calls)
- **Total: ~$0.46/itinerary**

## Important Files

- `docs/index.md` - Documentation index
- `docs/overview.md` - Project overview
- `docs/agent-architecture.md` - Multi-agent system design
- `docs/main-agent-flow.md` - Detailed ReAct flow with conversation examples
- `docs/database-schema.md` - Complete schema with SQL
- `docs/state-management.md` - Memory management implementation
- `docs/user-journey.md` - 13-step planning process
- `docs/development-plan.md` - Phase breakdown with tasks

## Development Philosophy

- **MVP First**: Phase 2 is the minimum viable product - defer everything else to Phase 3+
- **Flexibility**: JSON storage allows rapid iteration
- **User Experience**: Streaming display, natural conversation, immediate sub-agent calls
- **Simplicity**: Minimum necessary tables, no complex checkpointing for MVP
