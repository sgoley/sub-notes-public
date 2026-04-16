# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Sub Notes is a self-hosted, single-user content summarization tool. Users subscribe to YouTube channels or Substack feeds, process individual content URLs, and get AI-generated markdown summaries. Runs entirely in Docker — no auth, no billing, no cloud dependencies.

**Migrated from**: Multi-user Supabase SaaS with Stripe billing and Electron desktop app → single-user PocketBase/Docker local service.

## Development Commands

```bash
# Install frontend dependencies
bun i

# Frontend dev server (port 5173 via Vite) — run Docker services separately
bun run dev

# Build frontend for production
bun run build

# Build in development mode
bun run build:dev

# Lint
bun run lint

# Start everything (database + backend + frontend)
docker compose up --build
```

## Architecture

### Service Layout

```
docker-compose.yml
├── pocketbase   :7070   SQLite + admin UI at /_/
├── backend      :3333   Bun HTTP server
└── frontend     :9090   nginx serving React SPA, proxies /api/ → backend:3333
```

### Frontend Structure

- **React Router**: Routes: `/` → redirects to `/dashboard`, `/dashboard`, `/settings`
- **State Management**: `@tanstack/react-query` for server state, React hooks for local state
- **UI Components**: shadcn/ui (Radix UI primitives) + Tailwind CSS
- **Path Aliases**: `@/` maps to `src/`
- **Data layer**: `src/lib/pocketbase.ts` (PocketBase JS client), `src/lib/api.ts` (typed fetch helpers to backend)
- **Types**: `src/types/database.ts` (no Supabase/generated types)
- **UI Patterns**:
  - Infinite scroll with IntersectionObserver (20 items per page)
  - Passive refresh via `refreshTrigger` state (no component remount)
  - Card/list view toggle with localStorage persistence
  - Auto-refresh polling (5s interval) for processing/pending summaries
  - Relative timestamps using `date-fns`

### Backend (Bun)

Entry point: `backend/src/index.ts` — `Bun.serve()` router

**Routes** (`backend/src/routes/`):
- `subscriptions.ts` — GET/POST/PATCH/DELETE `/api/subscriptions[/:id]`
- `process.ts` — POST `/api/process` (creates pending summary, triggers async generation)
- `generateSummary.ts` — POST `/api/generate-summary/:id` (marks processing, runs Gemini async)
- `obsidian.ts` — POST `/api/sync/obsidian/:id` (writes markdown to /vault mount)
- `settings.ts` — GET/PUT `/api/settings`

**Libs** (`backend/src/lib/`):
- `pocketbase.ts` — PocketBase admin client
- `youtube.ts` — YouTube Data API (channel/video metadata)
- `transcript.ts` — youtube-transcript-plus (fetches transcripts)
- `gemini.ts` — Gemini REST API calls (model: `gemini-3-flash-preview`)
- `substack.ts` — Substack RSS feed fetching
- `obsidian.ts` — File write to /vault Docker volume
- `bootstrap.ts` — Creates PocketBase collections on startup if missing

### PocketBase Collections

All collections are single-user (no user_id). All rules are open (localhost-only via Docker).

- `subscriptions` — YouTube channels and Substack feeds
- `content_summaries` — Processed content: markdown summary, transcript, status, metadata
  - `status`: `pending` | `processing` | `completed` | `failed`
  - `metadata`: JSONB with `token_usage` (input/output/total tokens, estimated_cost_cents)
  - `sync_status`: JSONB tracking Obsidian sync state
  - Sort by `-created_at`
- `tags` — 30 predefined category tags
- `content_summary_tags` — Many-to-many with confidence scores
- `settings` — Key-value store (Obsidian config, model preferences, etc.)

**Note**: PocketBase v0.36.6 does NOT have implicit system fields. All collections have explicit `created_at` autodate field (onCreate: true, onUpdate: false). Frontend uses `created_at` throughout.

Migrations live in `pocketbase/migrations/001_init.js` — bootstrapped on container start. Schema changes can also be bootstrapped via `backend/src/lib/bootstrap.ts`.

### Data Flow

1. User adds URL → `POST /api/subscriptions` → YouTube/Substack API → PocketBase
2. User processes content → `POST /api/process` → creates `pending` summary → calls `POST /api/generate-summary/:id`
3. Generate summary → fetches transcript → Gemini API → stores markdown + token usage → optional Obsidian sync

### Key Integrations

- **YouTube Data API**: Channel/video metadata (`YOUTUBE_API_KEY`)
- **youtube-transcript-plus**: Transcript fetching in backend (avoids YouTube IP rate limits)
- **Gemini** (`gemini-3-flash-preview`): Summary generation via direct REST API (`GEMINI_API_KEY`)
- **Obsidian**: Backend writes to `/vault` Docker volume (host path from `OBSIDIAN_VAULT_PATH`)
  - Path: `/vault/${OBSIDIAN_SUBFOLDER}/${author}/${sanitized_title}.md`

## Environment Variables

**`.env`** (Docker Compose reads this):
- `PB_ADMIN_EMAIL` / `PB_ADMIN_PASSWORD`: PocketBase admin credentials
- `YOUTUBE_API_KEY`: YouTube Data API v3
- `GEMINI_API_KEY`: Gemini API key (from aistudio.google.com)
- `OBSIDIAN_VAULT_PATH`: Host path to Obsidian vault (optional)
- `OBSIDIAN_SUBFOLDER`: Subfolder within vault (default: `sub-notes`)

## Important Notes

- **No authentication**: Single-user local service, no login required
- **No billing**: All tiers/billing code removed
- **Transcript fetching**: `youtube-transcript-plus` runs in backend to avoid YouTube rate limiting on cloud IPs
- **Channel ID extraction**: Supports `/@username`, `/channel/ID`, `/c/customname` URL formats
- **Video ID extraction**: Supports `youtube.com/watch?v=ID` and `youtu.be/ID` formats
- **Infinite Scroll**: Summaries list loads 20 items initially, fetches more near bottom (IntersectionObserver)
- **Auto-refresh**: Dashboard polls every 5s when summaries are in processing/pending state
- **Obsidian sync**: Checks for existing files before writing to avoid duplicates

## Common Development Workflows

**Adding a database schema change:**
1. Edit `pocketbase/migrations/001_init.js` (or add a new migration file)
2. Rebuild PocketBase container: `docker compose up --build pocketbase`
3. Update `src/types/database.ts` to match new schema
4. Update backend lib/route files as needed

**Adding a new backend route:**
1. Create `backend/src/routes/newRoute.ts`
2. Import and wire it in `backend/src/index.ts`

**Adding shadcn/ui components:**
- Components are in `src/components/ui/`
- Use shadcn CLI to add: `bunx shadcn@latest add <component>`
- Customize via Tailwind classes and CVA variants

**Rebuilding after backend changes:**
```bash
docker compose up --build backend
```

## Key Documentation

**`docs/` folder**: Chronologically ordered `001_`–`062_` files documenting the Supabase-era architecture (historical reference). These predate the PocketBase migration and describe features that no longer apply (auth, billing, Electron, Supabase Edge Functions, etc.). Treat them as historical context only.

**Note**: `AGENTS.md` and `todo.md` are Supabase/Electron-era files and do not reflect the current architecture.
