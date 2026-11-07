# Kanbot Frontend Requirement Traceability

This report maps all requirement IDs in `docs/REQUIREMENTS.en.md` and `docs/REQUIREMENTS.ar.md` to the client implementation and the evidence collected during the audit. The English and Arabic specifications define the same acceptance criteria; the required UI language is English only.

**Status rules:** `PASS` means the implementation was inspected and the stated behavior was exercised or otherwise directly verified. `NOT VERIFIED` means coverage is partial or the required scenario was not exercised; it must not be read as a pass. No `FAIL` is recorded because the audit did not establish a reproducible requirement failure.

Current tally: **26 PASS, 13 NOT VERIFIED, 0 FAIL**.

The recorded browser workflow used the Backend's mock AI mode and did not seed or reset the database. It performed create/update/delete actions through the UI; data created by that workflow may remain in the local database. No database reset or seed command was run for this audit.

## Authentication

| Requirement | Implementation location | Verification method | Status | Remaining issue |
|---|---|---|---|---|
| AUTH-1 | [AuthPages.tsx](./src/features/auth/pages/AuthPages.tsx), [auth-api.ts](./src/features/auth/api/auth-api.ts) | Browser registration, required-field/password-match checks, successful registration; duplicate-account error verified. | PASS | None observed in tested flows. |
| AUTH-2 | [AuthPages.tsx](./src/features/auth/pages/AuthPages.tsx), [AuthProvider.tsx](./src/features/auth/AuthProvider.tsx) | Incorrect credentials displayed the Backend error. | NOT VERIFIED | A successful manual login and post-login redirect restoration were not exercised in this audit. |
| AUTH-3 | [AuthProvider.tsx](./src/features/auth/AuthProvider.tsx) | Reloaded a protected page with a valid token; the session and project route were restored. | PASS | None observed. |
| AUTH-4 | [AuthProvider.tsx](./src/features/auth/AuthProvider.tsx), [AppPages.tsx](./src/app/router/AppPages.tsx) | Logged out; confirmed token removal and navigation to `/login`; code clears TanStack Query cache. | PASS | None observed. |
| AUTH-5 | [RouteGuards.tsx](./src/features/auth/components/RouteGuards.tsx), [router.tsx](./src/app/router/router.tsx) | Unauthenticated protected-route redirect preserved the route; authenticated `/login` redirected into the app. | PASS | Authenticated `/register` redirect is covered by the shared guard in code, not separately exercised. |
| AUTH-6 | [api-client.ts](./src/shared/api/api-client.ts), [AuthProvider.tsx](./src/features/auth/AuthProvider.tsx) | Replaced the JWT with an invalid token; confirmed token clearing, `/login?expired=1&redirect=...`, and the session-expired message. | PASS | None observed. |

## Projects

| Requirement | Implementation location | Verification method | Status | Remaining issue |
|---|---|---|---|---|
| PRJ-1 | [ProjectsPage.tsx](./src/features/projects/pages/ProjectsPage.tsx) | Verified project cards show name, key, description, backlog/Todo counts, and active Sprint. | NOT VERIFIED | Empty-project-list state was not separately exercised. |
| PRJ-2 | [ProjectsPage.tsx](./src/features/projects/pages/ProjectsPage.tsx), [projects-api.ts](./src/features/projects/api/projects-api.ts) | Created a project with a Backend-generated key; duplicate project key produced a field-level conflict error. | PASS | None observed in tested flows. |
| PRJ-3 | [ProjectsPage.tsx](./src/features/projects/pages/ProjectsPage.tsx) | Edited project name and description; duplicate-key validation was exercised. | NOT VERIFIED | Successful project-key change and preservation of existing Todo keys were not verified. |
| PRJ-4 | [ProjectsPage.tsx](./src/features/projects/pages/ProjectsPage.tsx) | Confirmed the warning named the temporary project and its Sprints/Todos; deleted it and verified it disappeared from the list. | PASS | None observed. |
| PRJ-5 | [AppPages.tsx](./src/app/router/AppPages.tsx) | Switched between two projects; verified the selected project is encoded in the URL and survives reload. | PASS | None observed. |

## Backlog and Todos

