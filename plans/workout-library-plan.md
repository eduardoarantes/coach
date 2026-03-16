# Workout Library Plan

## Objective

Implement a user-owned workout library system that lets athletes create zero or more named libraries, save reusable workout snapshots into them, and instantiate those snapshots into dated planned workouts.

The first release should fit the existing Coach Watts architecture instead of creating a parallel workout engine.

## Why

- Users need reusable workouts, not just one-off planned sessions.
- Multiple libraries let users separate collections by phase, goal, coach, or context.
- Starting with zero libraries avoids forcing an opinionated default structure.
- Reusing the existing planned-workout model reduces duplication and rollout risk.
- AI-generated plans already create valuable reusable workouts; capturing them automatically prevents those sessions from being trapped inside a single schedule.

## Scope

In scope:

- Multi-library data model: `WorkoutLibrary` and `WorkoutLibraryItem`
- Zero-library onboarding and empty-state UX
- Public/private library visibility
- Authenticated cross-user visibility for public libraries
- Library CRUD
- Library item CRUD for core metadata
- Save planned workout to library
- Instantiate library item into planned workout
- Workout library overview/detail pages
- Public library browsing pages inside the authenticated app
- Navigation entry to library pages
- User-facing localization
- Unit and API tests for the core flows

Out of scope for v1:

- Anonymous or token-based public sharing
- AI semantic search
- Chat tool integration
- Direct publish-to-provider from a library item
- Version history or audit timeline for item edits
- Automatic creation of user libraries outside the AI-generated-workout default-library exception
- Full structured-workout editing inside the library item editor
- Global public directory, ranking, or marketplace-style discovery

## Product Principles

1. Libraries are first-class containers, not just tags on saved workouts.
2. Users start with zero libraries and create structure only when they need it.
3. Library items are snapshots, not live-linked mirrors of the source planned workout.
4. Library flows should reuse the current planned-workout scheduling path wherever possible.
5. Metadata should be editable in the library; advanced workout changes happen after instantiation in planned-workout flows.
6. Public libraries should be visible to authenticated users in-app while remaining owner-controlled and read-only for non-owners.
7. AI-generated plan workouts should seed a reusable default library automatically so the system captures value without extra user steps.

## Current Baseline (Code Touchpoints)

- Data model and structured workout snapshot support:
  - `prisma/schema.prisma`
- Planned workout creation flow:
  - `server/api/planned-workouts/index.post.ts`
- Planned workout repository pattern:
  - `server/utils/repositories/plannedWorkoutRepository.ts`
- Planned workout detail page and action surface:
  - `app/pages/workouts/planned/[id]/index.vue`
- Existing template/library-style page structure:
  - `app/pages/plans/index.vue`
- Navigation:
  - `app/layouts/default.vue`
- AI plan initialization flow:
  - `server/api/plans/initialize.post.ts`
- AI weekly workout generation flow:
  - `trigger/generate-weekly-plan.ts`
- Existing visibility precedent:
  - `prisma/schema.prisma` (`User.visibility`)
  - `server/utils/schemas/profile.ts`
- Localization registration:
  - `app/plugins/tolgee.ts`
- Frontend implementation rules:
  - `docs/04-guides/frontend-patterns.md`
- Localization rules:
  - `docs/04-guides/localization.md`

## Product Requirements

- A user can have zero, one, or many workout libraries.
- A new user starts with zero libraries.
- Creating ordinary planned workouts does not auto-create a library.
- The library overview page shows a clear empty state with a create-library CTA when none exist.
- A user can create, rename, describe, and delete a library.
- A library can be marked `PRIVATE` or `PUBLIC`.
- A public library must be visible to any authenticated user in the app.
- Public library access must still require authentication.
- Non-owners can browse public library metadata and library items, but cannot mutate anything.
- A user can save a planned workout into a chosen library.
- If the user has zero libraries, "Save to Library" must first offer create-library inline, then complete the save flow.
- A library item stores a workout snapshot with key metadata:
  - title
  - description
  - type/category
  - duration/distance/TSS/intensity when available
  - target area and tags when available
  - structured workout JSON when available
