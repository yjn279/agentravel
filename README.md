# Agentravel

AI-powered travel itinerary generator using Mastra, GPT-5.2, and Cloudflare D1.

## Project Overview

Agentravel transforms travel inspiration into detailed itineraries. Simply input "I want to go to Shanghai Disney" and receive a complete multi-day travel plan including flights, accommodations, attractions, restaurants, and optimized schedules.

## Tech Stack

- **Frontend**: TanstackStart
- **AI Orchestration**: Mastra (monorepo configuration)
- **LLM**: Gemini 2.5 Flash (`gemini-2.5-flash`)
- **Backend**: Cloudflare Workers + Hono
- **Database**: Cloudflare D1 (SQLite) with Drizzle ORM
- **APIs**: Tavily (Web Search), Google AI (Gemini)
- **Package Manager**: pnpm workspaces

## Project Structure

```
agentravel/
├── apps/
│   ├── api/                    # Mastra + Cloudflare Workers
│   │   ├── src/
│   │   │   ├── mastra/        # Agents, tools, workflows
│   │   │   ├── db/            # Drizzle schema & connection
│   │   │   └── index.ts       # Hono app
│   │   ├── drizzle.config.ts
│   │   └── wrangler.toml
│   └── web/                    # TanstackStart frontend
├── packages/
│   ├── shared/                 # Shared types
│   └── utils/                  # Shared utilities
└── docs/                       # Architecture & planning docs
```

## Setup

### Prerequisites

- Node.js >=18.0.0
- pnpm >=8.0.0
- Cloudflare account (for D1 database and Workers)

### Installation

1. **Clone the repository**

```bash
git clone <repository-url>
cd agentravel
```

2. **Install dependencies**

```bash
pnpm install
```

3. **Create D1 database**

```bash
cd apps/api
wrangler d1 create agentravel-db
```

Copy the `database_id` from the output and update `apps/api/wrangler.toml`:

```toml
database_id = "YOUR_DATABASE_ID"
```

4. **Generate and apply Drizzle migrations**

```bash
cd apps/api
pnpm db:generate
pnpm db:migrate:local
```

5. **Set up environment variables**

Copy `.env.example` to `.env.local` in `apps/api/`:

```bash
cp ../../.env.example .env.local
```

Fill in your API keys:

- `GOOGLE_API_KEY`: Get from https://aistudio.google.com/app/apikey (Gemini 2.5 Flash)
- `TAVILY_API_KEY`: Get from https://tavily.com/ (optional for MVP)

6. **Development**

```bash
# From root directory
pnpm dev
```

## Development Phases

- **Phase 0** ✅: Project setup, database schema, API connections
- **Phase 1** 🚧: Agent implementation (Mastra)
- **Phase 2** 📋: Full application with UI

## Cost Estimates

Per itinerary (approximate):
- **Gemini 2.5 Flash**: Free tier (1500 requests/day, 1M tokens/minute)
- **Gemini 2.5 Flash Image**: Free tier included
- Web Search: Variable (Tavily offers free tier)
- **Total: ~$0 - $0.10/itinerary** (mostly free within quotas)

## References

- [Implementation Plan](/Users/yuji/.claude/plans/dynamic-inventing-hare.md)
- [Documentation](/docs/index.md)
- [Mastra Monorepo Guide](https://mastra.ai/docs/deployment/monorepo)
- [Drizzle ORM - Cloudflare D1](https://orm.drizzle.team/docs/connect-cloudflare-d1)

## License

MIT