| Requirement | Implementation location | Verification method | Status | Remaining issue |
|---|---|---|---|---|
| BL-1 | [BacklogPage.tsx](./src/features/todos/pages/BacklogPage.tsx), [todos-api.ts](./src/features/todos/api/todos-api.ts) | Verified backlog keys, titles, types, priorities, points, labels, due date, totals, and the empty-backlog state in a temporary empty project. | PASS | None observed. |
| BL-2 | [BacklogPage.tsx](./src/features/todos/pages/BacklogPage.tsx) | Created multiple Todos through the inline input; Enter created and cleared the field. | PASS | Escape behavior was not retested during this final browser pass. |
| BL-3 | [TodoDetailsDialog.tsx](./src/features/todos/components/TodoDetailsDialog.tsx) | Edited title, description, type, status, priority, points, label, due date, and Sprint; verified unsaved-changes warning. | PASS | None observed in tested fields. |
| BL-4 | [TodoDetailsDialog.tsx](./src/features/todos/components/TodoDetailsDialog.tsx) | Confirmed deletion of a temporary Todo and verified it disappeared from the backlog. | PASS | The browser reported an aborted DELETE request after the UI updated; the Todo was absent afterward. |
| BL-5 | [BacklogPage.tsx](./src/features/todos/pages/BacklogPage.tsx), [todos-api.ts](./src/features/todos/api/todos-api.ts) | Used accessible Move to top/bottom actions and confirmed the order changed. | NOT VERIFIED | Pointer/keyboard drag, optimistic rollback after a failed move, and failure feedback were not exercised. |
| BL-6 | [BacklogPage.tsx](./src/features/todos/pages/BacklogPage.tsx) | Tested text search and both type and priority filters; verified reorder is disabled with an explanation while filtered. | PASS | Backend request frequency was not instrumented during typing. |
| BL-7 | [TodoDetailsDialog.tsx](./src/features/todos/components/TodoDetailsDialog.tsx), [SprintSections.tsx](./src/features/sprints/components/SprintSections.tsx) | Assigned a Todo to a planned Sprint and carried an unfinished Todo to another planned Sprint on completion. | NOT VERIFIED | Explicitly moving a Todo from a Sprint back to Backlog and assignment to every Sprint category were not exhaustively tested. |

## Sprints and Board

| Requirement | Implementation location | Verification method | Status | Remaining issue |
|---|---|---|---|---|
| SPR-1 | [SprintSections.tsx](./src/features/sprints/components/SprintSections.tsx), [sprints-api.ts](./src/features/sprints/api/sprints-api.ts) | Created planned Sprints; verified default fields and rejected end date earlier than start date. | PASS | None observed. |
| SPR-2 | [SprintSections.tsx](./src/features/sprints/components/SprintSections.tsx) | Edited a planned Sprint, deleted it with confirmation, and verified its Todos returned to Backlog. | PASS | None observed. |
| SPR-3 | [SprintSections.tsx](./src/features/sprints/components/SprintSections.tsx) | Started a planned Sprint and verified board navigation; a second Start action was disabled with an active-Sprint explanation. | PASS | HTTP 409 conflict handling was not independently forced. |
| SPR-4 | [BoardPage.tsx](./src/features/sprints/pages/BoardPage.tsx) | Verified the active Sprint statistics, four ordered status columns, counts, readable dates, no-active-Sprint state, and horizontal scrolling/sidebar collapse at 768px. | PASS | None observed in tested layouts. |
| SPR-5 | [BoardPage.tsx](./src/features/sprints/pages/BoardPage.tsx), [todos-api.ts](./src/features/todos/api/todos-api.ts) | Changed a Todo through To Do, In Progress, In Review, and Done using the accessible status control; progress updated. | NOT VERIFIED | Drag between columns, same-column reordering, and optimistic rollback/failure feedback were not exercised. |
| SPR-6 | [BoardPage.tsx](./src/features/sprints/pages/BoardPage.tsx), [sprints-api.ts](./src/features/sprints/api/sprints-api.ts) | Completed an active Sprint with an unfinished Todo; selected a planned-Sprint destination and AI summary; verified carried-over statistics and summary page. | PASS | None observed in tested flow. |
| SPR-7 | [SprintHistoryPage.tsx](./src/features/sprints/pages/SprintHistoryPage.tsx), [SprintDetailsPage.tsx](./src/features/sprints/pages/SprintDetailsPage.tsx) | Verified Active/Planned/Completed sections, completed statistics, carried-over count, completion percentage, and details navigation. | PASS | Historical behavior beyond the created QA Sprint data was not tested. |

## AI assistant