- A library item can be instantiated into a new planned workout for a selected date/time.
- Instantiation creates a new planned workout record; it does not mutate the library item.
- v1 item editing supports metadata edits. Structured workout editing remains in planned-workout detail after instantiation.
- All library access must be strictly user-scoped.
- Public access should use normal authenticated routes and page middleware, not share tokens.
- v1 public access is library-level. Per-item public routes are not required.
- When AI plan generation creates workouts for a user, the system should ensure a default library exists for AI-generated workouts and save those workouts there automatically.
- If the user has no libraries, AI-generated workout persistence should create the default library as part of the generation flow.
- If the user already has libraries but no AI default library, the system should create that default library the first time AI-generated workouts are saved.
- The default AI library should be public-capable like any other library, but it should be created as `PRIVATE` initially unless product rules later say otherwise.

## Data Model Design

### `WorkoutLibrary`

Fields:

- `id`
- `userId`
- `name`
- `description`
- `visibility`
- `isDefault`
- `defaultKind`
- `createdAt`
- `updatedAt`

Relations:

- belongs to `User`
- has many `WorkoutLibraryItem`

Indexes/constraints:

- index on `userId`
- optional uniqueness on `(userId, name)` if we want to prevent duplicate library names
- optional uniqueness on `(userId, defaultKind)` when `defaultKind` is non-null to ensure only one AI default library per user

### `WorkoutLibraryItem`

Fields:

- `id`
- `userId`
- `libraryId`
- `title`
- `description`
- `type`
- `category`
- `durationSec`
- `distanceMeters`
- `tss`
- `workIntensity`
- `targetArea`
- `tags` (`String[]`)
- `structuredWorkout` (`Json`)
- `sourcePlannedWorkoutId` (`String?`)
- `createdAt`
- `updatedAt`

Relations:

- belongs to `WorkoutLibrary`
- belongs to `User`

Indexes/constraints:

- index on `userId`
- index on `libraryId`
- optional index on `(userId, type)` for filtering

Notes:

- Keep field names aligned with `PlannedWorkout` where possible to minimize mapping code.
- Do not introduce a new enum-only taxonomy in v1 unless current workout typing is standardized first.
- Do not add share-token fields to the library model for v1; authenticated visibility is enough.
- `defaultKind` can be nullable for normal libraries and set to something like `AI_GENERATED` for the system-created default library.

## API Shape

### Library Routes

- `GET /api/workout-libraries`
  - list user libraries
- `POST /api/workout-libraries`
  - create library
- `GET /api/workout-libraries/[id]`
  - fetch library detail with lightweight item summary
- `PATCH /api/workout-libraries/[id]`
  - rename/update description/visibility
- `DELETE /api/workout-libraries/[id]`
  - delete library and cascade items
- `GET /api/workout-libraries/public`
  - list libraries where `visibility = PUBLIC`
- `GET /api/workout-libraries/public/[id]`
  - fetch public library detail for authenticated viewers

### Library Item Routes

- `POST /api/workout-libraries/[id]/items`
  - create item in a library
  - v1 primary mode: clone from `plannedWorkoutId`
- `GET /api/workout-library-items/[id]`
  - fetch full item detail
- `PATCH /api/workout-library-items/[id]`
  - edit item metadata
- `DELETE /api/workout-library-items/[id]`
  - delete item
- `POST /api/workout-library-items/[id]/instantiate`
  - create planned workout from library item for a specified date/startTime

### Visibility Behavior

- Marking a library `PUBLIC` should make it visible in authenticated public-library queries.
- Marking a library `PRIVATE` should remove it from all cross-user reads immediately.
- Owners keep full CRUD access regardless of visibility.
- Non-owners get read-only access only when the library is `PUBLIC`.

### AI Default Library Behavior

- Users generally start with zero libraries.
- AI plan generation is the one exception that may create a library automatically.
- The system should create a single default library for AI-generated workouts on first need.
- Suggested default values:
  - `name`: `AI Workouts`
  - `description`: `Automatically saved workouts created from AI training plans.`
  - `visibility`: `PRIVATE`
  - `isDefault`: `true`
  - `defaultKind`: `AI_GENERATED`
- Future AI-generated plan workouts should be saved into that same library instead of creating new libraries repeatedly.

### Response/implementation conventions

- Follow current REST-style route layout in `server/api`
- Return `{ success, ... }` responses for mutations
- Use `defineRouteMeta` where appropriate for OpenAPI docs
- Enforce user ownership in every query path

