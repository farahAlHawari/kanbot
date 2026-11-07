# Kanbot Client

Kanbot is a personal project and sprint-management app. Its client provides authentication, project workspaces, an ordered Todo backlog, sprint planning, an active sprint board, sprint history, and an AI assistant. The client uses the Kanbot Backend API for data and AI operations.

## Requirements and implementation status

The client implements the AUTH, PRJ, BL, SPR, AI, and NFR requirement areas from [`docs/REQUIREMENTS.en.md`](../docs/REQUIREMENTS.en.md). Implemented functionality includes:

- Account registration and login, persisted sessions, protected routes, and logout.
- Project listing, creation, editing, deletion, and switching.
- Todo creation and editing, backlog search and filters, priority ordering, and sprint assignment.
- Planned and active sprints, a four-column board, sprint completion and history.
- AI chat, Todo suggestions, sprint planning, and sprint summaries. AI-generated changes remain reviewable and require confirmation before they are saved.
- Loading, empty, error, and mutation-feedback states across the application.

Implementation does not mean every acceptance criterion has been fully verified. The current [requirement traceability report](./REQUIREMENT-TRACEABILITY.md) records **26 PASS, 13 NOT VERIFIED, and 0 FAIL** from its audit. In particular, some successful-login and redirect cases, drag-and-drop failure recovery, exhaustive AI error paths, and full accessibility review still need verification.

## Technology choices

| Choice | Why |
|---|---|
| React 19, strict TypeScript, and Vite | Meet the required frontend stack and provide typed components with a fast development/build workflow. |
| Material UI | Provides consistent, responsive, keyboard-aware controls and dialogs without building a component library from scratch. |
| TanStack Query | Keeps API data and cache invalidation out of local UI state and gives mutations shared loading/error handling. |
| React Router | Supports project routes, protected pages, and restoring the intended destination after login. |
| dnd-kit | Supports sprint-board and backlog interactions with accessible non-drag alternatives. |
| React Markdown | Renders assistant replies as Markdown while leaving raw HTML disabled. |
| Inter and JetBrains Mono | Inter keeps interface text readable; JetBrains Mono distinguishes code and keys. Both are self-hosted. |

### Visual direction

The design uses a Lagoon teal primary color with amber accents, cool neutral surfaces, and light/dark themes. Teal provides a calm, consistent action color; amber is reserved for emphasis. Shared typography, spacing, borders, and semantic colors keep project, Todo, and sprint states consistent. Focus indicators, text labels alongside status colors, reduced-motion support, and responsive navigation help keep the interface usable across screen sizes.

The supplied logo is retained with light and dark variants. The provided wireframes describe content and layout; the visual system is the client’s own design.

## Prerequisites

- Node.js compatible with the Vite toolchain
- npm
- The Kanbot Backend running locally or at an accessible API host

## Run locally

In a first terminal, start the Backend from the repository root:

```powershell
cd server
npm install
npm run dev
```

In a second terminal, start the client:

```powershell
cd client
npm install
npm run dev
```

The Vite development server proxies `/api` requests to `http://127.0.0.1:4000` by default. Open the local URL printed by Vite and register an account or sign in.

If the Backend is hosted elsewhere, create `client/.env.local`:

```dotenv
VITE_API_URL=http://localhost:4000/api
```

The value must be the API base URL ending in `/api`; configure the Backend CORS allowlist for the client origin when using a direct connection. **Never put API keys or other secrets in `VITE_*` variables** because Vite embeds them in the browser bundle.

### Demo data

The optional Backend seed script creates `demo@kanbot.dev` with password `password123`. Seeding resets the Backend database. Do not run `npm run seed` if the existing local data needs to be preserved; instead, register a new account or use an intentionally disposable database.

## AI configuration

The client calls the Backend for chat, Todo suggestions, sprint planning, sprint summaries, and AI connection status. It never calls an AI provider directly. With no provider configured, the Backend uses its limited Mock AI responses. For open-ended chat, configure the provider credentials and model on the **Backend only**, then restart it. See [`server/README.md`](../server/README.md#groq-ai-configuration) for setup. The client displays whether AI is connected or in Mock mode, but does not display provider model details.

## Demo walkthrough

The requirements request a short live or recorded demo. This checklist covers the required flow:

1. Register and create a project.
2. Generate Todo drafts with AI, review them, and add selected drafts to the backlog.
3. Use AI to plan a sprint; review capacity and selected Todos, then create the sprint.
4. Start the sprint and move cards across the board.
5. Complete the sprint and show its AI summary.

Use an existing project or disposable database for a demo. Creating sample data in the shared local database changes that data; seeding resets it.

## Enhancements

In addition to the base requirements, the client includes:

- Light and dark themes with a remembered preference.
- Responsive navigation, including a phone bottom navigation and a collapsed tablet rail.
- Sprint sections on the backlog, drag-and-drop interactions, and accessible move/status alternatives.
- AI chat starters, project-aware tools, Markdown answers, retryable errors, and a typewriter display effect.
- A dedicated AI Tools section that separates chat from Todo generation, sprint planning, and summaries.
- A Todo details action to polish its text with AI; generated suggestions are reviewed before saving.
- Shared status indicators, review disclaimers, reduced-motion behavior, and mobile-safe layouts.

These enhancements use the existing Backend API. Chat history is held in client UI state for the current project session; it is not stored by the Backend.

## Commands

Run these from `client/`:

```powershell
npm run dev       # Start the Vite development server
npm run lint      # Run ESLint
npm run build     # TypeScript project build and Vite production build
npm run preview   # Preview the production build
```

There is no dedicated client test script. Backend AI tests and API smoke tests are documented in [`server/README.md`](../server/README.md).

## Deployment

Build with `npm run build`; output is written to `client/dist`. Deploy that directory to a static host configured to serve the SPA entry point for client-side routes. A public deployment needs a publicly reachable Backend. Set `VITE_API_URL` at build time to the public API base ending in `/api`, or configure a same-origin `/api` reverse proxy. Configure Backend CORS for the deployed client origin. Keep all secrets in the Backend environment.

## Known issues and verification gaps

- Some acceptance criteria remain **NOT VERIFIED**; see the [traceability report](./REQUIREMENT-TRACEABILITY.md) for individual scenarios and evidence.
- Full keyboard-only and screen-reader testing, WCAG AA contrast measurement, offline behavior, and exhaustive loading/error-state coverage have not been completed.
- Drag-and-drop rollback and failure feedback have not been verified under a forced Backend failure.
- The production build reports a JavaScript chunk larger than 500 kB.
- A live or recorded demo is a separate deliverable; this README provides its walkthrough but does not claim that a recording is included.
