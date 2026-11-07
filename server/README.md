# Kanbot API

Express 5 + TypeScript. JSON-file database. JWT auth. AI assistant through any OpenAI-compatible API, with a free built-in mock.

```bash
npm install
cp .env.example .env
npm run seed     # reset DB: demo@kanbot.dev / password123 (2 projects, 3 sprints, 24 todos)
npm run dev      # http://localhost:4000/api (auto-reload)
npm run smoke    # end-to-end test of every endpoint on a temp DB
npm test         # focused AI provider and validation tests
npm run typecheck
```

- **API reference:** [docs/IMPLEMENTATION-PLAN.en.md §4](../docs/IMPLEMENTATION-PLAN.en.md#4-backend-api-design)
- **Types (the contract):** [`src/types/api.ts`](src/types/api.ts). Copy this file into the frontend.
- **Data:** `data/db.json`. Delete it or re-seed to start fresh.

## Groq AI configuration

| `.env` | Behaviour |
|---|---|
| `AI_API_KEY` empty (default) | **Mock mode**: rule-based answers to a limited set of project questions, instant, free, offline. General open-ended chat requires an AI provider. `GET /api/ai/status` → `{ "mode": "mock" }` |
| `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL` set | **Groq** via its OpenAI-compatible `POST /openai/v1/chat/completions` endpoint. Chat responds conversationally to general topics as well as project questions. `GET /api/ai/status` reports `{ "mode": "ai" }` without exposing provider model details. |

To enable Groq locally:

1. Copy `.env.example` to `.env` in the `server/` directory.
2. Create a Groq API key in [Groq Console](https://console.groq.com/keys).
3. Edit `server/.env` locally: set `AI_API_KEY` to the new key, keep `AI_BASE_URL=https://api.groq.com/openai/v1`, and set `AI_MODEL` to an active model ID from [Groq's model catalog](https://console.groq.com/docs/models). Model IDs change; Kanbot reads the selected ID from configuration.
4. Restart the server and check `GET /api/ai/status`. The browser continues to call Kanbot's backend; the Groq key is never sent to the client.

Do not paste keys into source files, client-side environment variables, commands, logs, or commits. The `.env` file is ignored by Git. Leave `AI_API_KEY` empty for the working mock fallback.

The server validates generated Todo fields and rejects malformed model output instead of presenting it as a successful mock response. Sprint plans are restricted to real backlog IDs and the requested capacity. Provider errors are returned with safe messages; provider response bodies and credentials are not logged. AI routes are limited to 20 requests per minute per user.

## Structure

```
src/
├── app.ts / index.ts        # express app, routes mounting, startup
├── config/env.ts            # validated environment
├── types/api.ts             # API contract (shared with the client)
├── db/store.ts              # JSON-file store + record types
├── services/board.service.ts# ownership checks, ordering, sprint stats, serializers
├── routes/                  # auth, projects, todos, sprints, ai (+ zod schemas)
├── ai/                      # client.ts (OpenAI-compatible provider fetch), assistant.service.ts (real + mock)
├── middleware/              # auth, validation, errors, request logger
├── lib/                     # jwt, password hashing, errors
└── scripts/                 # seed.ts, smoke.ts
```