## Backend Work Breakdown

### A) Schema & Migration (P0)

Files:

- `prisma/schema.prisma`
- `prisma/migrations/*`

Tasks:

- [ ] Add `WorkoutLibrary` model
- [ ] Add `WorkoutLibraryItem` model
- [ ] Add `User` relations
- [ ] Add `visibility` to `WorkoutLibrary`
- [ ] Add default-library fields to `WorkoutLibrary`
- [ ] Create migration
- [ ] Run Prisma generate

Acceptance criteria:

- Models support zero-or-many libraries per user
- Deletes cascade safely from library to items
- Schema naming aligns with current workout field names
- Public/private visibility is represented at the library level
- The schema can represent one AI default library per user

### B) Repository/Service Layer (P0)

Files:

- `server/utils/repositories/workoutLibraryRepository.ts`
- `server/utils/repositories/workoutLibraryItemRepository.ts`
- `server/utils/services/workoutLibraryService.ts`

Tasks:

- [ ] Implement user-scoped CRUD repositories
- [ ] Add clone logic from `PlannedWorkout` -> `WorkoutLibraryItem`
- [ ] Add instantiate logic from `WorkoutLibraryItem` -> `PlannedWorkout`
- [ ] Add `ensureAiDefaultLibrary(userId)` behavior
- [ ] Add batch save flow for AI-generated workouts
- [ ] Reuse existing planned-workout persistence flow where possible

Acceptance criteria:

- No direct route-level Prisma sprawl for core library logic
- Snapshot and instantiation logic are centralized and testable
- AI plan flows can save generated workouts without duplicating library-creation logic

### C) API Routes (P0)

Files:

- `server/api/workout-libraries/index.get.ts`
- `server/api/workout-libraries/index.post.ts`
- `server/api/workout-libraries/[id].get.ts`
- `server/api/workout-libraries/[id].patch.ts`
- `server/api/workout-libraries/[id].delete.ts`
- `server/api/workout-libraries/[id]/items.post.ts`
- `server/api/workout-library-items/[id].get.ts`
- `server/api/workout-library-items/[id].patch.ts`
- `server/api/workout-library-items/[id].delete.ts`
- `server/api/workout-library-items/[id]/instantiate.post.ts`

Tasks:

- [ ] Add auth + userId enforcement
- [ ] Validate required input and zero-library flows
- [ ] Return consistent success/error responses
- [ ] Keep mutation behavior aligned with existing planned-workout endpoints
- [ ] Support visibility changes on libraries
- [ ] Add authenticated public-library list/detail endpoints

Acceptance criteria:

- API supports all core CRUD and instantiate flows
- Unauthorized access to another user's libraries/items is blocked
- Public libraries are readable by authenticated non-owners only when visibility is `PUBLIC`

### D) AI Plan Integration (P0)

Files:

- `server/api/plans/initialize.post.ts`
- `trigger/generate-weekly-plan.ts`
- optionally `server/utils/services/workoutLibraryService.ts`

Tasks:

- [ ] Identify the exact point where AI-generated planned workouts become durable records
- [ ] Ensure the AI default library exists before or during that persistence path
- [ ] Save generated AI workouts into the default library as snapshot items after successful creation
- [ ] Make the save path idempotent enough to avoid duplicate library items on trigger retry/re-run
- [ ] Decide whether snapshoting happens for all AI-managed workouts or only plan-generated workouts

Acceptance criteria:

- AI plan generation creates or reuses one default library for the user
- AI-generated workouts appear in that library automatically
- Manual planned workouts do not trigger automatic library creation

## Frontend Work Breakdown

### E) Library Overview & Empty State (P1)

Files:

- `app/pages/workouts/libraries/index.vue`
- `app/components/workouts/library/LibraryCard.vue`
- `app/components/workouts/library/CreateLibraryModal.vue`

Tasks:

- [ ] Build library overview page using current dashboard page patterns
- [ ] Show explicit empty state when no libraries exist
- [ ] Add create-library modal following the Nuxt UI modal rules in project docs
- [ ] Support create, rename, and delete actions
- [ ] Support visibility toggle and copy-public-link action for public libraries

Acceptance criteria:

- Zero-library state is clean and actionable
- Overview works on desktop and mobile
- Public/private state is visible and understandable to owners

