# CLAUDE.md

**Agentravel**: AI travel planner that converts inspiration ("I want to go to Shanghai Disneyland") into detailed multi-day itineraries.

## Tech Stack
- **Frontend**: TanstackStart | **Backend**: Cloudflare Workers + Hono | **DB**: D1 (SQLite) | **LLM**: GPT-5 Mini | **APIs**: Google Distance Matrix, Web Search

## Architecture
**Main Agent** (orchestrator) coordinates **5 Sub-Agents**:
1. Flight Search → 2. Accommodation → 3. Attractions → 4. Restaurants → 5. Route Optimization

**Main Agent Pattern**: ReAct loop (Thought → Action → Observation)
- Manages `AgentMemory` (session state, conversation, decisions, daily schedules)
- Calls sub-agents when ready (no user confirmation)
- Auto-proposes alternatives on errors
- Parallel execution where possible

**Tools**: Web Search, Distance Matrix API, DB Operations, Image Generation

## Database (5 tables)
`users` → `sessions` (JSON memory_snapshot) → `plans` → `days` → `activities`
- JSON storage for flexibility | uuidv7 IDs | CASCADE deletion
- URL: `/users/{userId}/plans/{planId}`

## 13-Step User Journey
1-4: Clarify (purpose, destination, timing, duration) | 5-6: Flights | 7: Daily concepts | 8: Hotel | 9-10: Attractions + Restaurants | 11-12: Route optimization + Timeline | 13: Validate

## State Management
- **AgentMemory**: Session metadata, conversation history, decisions (Layer 1), days array (Layer 2)
- **MemoryManager**: Helper for memory operations
- **SessionPersistence**: DB save/load, auto-save (30s), plan creation

## Setup
```bash
pnpm add hono @mastra/core openai drizzle-orm wrangler
wrangler d1 create agentravel-db
# .dev.vars: OPENAI_API_KEY, GOOGLE_MAPS_API_KEY, TAVILY_API_KEY
npx wrangler dev  # → http://localhost:8787
```

## Key Files
- `apps/api/src/index.ts` - Hono server + `/api/chat` endpoint
- `apps/api/src/mastra/agents/main-agent-openai.ts` - Main orchestrator
- `apps/api/src/mastra/agents/{flight,accommodation,attraction,restaurant,route}-search.ts` - Sub-agents
- `apps/api/src/mastra/memory/{manager,persistence}.ts` - State management
- See `docs/` for detailed specs

## Design Principles
- Natural dialogue (LLM asks what it needs)
- Immediate sub-agent execution
- JSON storage for MVP flexibility
- ~$0.46/itinerary cost target
