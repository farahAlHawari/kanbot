# Kanbot Client

Kanbot is a sprint-planning and task-management application. The client provides project workspaces, backlogs, sprint planning and boards, sprint history, and an AI assistant. All application data and AI provider calls are handled by the Backend API.

## Technology

- React 19 and TypeScript (strict mode)
- Vite
- Material UI
- TanStack Query
- React Router
- dnd-kit
- React Markdown

## Source structure

```text
src/
  app/                 Providers, routing, shell, theme, and feedback
  features/
    ai-assistant/      Assistant chat, AI sprint planning, summaries
    auth/              Authentication, forms, and route guards
    board/             Active Sprint board queries
    projects/          Project management
    sprints/           Sprint planning, board, and history
    todos/             Backlog, Todo editing, and AI Todo drafts
  shared/
    api/               API request client and errors
    components/        Shared UI components
    types/             Backend API types
```

Server data is fetched and cached with TanStack Query. The JWT is stored in `localStorage`; user details and project data are loaded from the Backend.

## Requirements and implementation status

The implementation covers the AUTH-1–6, PRJ-1–5, BL-1–7, SPR-1–7, AI-1–5, and NFR-1–9 requirement areas. The audit recorded 26 PASS and 13 NOT VERIFIED items; passing items are evidence-based, and unverified items are not claimed as complete. See the [requirement traceability report](./REQUIREMENT-TRACEABILITY.md) for per-ID implementation locations, verification evidence, status, and remaining issues.

## Prerequisites

- Node.js compatible with the repository's Vite toolchain
- npm
- The Kanbot Backend running locally or at an accessible API host

## Run locally

Start the Backend in a separate terminal:

```powershell
cd server
npm install
npm run dev
```

The client Vite configuration proxies `/api` requests to `http://127.0.0.1:4000`. With this default, the client can use the proxy without a client environment file.

Start the client:

```powershell
cd client
npm install
npm run dev
```

Open the local URL printed by Vite. Register an account or sign in with a Backend account.

If the Backend is not on the local default, create `client/.env.local` and set the API base URL:

```dotenv
VITE_API_URL=http://localhost:4000/api
```

`VITE_API_URL` is the API base, including `/api`. When set, the client sends requests directly to that URL; configure the Backend's CORS allowlist for the client origin. Do not put credentials or provider API keys in any `VITE_*` variable: Vite embeds those values in the browser bundle.

### Optional demo account

The repository's Backend seed script documents `demo@kanbot.dev` with password `password123`. The account exists only after the Backend has intentionally been seeded. Seeding changes database contents and is not required by the client; do not run it against a database whose data must be preserved. Otherwise, register a new account through the app.

## AI integration

The client calls the Backend endpoints for AI status, chat, Todo suggestions, Sprint planning, and Sprint summaries. It never calls Gemini, OpenAI, or another provider directly. The Backend returns mock responses when no provider is configured.

To enable a provider, configure the Backend's private environment (for example `AI_API_KEY`, `AI_BASE_URL`, and `AI_MODEL`) in the Backend deployment environment and restart the Backend. Keep these values server-side; do not copy them into `client/.env`, `client/.env.local`, or any other `VITE_*` variable. The client displays a Mock AI badge when the Backend reports mock mode.

## UI and design

The presentation follows the supplied Kanbot design brief while retaining React, MUI, and the existing application behavior. A single CSS-variable-enabled MUI theme defines light and dark Lagoon teal/amber schemes, cool neutral surfaces, semantic tints, typography, focus treatment, and component defaults. Task, Story, and Bug use distinct blue, purple, and red type accents; shared badges show type, status, and priority with text and icons as well as color. Inter and JetBrains Mono are self-hosted through `@fontsource-variable`; spacing, radii, motion, and other non-colour aliases are in `src/app/theme/tokens.css`.

The new light/dark wordmarks, tagline artwork, and mascot live under `src/assets/brand/`; the favicon and touch icon are in `public/`. Existing artwork was preserved. Authentication uses a responsive split hero/form card, and the app shell adapts from phone bottom navigation to a tablet icon rail and desktop sidebar. The Sprint board uses horizontal scroll and snap behavior on narrow screens. AI actions share a restrained teal treatment, assistant Markdown keeps raw HTML disabled, and the drawer displays the review disclaimer. Visible keyboard focus, reduced-motion handling, semantic labels, and coarse-pointer target sizing are included.

The interface is English-only. Planned Sprint sections precede the Backlog as specified in the product requirements and wireframes. Shared loading, empty, and retryable error states are used across the data pages.

The interface retains the real Backend integrations, TanStack Query synchronization, and accessible non-drag alternatives where implemented. Visual and responsive refinements do not imply that every requirement has passed end-to-end testing; see the [requirement traceability report](./REQUIREMENT-TRACEABILITY.md) for verified and unverified scenarios.

## Commands

Run these from `client/`:

```powershell
npm run dev       # Vite development server
npm run lint      # ESLint
npm run build     # TypeScript project build and Vite production build
npm run preview   # Serve the production build locally
```

There is no dedicated client test script in `package.json`. Manual browser QA and the current audit evidence are recorded in [REQUIREMENT-TRACEABILITY.md](./REQUIREMENT-TRACEABILITY.md).

## Deployment

Build the static client with `npm run build`; the output is written to `client/dist`. Deploy that directory to a static host configured to serve the SPA entry point for client-side routes.

A public deployment requires a publicly reachable Backend. Set `VITE_API_URL` at build time to the actual Backend API base URL ending in `/api`, or configure a same-origin reverse proxy for `/api`. No production Backend URL is configured or assumed by this project. Configure the Backend's CORS policy for the deployed client origin. Keep AI credentials and all other secrets exclusively in the Backend environment.

## Known limitations

- Real Gemini/provider mode was not available for this audit; browser AI checks used the Backend's mock mode.
- AI rate-limit and provider-failure handling, network-offline behavior, and every validation/error branch have not all been exercised.
- Drag-and-drop failure rollback and the full keyboard accessibility/contrast audit remain unverified. See the traceability report for the exact scope.
- Deployment against a public Backend has not been tested.
- The production build succeeds but currently emits a bundle-size warning for a JavaScript chunk over 500 kB.