### F) Library Detail & Item Actions (P1)

Files:

- `app/pages/workouts/libraries/[id].vue`
- `app/components/workouts/library/LibraryItemCard.vue`
- `app/components/workouts/library/InstantiateLibraryItemModal.vue`
- `app/components/workouts/library/EditLibraryItemModal.vue`

Tasks:

- [ ] Display items for a selected library
- [ ] Add item metadata editing
- [ ] Add instantiate-to-planned-workout modal
- [ ] Support delete item flow

Acceptance criteria:

- User can browse, edit, delete, and instantiate library items
- Item actions have loading/error/success states

### G) Save To Library Entry Points (P1)

Files:

- `app/pages/workouts/planned/[id]/index.vue`
- optional helper composable if flow becomes shared

Tasks:

- [ ] Add "Save to Library" action on planned workout detail
- [ ] If no libraries exist, prompt for create-library inline
- [ ] If libraries exist, allow target library selection
- [ ] Save as snapshot without mutating the source workout

Acceptance criteria:

- Saving from a planned workout is frictionless
- Zero-library users can complete the flow without leaving context

### H) Public Library Read Experience (P1)

Files:

- `server/api/workout-libraries/public.get.ts`
- `server/api/workout-libraries/public/[id].get.ts`
- `app/pages/workouts/libraries/public.vue`
- `app/pages/workouts/libraries/public/[id].vue`

Tasks:

- [ ] Add authenticated in-app endpoints for public library discovery and detail
- [ ] Resolve public library payload with item summaries/details needed for read-only viewing
- [ ] Render public-library pages using normal authenticated app layouts
- [ ] Ensure private libraries cannot be accessed by non-owners

Acceptance criteria:

- Authenticated users can browse public libraries from inside the app
- Private libraries return forbidden/not-found for non-owners
- Public-library pages are read-only for viewers who do not own them

### I) Navigation & Discoverability (P2)

Files:

- `app/layouts/default.vue`
- optionally `app/pages/workouts/index.vue`

Tasks:

- [ ] Add a discoverable entry point to `/workouts/libraries`
- [ ] Optionally add a header CTA from the workouts area

Acceptance criteria:

- Library pages are reachable without relying only on deep links

## Localization

Files:

- `app/i18n/en/workout-library.json`
- translated namespace files as they are added
- `app/plugins/tolgee.ts`

Tasks:

- [ ] Add a feature namespace for workout library UI
- [ ] Add public-library browsing strings to the same namespace or a dedicated discovery namespace
- [ ] Register the namespace in Tolgee static data
- [ ] Use `useTranslate` on user-facing pages/components

Acceptance criteria:

- No raw translation keys render in English
- New namespace follows repo localization rules

## Testing Strategy

### Backend

- Repository unit tests for library and item CRUD
- Service unit tests for snapshot creation and instantiation mapping
- API tests for:
  - auth enforcement
  - ownership enforcement
  - zero-library behavior
  - successful instantiation
  - authenticated public-library list/detail
  - private library public access rejection
  - AI default library creation
  - AI-generated workout snapshot insertion

### Frontend

- Component/page tests for:
  - zero-library empty state
  - create-library modal behavior
  - instantiate modal validation
  - public-library list/detail rendering

### Regression focus

- Ensure instantiated library workouts follow the same scheduling/persistence expectations as manually created planned workouts
- Ensure deleting a library does not affect existing planned workouts created from its items
- Ensure changing a library from `PUBLIC` to `PRIVATE` removes or blocks authenticated cross-user access immediately
- Ensure AI plan retries do not create duplicate default libraries or duplicate library items unintentionally

## Implementation Phases

### Phase 1: Data Model & Service Foundation

Goal:

- Land the Prisma schema, migration, repositories, and service layer without any UI dependency.

Deliverables:

- `WorkoutLibrary` and `WorkoutLibraryItem` models
- repository layer for user-scoped CRUD
- `workoutLibraryService` with:
  - create/update/delete library
  - create/update/delete item
  - clone planned workout to library item
  - instantiate library item to planned workout
  - ensure AI default library

Validation:

- Prisma migration applies cleanly
- unit tests pass for repositories and service mapping logic

### Phase 2: Owner APIs

Goal:

- Expose the owner-facing CRUD and instantiate flows through authenticated REST endpoints.

