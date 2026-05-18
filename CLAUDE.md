# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Minimal social network MVP: signup/login, profiles, status posts, global feed. Stretch features: follows, likes. Two Railway services (backend + frontend) backed by Supabase (Postgres + Auth).

## Dev commands

**Backend** (from `/backend`):
```
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Frontend** (from `/frontend`):
```
npm install
npm run dev          # local dev server (Vite)
npm run build        # production build
npm run preview      # preview production build locally
```

**Environment** — copy `.env.example` to `.env` in each service and fill in:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (backend only, for admin operations)

## Architecture

Single-page React app calls a FastAPI backend over HTTP. FastAPI calls Supabase REST/Auth APIs via `httpx` — the Supabase Python SDK is **never used** (C++ build error on Railway). Supabase handles PostgreSQL storage and JWT-based auth.

```
Browser → React (Vite/Tailwind) → FastAPI (Python) → Supabase (Postgres + Auth)
```

**Backend** (`/backend/main.py`): all routes in one file for the MVP. Route groups:
- `/auth/*` — signup, login (delegates to Supabase Auth)
- `/profile/*` — get/update profile
- `/posts/*` — create, delete posts
- `/feed` — global feed (or followed-users feed if following anyone)
- `/follow/*` — follow/unfollow users
- `/likes/*` — toggle likes

**Frontend** (`/frontend/src/`):
- `pages/` — full-page views (Login, Signup, Feed, Profile)
- `components/` — reusable pieces (PostCard, PostComposer, etc.)

## Database schema (Supabase/Postgres)

```
profiles:  id (→ auth.users), display_name, bio, created_at
posts:     id, user_id (→ profiles), content, created_at
follows:   follower_id, following_id, created_at  [composite PK]
likes:     user_id, post_id, created_at            [composite PK]
```

RLS policies: profiles/posts readable by anyone; writes/deletes restricted to owner. Follows and likes managed by authenticated user only.

## Coding standards

- FastAPI routes use `async/await`; all responses return `{ "data": ..., "error": ... }`
- Use `httpx` (not `requests`, not supabase-py) for all Supabase REST calls
- React components: PascalCase, one per file
- Tailwind only — no custom CSS files

## Auth flow

Supabase email + password auth. JWT stored in `localStorage`. Every protected API request sends `Authorization: Bearer {token}`. On any 401: clear the token from localStorage and redirect to `/login`.

## Critical Railway/Vite constraints — DO NOT CHANGE

- **Never** install or import the `supabase` Python package (causes pyiceberg C++ build failure)
- **Never** call the `vite` binary directly (permission denied on Railway); always invoke via node:
  ```json
  "build":   "node node_modules/vite/bin/vite.js build"
  "preview": "node node_modules/vite/bin/vite.js preview --host 0.0.0.0 --port $PORT"
  ```
- `vite.config.js` must include `preview: { allowedHosts: ['*.railway.app'] }`
- Railway start port: `8080` for both services

## Build order

Follow phases in `plan.md` — Phase 1 deploys a skeleton to Railway first so the live URL exists before features are added. Do not build all phases before deploying.