| Requirement | Implementation location | Verification method | Status | Remaining issue |
|---|---|---|---|---|
| AI-1 | [AssistantDrawer.tsx](./src/features/ai-assistant/components/AssistantDrawer.tsx), [ai-api.ts](./src/features/ai-assistant/api/ai-api.ts) | Opened assistant, sent a chat, verified Markdown rendering, Mock AI badge, and conversation persistence after close/reopen. | NOT VERIFIED | Project-switch reset and the 30-message boundary were not exercised; latest UI changes still need behavior verification. |
| AI-2 | [BacklogPage.tsx](./src/features/todos/pages/BacklogPage.tsx), [GenerateTodosDialog.tsx](./src/features/todos/components/GenerateTodosDialog.tsx), [ai-api.ts](./src/features/ai-assistant/api/ai-api.ts) | Generated two drafts, unchecked one, bulk-saved the selected draft, and verified the backlog update. | NOT VERIFIED | Editing draft fields and the real provider response were not tested; latest entry-point change has only build/lint coverage. |
| AI-3 | [SprintSections.tsx](./src/features/sprints/components/SprintSections.tsx), [AiSprintPlanningDialog.tsx](./src/features/ai-assistant/components/AiSprintPlanningDialog.tsx), [ai-api.ts](./src/features/ai-assistant/api/ai-api.ts) | Earlier mock-mode testing suggested a plan, verified selection/points/reasoning, confirmed over-capacity disables creation, and created a planned Sprint with selected Todos. | NOT VERIFIED | The latest Sprint-section entry-point change has only build/lint coverage. |
| AI-4 | [SprintSummaryPanel.tsx](./src/features/ai-assistant/components/SprintSummaryPanel.tsx), [BoardPage.tsx](./src/features/sprints/pages/BoardPage.tsx), [SprintDetailsPage.tsx](./src/features/sprints/pages/SprintDetailsPage.tsx) | Generated an active-Sprint summary and a completion summary; verified saved Markdown and timestamp after reload. | PASS | Real-provider summary quality was not tested. |
| AI-5 | [AssistantDrawer.tsx](./src/features/ai-assistant/components/AssistantDrawer.tsx), [GenerateTodosDialog.tsx](./src/features/todos/components/GenerateTodosDialog.tsx), [AiSprintPlanningDialog.tsx](./src/features/ai-assistant/components/AiSprintPlanningDialog.tsx), [SprintSummaryPanel.tsx](./src/features/ai-assistant/components/SprintSummaryPanel.tsx) | Verified the Mock AI badge and disclaimer. Intercepted Generate Todos requests with 429 and 502 responses; verified server messages and visible Retry actions, and clicked Retry to confirm another request. Updated retry visibility for both codes across AI actions. | NOT VERIFIED | Real Backend rate limiting/provider failures and retry outcomes were not exercised for all AI actions; latest UI changes have only build/lint coverage. |

## Non-functional requirements

| Requirement | Implementation location | Verification method | Status | Remaining issue |
|---|---|---|---|---|
| NFR-1 | [package.json](./package.json), [tsconfig.app.json](./tsconfig.app.json) | Strict TypeScript project build, `npm run build`, and `npm run lint` results recorded below. | PASS | None if the final commands remain green. |
| NFR-2 | [shared/components/ui.tsx](./src/shared/components/ui.tsx), feature pages | Observed loading/empty states and the invalid-token error flow. | NOT VERIFIED | Loading, empty, and error states were not checked for every data view; offline and missing-resource cases remain untested. |
| NFR-3 | [FeedbackProvider.tsx](./src/app/providers/FeedbackProvider.tsx), mutation pages | Verified feedback for project/Todo/Sprint creation and confirmation dialogs for deletions/completion. | NOT VERIFIED | Feedback and failure handling were not exhaustively checked for every mutation. |
| NFR-4 | [AppPages.tsx](./src/app/router/AppPages.tsx), [BoardPage.tsx](./src/features/sprints/pages/BoardPage.tsx) | Browser viewports at 1440px, 1024px, and 768px; at 768px sidebar was hidden and board overflowed horizontally. | PASS | None observed at tested widths. |
| NFR-5 | [AppPages.tsx](./src/app/router/AppPages.tsx), feature dialogs and controls | Inspected labels, semantic controls, visible focus styling, dialog behavior, text status labels, and non-drag actions. | NOT VERIFIED | Full keyboard-only testing, screen-reader review, and AA contrast measurement were not performed. |
| NFR-6 | [BacklogPage.tsx](./src/features/todos/pages/BacklogPage.tsx), [BoardPage.tsx](./src/features/sprints/pages/BoardPage.tsx) | Search results were observed after a 400ms wait; optimistic ordering/status behavior was exercised successfully. | NOT VERIFIED | Request counts per keystroke and rollback after a forced failed drag request were not measured. |
| NFR-7 | [AuthProvider.tsx](./src/features/auth/AuthProvider.tsx), [AssistantDrawer.tsx](./src/features/ai-assistant/components/AssistantDrawer.tsx) | Verified `kanbot-token` is the only localStorage key; invalid token is cleared; Markdown rendered without enabling raw HTML. | PASS | None observed. |
| NFR-8 | [src/](./src/), [api-client.ts](./src/shared/api/api-client.ts), [api.ts](./src/shared/types/api.ts) | Inspected feature/API separation and typed shared API usage; TypeScript build and lint were run. | PASS | None observed in audited code. |
| NFR-9 | Feature pages and [BoardPage.tsx](./src/features/sprints/pages/BoardPage.tsx) | Verified English UI copy and readable Sprint dates in the browser. | PASS | Localization beyond exercised screens was not separately audited. |

## Final validation

| Check | Result |
|---|---|
| `npm run lint` (from `client/`) | PASS, exit code 0 |
| `npm run build` (from `client/`, includes `tsc -b`) | PASS, exit code 0; Vite reports a 976.18 kB minified JavaScript chunk warning |
| TypeScript strict check | PASS, included in `npm run build` via `tsc -b` |
| Browser workflows | Prior manual browser QA is recorded per requirement above; this audit also verified mocked AI 429/502 messages and the Retry action. Several error, accessibility, and drag/drop scenarios remain NOT VERIFIED. No seed/reset was run. |
| Real AI provider / public deployment | Not verified |
| Backend changes during this audit | None; only client files were changed |
| Secret scan | PASS; no key-like strings found in tracked files; only `.env.example` files are tracked |