Deliverables:

- `/api/workout-libraries/*`
- `/api/workout-library-items/*`
- input validation and ownership enforcement

Validation:

- API tests cover auth, ownership, zero-library flows, and instantiation

### Phase 3: AI Plan Integration

Goal:

- Automatically seed the AI default library when AI plan generation creates workouts.

Deliverables:

- integration from `trigger/generate-weekly-plan.ts` into `workoutLibraryService`
- idempotent snapshot insertion for AI-generated workouts

Validation:

- repeated trigger execution does not create duplicate default libraries
- duplicate workout snapshots are guarded appropriately

### Phase 4: Owner UI

Goal:

- Build the authenticated library management experience for owners.

Deliverables:

- `/workouts/libraries`
- `/workouts/libraries/[id]`
- create/edit/delete modals
- save-to-library flow from planned workout detail

Validation:

- zero-library state works
- create/save/instantiate flows work end-to-end in UI

### Phase 5: Authenticated Public Visibility

Goal:

- Let authenticated non-owners browse libraries marked `PUBLIC`.

Deliverables:

- `/api/workout-libraries/public`
- `/api/workout-libraries/public/[id]`
- `/workouts/libraries/public`
- `/workouts/libraries/public/[id]`

Validation:

- private libraries are not accessible cross-user
- public libraries are read-only for non-owners

### Phase 6: Localization, Navigation, and Polish

Goal:

- Finish integration details so the feature feels native to the app.

Deliverables:

- Tolgee namespace registration
- sidebar/nav entry points
- loading/empty/error states
- final lint/test/build verification

Validation:

- no raw keys
- feature is discoverable and stable on desktop/mobile

## Suggested PR Breakdown

### PR 1: Schema + Repositories

Scope:

- Prisma schema/migration
- repository files
- service scaffolding
- repository/service tests

Why first:

- Unblocks everything else with minimal UI surface area.

### PR 2: Owner APIs

Scope:

- authenticated CRUD endpoints
- instantiate endpoint
- API tests

Why second:

- Gives the frontend a stable contract before pages are built.

### PR 3: AI Default Library Integration

Scope:

- hook AI weekly plan generation into the service layer
- idempotency protections
- trigger/service tests

Why separate:

- This is behaviorally sensitive and easier to review in isolation.

### PR 4: Owner Library UI

Scope:

- library overview/detail pages
- create/edit/delete modals
- save-to-library flow from planned workout detail

Why separate:

- UI iteration is easier once backend contracts are stable.

### PR 5: Authenticated Public Browse UI

Scope:

- public list/detail endpoints
- authenticated public library pages
- read-only viewer states

Why separate:

- Keeps cross-user visibility concerns isolated from owner CRUD.

### PR 6: Localization + Navigation + Cleanup

Scope:

- Tolgee namespace
- nav/sidebar integration
- copy polish
- final test hardening

Why last:

- Lets the team polish strings and discovery after the workflows are proven.

## Parallel Workboard

Use one integration owner plus four parallel delivery lanes after the contract is stable.

### Roles

- `Owner A`: foundation/integration owner
- `Owner B`: owner-facing backend and owner UI
- `Owner C`: authenticated public browse
- `Owner D`: AI plan integration
- `Owner E`: localization/navigation/final polish

### Lane 0: Contract Freeze

Owner:

- `Owner A`

Branch:

- `feature/workout-library-foundation`

Scope:

- finalize schema fields
- finalize visibility semantics
- finalize API contract shapes
- create shared library types if needed
- create repository/service interfaces

Files:

- `prisma/schema.prisma`
- `server/utils/repositories/workoutLibraryRepository.ts`
- `server/utils/repositories/workoutLibraryItemRepository.ts`
- `server/utils/services/workoutLibraryService.ts`
- optional `types/workout-library.ts`
- `plans/workout-library-plan.md`

Dependencies:

- none

Outputs required before parallel work begins:

- merged schema/migration
- stable service method names
- stable endpoint request/response contracts
- agreed visibility model: `PRIVATE` vs `PUBLIC` for authenticated users only

### Lane 1: Owner APIs

Owner:

- `Owner B`

Branch:

- `feature/workout-library-owner-api`

Scope:

- owner CRUD routes
- instantiate route
- API tests for owner flows

Files:

- `server/api/workout-libraries/index.get.ts`
- `server/api/workout-libraries/index.post.ts`
- `server/api/workout-libraries/[id].get.ts`
- `server/api/workout-libraries/[id].patch.ts`
- `server/api/workout-libraries/[id].delete.ts`
- `server/api/workout-libraries/[id]/items.post.ts`
- `server/api/workout-library-items/[id].get.ts`
- `server/api/workout-library-items/[id].patch.ts`
- `server/api/workout-library-items/[id].delete.ts`
- `server/api/workout-library-items/[id]/instantiate.post.ts`
- backend tests under `tests/unit/server/api/` and `tests/unit/server/utils/`

Dependencies:

- blocked on Lane 0 merge

Can run in parallel with:

- Lane 2
- Lane 3

Must not redefine:

- schema
- visibility semantics
- service-layer duplicate rules

### Lane 2: Authenticated Public Browse

Owner:

- `Owner C`

Branch:

- `feature/workout-library-public-browse`

Scope:

- authenticated cross-user browse endpoints
- read-only public pages
- public browse tests

Files:

- `server/api/workout-libraries/public.get.ts`
- `server/api/workout-libraries/public/[id].get.ts`
- `app/pages/workouts/libraries/public.vue`
- `app/pages/workouts/libraries/public/[id].vue`
- `app/components/workouts/library/` read-only shared components
- tests for public browse behavior

Dependencies:

- blocked on Lane 0 merge
- should consume the same shared types/contracts as Lane 1

Can run in parallel with:

- Lane 1
- Lane 3

Guardrails:

- no owner-only mutation logic
- no token/share-link implementation
- non-owners are always read-only

### Lane 3: AI Default Library Integration

Owner:

- `Owner D`

Branch:

- `feature/workout-library-ai-default`

Scope:

- ensure default AI library exists
- snapshot AI-generated workouts into that library
- add idempotency protections
- add trigger/service tests

Files:

- `trigger/generate-weekly-plan.ts`
- `server/utils/services/workoutLibraryService.ts`
- `tests/unit/trigger/`
- `tests/unit/server/utils/`

Dependencies:

- blocked on Lane 0 merge
- strongly preferred after Lane 1 service contracts are stable

Can run in parallel with:

- Lane 1
- Lane 2

Special caution:

- this lane touches retry-sensitive code
- duplicate detection must be implemented in the service layer, not ad hoc in the trigger

### Lane 4: Owner UI

Owner:

- `Owner B`

Branch:

- `feature/workout-library-owner-ui`

Scope:

- library overview page
- library detail page
- create/edit/delete modals
- instantiate modal
- save-to-library entry from planned workout detail

Files:

- `app/pages/workouts/libraries/index.vue`
- `app/pages/workouts/libraries/[id].vue`
- `app/components/workouts/library/LibraryCard.vue`
- `app/components/workouts/library/LibraryItemCard.vue`
- `app/components/workouts/library/CreateLibraryModal.vue`
- `app/components/workouts/library/EditLibraryItemModal.vue`
- `app/components/workouts/library/InstantiateLibraryItemModal.vue`
- `app/pages/workouts/planned/[id]/index.vue`

Dependencies:

- blocked on Lane 1 endpoint availability

Can run in parallel with:

- Lane 2 once shared components are coordinated

Guardrails:

- use mocked data or fixture adapters until Lane 1 endpoints are merged
- avoid editing navigation and Tolgee registration until Lane 5

### Lane 5: Navigation, Localization, Final Integration

Owner:

- `Owner E`

Branch:

- `feature/workout-library-polish`

Scope:

- Tolgee namespace and registration
- nav/sidebar entry points
- loading/error/empty-state polish
- final integration fixes across pages

Files:

- `app/plugins/tolgee.ts`
- `app/i18n/en/workout-library.json`
- translated namespace files as needed
- `app/layouts/default.vue`
- any final integration adjustments in library pages/components

Dependencies:

- should start after Lanes 1, 2, and 4 are mostly merged

Why last:

- these files are high-conflict and low-leverage early in development

## Dependency Graph

1. Lane 0 must merge first.
2. Lane 1 and Lane 2 can start immediately after Lane 0.
3. Lane 3 can start after Lane 0, but should consume the final service contract from Lane 1.
4. Lane 4 starts after Lane 1 exposes stable endpoints.
5. Lane 5 starts once the UI shape is settled and the major backend lanes are merged.

## Merge Order

1. `feature/workout-library-foundation`
2. `feature/workout-library-owner-api`
3. `feature/workout-library-public-browse`
4. `feature/workout-library-ai-default`
5. `feature/workout-library-owner-ui`
6. `feature/workout-library-polish`

If Lane 3 is ready before Lane 2 and has low conflict, it can merge earlier. The key rule is that UI should merge after its backend contract is stable.

## Conflict Hotspots

High-conflict files:

- `prisma/schema.prisma`
- `server/utils/services/workoutLibraryService.ts`
- `trigger/generate-weekly-plan.ts`
- `app/pages/workouts/planned/[id]/index.vue`
- `app/layouts/default.vue`
- `app/plugins/tolgee.ts`

Mitigation:

- only `Owner A` edits `prisma/schema.prisma`
- only one lane at a time edits `app/layouts/default.vue` and `app/plugins/tolgee.ts`
- service-layer changes require rebasing all active lanes before merge
- planned-workout detail integration should stay isolated to Lane 4

## Working Rules

1. Do not add new schema fields outside Lane 0 unless the team explicitly reopens the contract.
2. Do not invent new API response shapes in UI branches.
3. Put duplicate-prevention logic in the service layer, not in route handlers or pages.
4. Public library visibility means authenticated in-app browse only.
5. The AI default library is the only auto-created library in v1.
6. Keep PRs small enough that each lane can merge independently without a multi-day rebase.

## Ready-To-Start Checklist

- [ ] Lane 0 owner assigned
- [ ] Schema and API contract approved
- [ ] Shared branch naming agreed
- [ ] High-conflict file ownership agreed
- [ ] Test expectations per lane agreed
- [ ] Merge order agreed

## Suggested Execution Order

1. Schema + migration
2. Repositories/service layer, including AI default-library helpers
3. Core API routes
4. AI plan integration
5. Authenticated public-library discovery/detail
6. Library overview page and empty-state flow
7. Library detail page and instantiate flow
8. Save-to-library entry from planned workout detail
9. Navigation, localization, and polish

## Risks And Mitigations

- Risk: duplicating planned-workout creation logic
  - Mitigation: centralize instantiation in a service that reuses current persistence paths
- Risk: confusion between a library item and a scheduled workout
  - Mitigation: use snapshot language consistently in UI and docs
- Risk: scope creep into AI search, provider publishing, and structured editing
  - Mitigation: keep v1 explicitly focused on capture, browse, and instantiate
- Risk: deleting a library surprises users
  - Mitigation: clear destructive-copy in the delete modal and make planned workouts independent after instantiation
- Risk: public libraries accidentally exposing too much owner context
  - Mitigation: keep public payload minimal and intentionally separate from owner-only views
- Risk: public-library queries becoming noisy or expensive
  - Mitigation: keep v1 filters simple and index by visibility/user/timestamps
- Risk: AI plan retries create duplicate library items
  - Mitigation: use deterministic duplicate guards keyed off source planned workout ID and library ID where possible
- Risk: auto-created default library feels surprising
  - Mitigation: keep auto-creation limited to AI plan flows and label the library clearly as AI-generated

## Open Follow-Ups (Not Blocking v1)

- Should duplicate library names be allowed per user?
- Do we need soft delete/archive instead of hard delete for libraries?
- Should item tags be free-form only, or do we want suggested tags later?
- When we add AI search later, do we index item metadata only or structured workout content too?
- Do we want public libraries to have search/filter/discovery beyond a simple authenticated browse view in v1?
- Should users be allowed to rename the AI default library while preserving its `defaultKind`, or should the default library name stay system-controlled?

## Exit Criteria

- Users can create zero or many workout libraries
- AI plan generation creates or reuses a single default library for AI workouts
- Users can mark a library public and any authenticated user can view it
- Users can save a planned workout into a chosen library
- Users with zero libraries can create one inline during the save flow
- Users can browse library contents and edit item metadata
- Users can instantiate a library item into a new planned workout
- All routes are user-scoped and covered by backend tests
- Public libraries are visible only to authenticated users and are blocked for non-owners when private
- Core library screens are localized and reachable in the app
