# Planned Workout Generation and Rendering Review

**Status:** Read-only architecture review and implementation plan
**Date:** 2026-07-10
**Scope:** Planned workouts, structured-workout generation, Intervals.icu import/export, synchronization, persistence, rendering, editing, and validation.

## Purpose

This document captures the current understanding of the planned-workout system and the recommended hardening plan before implementation begins. It is intended as a review artifact for other agents and engineers.

The primary design constraint is backward compatibility: existing planned workouts must remain untouched unless a user explicitly edits, regenerates, publishes, or deliberately migrates them.

## Production case that triggered the review

Workout:

`5cb539e6-6ece-448c-bd8a-cd6480d4f22c`

Observed record characteristics:

- Type: `Run`
- Title: `Zone 2 Run`
- Duration: 3,600 seconds
- Distance: approximately 7,288 meters
- TSS: 72
- Imported intensity: 0.85
- Structure source: `REMOTE_IMPORT`
- `lastGenerationContext`: null
- `lastGenerationSettingsSnapshot`: null
- `syncConflict`: true
- Imported targets: `pace_zone` values `Z4 → Z2 → Z4`

The production page rendered values such as:

- Estimated distance around 513 km
- Average intensity around 180%
- Chart scale around 18,700%

The root cause was a unit mismatch: imported pace-zone bounds were treated as metres/second even though the source profile contained values in metres/minute. The system also lacked a single canonical target/unit contract.

## Current architecture

```text
Intervals/local plan
  → PlannedWorkout row
  → optional structuredWorkout JSON
  → AI generation or remote sync
  → normalization + metrics
  → Intervals publish/sync
  → planned-workout API
  → sport-settings resolution
  → Vue sport-specific renderer
  → chart/editor/export
```

### Persistence model

`PlannedWorkout` stores both scheduling metadata and an untyped JSON structure:

- [prisma/schema.prisma:883](/Users/hdkiller/Develop/coach-wattz/prisma/schema.prisma:883)
- `structuredWorkout`
- `rawJson`
- `structureHash`
- `remoteStructureHash`
- `pendingRemoteStructuredWorkout`
- `syncConflict`
- `lastStructureEditSource`
- `createdFromSettingsSnapshot`
- `lastGenerationSettingsSnapshot`
- `lastGenerationContext`

`SportSettings` also stores zones and targets as JSON:

- [prisma/schema.prisma:189](/Users/hdkiller/Develop/coach-wattz/prisma/schema.prisma:189)

There is no database-enforced schema version or unit discriminator for either JSON payload.

### Import and synchronization

Intervals planned workouts are normalized in:

- [server/utils/intervals.ts:1341](/Users/hdkiller/Develop/coach-wattz/server/utils/intervals.ts:1341)

The full sync path upserts planned workouts and performs local/remote structure conflict decisions in:

- [server/utils/services/intervalsService.ts:1228](/Users/hdkiller/Develop/coach-wattz/server/utils/services/intervalsService.ts:1228)
- [server/utils/planned-workout-structure-sync.ts:100](/Users/hdkiller/Develop/coach-wattz/server/utils/planned-workout-structure-sync.ts:100)

The sync model can preserve local changes and hold a pending remote structure, but the planned-workout UI does not currently expose this conflict state clearly.

### AI generation

Generation is asynchronous through Trigger.dev:

- [server/api/workouts/planned/[id]/generate-structure.post.ts:77](/Users/hdkiller/Develop/coach-wattz/server/api/workouts/planned/[id]/generate-structure.post.ts:77)
- [trigger/generate-structured-workout.ts:760](/Users/hdkiller/Develop/coach-wattz/trigger/generate-structured-workout.ts:760)

The task:

1. Loads the planned workout.
2. Loads sport-specific settings.
3. Resolves target policy and target format policy.
4. Builds an AI prompt.
5. Uses the compact draft generator for ride/run/swim.
6. Normalizes targets and structure.
7. Validates duration/renderability.
8. Calculates distance, TSS, and intensity.
9. Persists structure and generation snapshots.
10. Publishes or updates Intervals when configured.

### Rendering and editing

The planned-workout page fetches the workout and current sport settings:

- [app/pages/workouts/planned/[id]/index.vue](/Users/hdkiller/Develop/coach-wattz/app/pages/workouts/planned/[id]/index.vue)
- [server/api/workouts/planned/[id].get.ts](/Users/hdkiller/Develop/coach-wattz/server/api/workouts/planned/[id].get.ts)

Sport-specific renderers include:

- [app/components/workouts/planned/RunView.vue](/Users/hdkiller/Develop/coach-wattz/app/components/workouts/planned/RunView.vue)
- [app/components/workouts/WorkoutRunChart.vue](/Users/hdkiller/Develop/coach-wattz/app/components/workouts/WorkoutRunChart.vue)
- `MiniWorkoutChart.vue`
- `WorkoutChart.vue`
- `WorkoutStepRow.vue`
- workout structure editors

These components currently duplicate pace conversion and target-selection logic.

## Confirmed and likely risks

### 1. No canonical target/unit model — highest priority

The system currently handles several representations:

- `pace_zone`
- `zone`
- `%pace`
- `Pace`
- `/km`
- `m/s`
- raw pace-zone bounds
- imported metres/minute values

The same target can be interpreted differently by import, persistence, charting, editing, export, and analysis code.

The importer explicitly contains placeholder logic for pace-zone units:

- [server/utils/intervals.ts:1839](/Users/hdkiller/Develop/coach-wattz/server/utils/intervals.ts:1839)

The current defensive repository normalization is read-time only:

- [server/utils/repositories/sportSettingsRepository.ts:13](/Users/hdkiller/Develop/coach-wattz/server/utils/repositories/sportSettingsRepository.ts:13)

It does not repair direct Prisma consumers or establish a persisted unit contract.

### 2. Pace conversion is duplicated in the frontend

Pace conversion exists independently across several components. Examples:

- [WorkoutRunChart.vue:951](/Users/hdkiller/Develop/coach-wattz/app/components/workouts/WorkoutRunChart.vue:951)
- [RunView.vue:194](/Users/hdkiller/Develop/coach-wattz/app/components/workouts/planned/RunView.vue:194)
- `MiniWorkoutChart.vue`
- `WorkoutChart.vue`
- `WorkoutStepRow.vue`

This allows the detail page, calendar, share page, editor, and export preview to disagree.

### 3. Imported profile pace zones are not consistently populated or normalized

The Intervals profile fetch calculates `currentPaceZones` but does not include it in the returned sport-settings object:

- [server/utils/intervals.ts:743](/Users/hdkiller/Develop/coach-wattz/server/utils/intervals.ts:743)

The generic zone converter also leaves pace values as-is:

- [server/utils/intervals.ts:1809](/Users/hdkiller/Develop/coach-wattz/server/utils/intervals.ts:1809)

This is an upstream source of the production mismatch.

### 4. Conflict state is persisted but not clearly surfaced

The schema and merge service support conflicts, but the planned-workout page does not visibly explain when `syncConflict` is true or when a remote structure is waiting in `pendingRemoteStructuredWorkout`.

For the production record, the displayed structure can be local while a newer remote version is pending, without a clear user-facing resolution workflow.

### 5. Regenerate semantics are ambiguous

Generation sets:

```ts
const preserveExistingStructure = Boolean(workout.structuredWorkout)
```

See [trigger/generate-structured-workout.ts:927](/Users/hdkiller/Develop/coach-wattz/trigger/generate-structured-workout.ts:927).

Therefore “Regenerate” may preserve an imported or old structure rather than rebuild from scratch using current settings. The product should distinguish:

- rebuild from scratch
- adjust existing structure
- reapply current target policy

### 6. Target policy may override original workout intent

Strict target policy can remove fallback metrics:

- [trigger/utils/workout-targeting.ts:861](/Users/hdkiller/Develop/coach-wattz/trigger/utils/workout-targeting.ts:861)
- [trigger/utils/workout-targeting.ts:922](/Users/hdkiller/Develop/coach-wattz/trigger/utils/workout-targeting.ts:922)

A run imported as pace-targeted can be regenerated as HR-targeted if the current run profile says HR is primary and strict primary is enabled. This may be correct, but it must be explicit to users.

### 7. Generation override is accepted but ignored

The task payload accepts `generatorOverride`, but the actual mode is resolved from workout type instead of the override:

- [trigger/generate-structured-workout.ts:765](/Users/hdkiller/Develop/coach-wattz/trigger/generate-structured-workout.ts:765)
- [trigger/generate-structured-workout.ts:854](/Users/hdkiller/Develop/coach-wattz/trigger/generate-structured-workout.ts:854)

### 8. Generation deduplication is user-scoped, not workout-scoped

Tasks use a user-level concurrency key. This serializes work but does not prevent multiple queued jobs for the same planned workout. The repository already tracks this known issue:

- [docs/issues/013-chat-duplicate-structure-generation-triggers.md](/Users/hdkiller/Develop/coach-wattz/docs/issues/013-chat-duplicate-structure-generation-triggers.md)

Duplicate jobs can overwrite structures, snapshots, metrics, and sync state.

### 9. Validation checks presence and duration more strongly than semantics

Generation validates renderability and duration coverage, but semantic validation is limited. It does not consistently reject:

- implausible running speeds
- implausible distances
- malformed units
- invalid zone relationships
- inconsistent ramp direction
- target metrics that disagree with workout intent

The production case had valid steps and valid duration, so it passed while rendering an impossible distance.

### 10. JSON schema drift is a structural risk

AI schemas, imported structures, legacy structures, strength blocks, swim steps, and editor payloads all use overlapping but different shapes. The database accepts all of them because `structuredWorkout` is free-form JSON.

There is no enforced `schemaVersion`, migration registry, or formal discriminator for sport-specific structure variants.

## Canonical contract to introduce

Recommended internal units:

- Pace speed: m/s
- Threshold pace: m/s
- Pace-zone bounds: m/s
- Heart rate: explicitly either bpm or normalized threshold fraction
- Power: explicitly either watts or FTP fraction
- Duration: seconds
- Distance: meters

Every canonical structure must carry an explicit envelope. `source` is provenance, not
the source unit; the original external payload remains in `rawJson` for audit and
re-import debugging. `zoneProfileSnapshot` is the resolved profile used at import or
generation time, so a later profile update cannot change the meaning of an old zone
index.

```ts
type StructureSource = "INTERVALS_IMPORT" | "AI_GENERATION" | "MANUAL_EDIT" | "LEGACY_ADAPTER"

{
  schemaVersion: 1,
  source: "INTERVALS_IMPORT" as StructureSource,
  zoneProfileSnapshot: {
    pace: { unit: "m/s", ranges: [{ min: 2.2, max: 2.4, label: "Z2" }] }
  },
  steps: []
}
```

Targets must be a discriminated union. Each variant has one unambiguous absolute or
relative unit; `kind: "zone"` includes both the original zone index/label and the
resolved canonical range. Unsupported targets remain explicitly `kind: "freeform"`
rather than being guessed or coerced.

Recommended pace-zone target shape:

```ts
{
  metric: "pace",
  kind: "zone",
  zone: 2,
  rangeMps: {
    min: 2.20,
    max: 2.40
  },
  relativeToThreshold: {
    min: 0.82,
    max: 0.89
  }
}
```

The system should retain legacy adapters for old records instead of requiring an immediate database rewrite. An adapter may only convert when the source unit is declared or independently known from the source contract. It must never infer a pace unit from magnitude. Ambiguous values remain legacy/unresolved, retain their raw representation, and produce a diagnostic instead of a misleading chart or export.

## Implementation plan

### Phase 0 — Freeze behavior

Create fixtures from:

- the production `Zone 2 Run`
- imported pace-zone profiles
- AI-generated run, ride, swim, and strength workouts
- local-only workouts
- local edits followed by remote changes

Record current duration, distance, TSS, intensity, target metric, rendered chart range, export text, and sync state.

### Phase 1 — Complete path inventory

Audit every planned-workout producer and consumer:

- Intervals import and webhook
- manual creation
- chat
- recommendations
- plan generation
- library
- AI generation and adjustment
- dashboard/calendar
- details page
- charts/editors
- share pages
- Garmin/Rouvy export
- adherence and nutrition

Identify all direct Prisma access that bypasses repositories and normalization.

#### Confirmed endpoint and consumer findings

The following paths are confirmed producers or consumers and must be migrated as part
of this work, not treated as incidental follow-up:

- `GET /api/workouts/planned/:id` returns the live sport settings separately from the
  stored structure. The detail and charts pages currently prefer those settings, so
  existing zone targets can drift when an athlete updates their profile.
- `PATCH /api/workouts/planned/:id/structure` accepts raw editor steps and resolves
  them using current settings. It must instead accept a versioned edit command,
  normalize against the structure's snapshot (or explicitly create a new snapshot),
  validate, and persist one canonical result.
- That PATCH route currently publishes the raw text/input representation to Intervals
  after persisting normalized data. Publish must serialize the persisted canonical
  structure, otherwise local rendering and remote execution can differ.
- Planned-workout Intervals preview, publish, Garmin publish, and file-download routes
  each independently assemble converter input. They must call one server-side export
  adapter with the canonical structure and the captured snapshot.
- The public share page passes only bare `structuredWorkout` to `WorkoutChart`; it has
  neither the current settings nor the generation snapshot. Shared rendering needs a
  safe, self-contained render model or the structure envelope's snapshot.
- `WorkoutRunChart`, `RunView`, `MiniWorkoutChart`, `WorkoutChart`,
  `WorkoutStepsEditor`, and `WorkoutStepRow` each resolve targets independently.
  Several still infer units from numeric magnitude or use fallback zone factors.
- Switching the metric in `WorkoutStepsEditor` rewrites targets into display-oriented
  units such as `Pace`, `%`, and `LTHR` and removes the other targets. This must become
  an explicit canonical edit operation with a confirmation when it changes the
  workout's target policy or discards targets.
- `WorkoutConverter`, structured-workout persistence, generation metrics, and
  targeting utilities all contain separate pace conversion heuristics. These are
  migration sites for the shared normalizer; no heuristic may remain on a canonical
  input path.
- The download route validates only `zwo` and `fit` even though it contains `mrc` and
  `erg` cases. Align its request contract with the formats actually supported and add
  authorization, canonical-serialization, and content-type tests for each format.
- Chat tools can replace or patch a planned structure directly, using a permissive
  passthrough schema and current sport settings. They must call the same versioned
  canonical-edit service as the HTTP editor route.
- Library template create/update routes accept `structuredWorkout: z.any()` and have
  their own metric calculation path. Templates are a producer for planned workouts, so
  they need the same canonical contract or an explicit, tested template-to-canonical
  adapter before a template can be scheduled or generated.
- The ad-hoc generator creates and may auto-publish an unstructured planned workout
  before its background structure generation completes. Its publish flow must wait for
  the canonical structure or publish a clearly metadata-only event and enqueue a
  revision-aware update afterward.
- Adjustment tasks and chat-triggered generation use their own enqueue sites. All
  enqueue sites must create the same per-workout generation run and revision; a
  user-scoped Trigger queue is not sufficient coordination.

### Phase 1A — Lock storage, write, and migration contract

Before moving any consumer, define the data lifecycle and execute a compatibility
migration:

1. Add a durable generation-run record (or equivalent fields) with workout ID,
   revision, idempotency key, mode, request/settings snapshot, status, timestamps,
   error, and Trigger run ID. Add a uniqueness constraint for an active run and an
   index on workout/revision.
2. Add an optimistic-concurrency version to `PlannedWorkout` (or use a strictly
   checked generation revision) and require it on every structure write. Structure,
   derived metrics, hashes, snapshots, and sync intent update in one transaction.
3. Keep `structuredWorkout` dual-readable during rollout: legacy adapter first,
   canonical envelope second. Do not dual-write a lossy representation.
4. Define rollback behavior: code can read both versions, a failed canary can stop
   new writes, and no rollback rewrites user structures or provider payloads.
5. Introduce one `writeCanonicalStructure` service as the sole owner of structure
   persistence. HTTP editor, chat tools, templates when scheduled, imports,
   generation, adjustment, and conflict resolution must call it.

Define field ownership in that service. Canonical steps are the source of truth for
computed duration, distance, TSS, intensity, and structure hash. Client-supplied
summary values are requests/constraints only and must be either reconciled or rejected
with diagnostics. The service recomputes and writes all derived fields atomically;
callers cannot selectively preserve stale metrics.

### Phase 1B — Publish a support matrix

Before defining schema version 1, publish an acceptance matrix covering each sport
(ride, run, swim, strength), target kind (power, heart rate, pace, cadence, RPE,
freeform), and destination (editor, chart, share, Intervals, Garmin, Rouvy, ZWO, FIT,
MRC, ERG). Every cell is explicitly one of: canonical and supported; converted with a
documented tolerance; display-only; retained as provider raw data; or rejected. This
prevents a run-pace fix from silently degrading swim, strength, or device export.

### Phase 2 — Introduce shared normalization

Create a shared server/client normalization module that:

1. Converts external targets into canonical units.
2. Converts legacy targets into canonical targets.
3. Resolves zone indexes against the captured canonical zone-profile snapshot.
4. Produces display/export models separately.
5. Emits diagnostics when values are ambiguous or implausible.

The module API should have separate operations for `adaptLegacy`, `normalizeExternal`,
`applyCanonicalEdit`, `validateCanonical`, `toRenderModel`, and
`serializeForProvider`. UI components must receive a render model, never raw targets
plus live settings. Provider routes must serialize the persisted canonical structure,
never the request body or a chart/editor intermediate representation.

Define bounded runtime schemas for both canonical and legacy adapter input. At every
HTTP, chat-tool, AI, and provider boundary, enforce maximum payload bytes, nesting
depth, repeat count, expanded step count, message count, duration, distances, and
numeric target ranges before recursive rendering, metric calculation, or export.
Unknown fields must be retained only in isolated provider-raw data, never spread into
the canonical structure.

Add a structure schema version, source/provenance, explicit target-unit discriminators, and zone-profile snapshots while keeping old records readable. Keep pure normalization, validation, and render-model code dependency-free so the same implementation can safely run on server and client; keep Prisma, HTTP, and provider adapters outside that module.

### Phase 3 — Fix import boundaries

At the Intervals profile boundary:

1. Include pace zones in the returned profile.
2. Declare the incoming source unit.
3. Convert to canonical m/s.
4. Store or expose canonical values consistently.
5. Preserve the declared external unit and original provider payload for audit.
6. Capture the canonical zone-profile snapshot used to resolve every imported zone index.
7. Add tests for metres/minute, m/s, unsupported units, and malformed source values.

For an imported workout without an unambiguous source unit or usable profile snapshot,
preserve its raw structure and mark it unresolved. Do not replace it with fallback
zone factors, calculated distances, or an export that changes its target meaning.

The initial rollout should normalize on read. A historical backfill should be separate, dry-run capable, and explicitly approved.

### Phase 4 — Harden generation

Add:

- per-workout idempotency
- persisted generation run state
- monotonically increasing generation revision and conditional persistence: a job may write only when its revision is still current
- explicit regenerate vs adjust mode
- working, allow-listed `generatorOverride`, validated against the workout sport and mode
- target-semantic validation
- realistic pace/distance bounds
- stronger per-step validation
- clear settings-snapshot precedence

The enqueue operation must atomically create or reuse an active run for the workout and assign its revision. Retries reuse that run's idempotency key; a user-requested newer run supersedes the prior revision. A completed stale job is recorded for observability but must not overwrite the structure, snapshots, metrics, or sync state.

Generation must never persist a structure that cannot be rendered and exported consistently.

Manual editing must use the same validation and canonical-edit operation as generation.
Changing primary metric, zone profile, or target policy is a deliberate operation: the
response must identify which targets were converted or removed and require explicit
client confirmation before persistence.

### Phase 5 — Harden synchronization

Add an explicit conflict workflow:

- remote update pending
- keep local
- accept remote
- compare versions
- regenerate locally

Store remote update metadata when available, including the remote revision/hash, received timestamp, original payload, and provider unit contract. Do not silently discard pending remote structures during ordinary edits.

Use the existing sync queue as a revision-aware outbox rather than a blind replay
queue. Each entry must identify the canonical structure revision/hash it intends to
publish. A worker claims the newest eligible entry, serializes the current canonical
structure at send time, and discards/supersedes entries made stale by a later edit.
Provider success/failure updates the same revision only; it must not mark a newer local
revision as synced. Retry policy needs exponential backoff, terminal-failure visibility,
and a user retry action.

Verify this round trip:

```text
canonical local structure
  → Intervals export
  → Intervals import
  → canonical structure
```

Define an explicit Intervals serializer/deserializer pair with source-unit conversion, repeat handling, and documented rounding tolerances before implementing this test. The round trip must preserve target meaning, duration, distance, and repeats within those tolerances; it need not preserve provider JSON byte-for-byte.

### Phase 6 — Unify rendering/editing

Move all Vue consumers to one normalized render model:

```text
raw structure
  → canonical normalized structure
  → chart/editor/display model
```

The model should provide:

- display target
- chart-relative intensity
- absolute pace/speed
- zone label
- estimated distance
- duration
- ramp direction
- raw target for editing

Editors should write canonical targets, not whichever display format is active. A
render model must carry an edit token or canonical target reference rather than making
the UI reconstruct a target from a displayed percentage. Remove numeric-magnitude
unit inference and threshold-relative fallback zone factors from charts; unresolved
targets render as unresolved with diagnostics, not as plausible-looking estimates.

### Phase 7 — Tests

Add tests for:

- every supported target unit
- metres/minute to m/s conversion
- rejection/diagnosis of unknown units without magnitude-based guessing
- `pace_zone` resolution
- zone-profile snapshot stability after current sport settings change
- missing settings
- malformed ranges
- nested repeats
- ramp direction
- settings snapshot precedence
- import/export round trips
- serializer rounding tolerances and provider-unit conversions
- duplicate, retried, and stale generation jobs cannot overwrite the latest revision
- conflict preservation and resolution
- detail, charts, mini-chart, calendar, chat card, and public-share render the same
  canonical fixture identically despite changed live sport settings
- manual edit uses the structure snapshot, persists canonical output, and publishes
  the same canonical structure to Intervals
- target-policy/metric change clearly reports and confirms target removal or conversion
- every export format accepted by the download endpoint reaches the intended converter
  with the expected content type
- exact production workout rendering

The production-shaped fixture must assert approximately:

- 7.3 km distance
- 0.85 average intensity
- normal chart scale
- `Z4 / Z2 / Z4` target labels

Add component and end-to-end coverage for generate, adjust, edit, publish, import, and conflict resolution.

Add contract, migration, and resilience coverage for:

- all writers: HTTP editor, chat set/patch, generator, adjuster, import, templates,
  recommendation/plan creation, and ad-hoc creation
- stale write rejection and atomic consistency of structure, metrics, snapshots, hash,
  and sync intent
- legacy/canonical dual-read plus deploy rollback without rewriting records
- payload, recursion, repeat, and expanded-step limits at every untrusted boundary
- retry queue supersession: an old queued provider payload cannot overwrite or mark a
  newer canonical revision as synced
- ad-hoc creation and auto-publish ordering

### Phase 8 — Rollout

1. Add diagnostics without changing behavior.
2. Fix import/profile normalization.
3. Introduce shared normalization.
4. Move rendering to the shared model.
5. Add generation idempotency and semantic validation.
6. Add conflict UI.
7. Enable behind a feature flag.
8. Canary with a small cohort.
9. Monitor implausible distances, high intensity, zero-step structures, generation retries, conflicts, and round-trip mismatches.
10. Monitor rejected/ambiguous input units, canonical-write conflicts, stale job and
    stale outbox discards, terminal provider failures, and validation-limit rejections
    using privacy-safe identifiers and sampled diagnostics rather than raw workouts.
11. Consider a deliberate historical backfill only after validation.

## Non-negotiable invariants

- Existing planned workouts are not rewritten automatically.
- Every internal pace value has a known unit.
- Ambiguous legacy values are never silently interpreted as canonical values.
- Zone indexes resolve against the profile snapshot that was active when the structure was imported or generated.
- Every chart uses the same normalized target model as export.
- Every generated structure is renderable and exportable.
- Remote/local conflicts are not silently discarded.
- Generation is idempotent per planned workout.
- A stale generation run cannot overwrite a newer run.
- Imported workouts remain distinguishable from AI-generated workouts.
- Settings snapshots explain how a generated structure was built.

## Decisions to lock before implementation

Recommended decisions:

1. Existing workouts are never automatically rewritten.
2. Canonical internal pace is m/s; unknown legacy pace units are diagnosed, not inferred.
3. Imported and generated zone indexes use a captured canonical zone-profile snapshot.
4. Generated workouts use the settings snapshot captured at generation time.
5. Explicit regeneration opts into current settings.
6. Imported workouts remain imported unless deliberately regenerated.
7. Conflicts require explicit resolution.
8. Legacy JSON remains readable through adapters.
9. Database backfill, if needed, is a separate controlled operation.
10. Generation persistence uses a revision fence as well as an idempotency key.

## Review questions for other agents

1. Is m/s the correct canonical pace unit for all server and client paths?
2. Should pace-zone source units and zone-profile snapshots be persisted in the structure envelope, or in separate versioned metadata?
3. Should regeneration preserve session identity or rebuild from scratch?
4. Should generated workouts use current settings or their original settings snapshot?
5. Is accepting a remote structure an explicit user action or can clean local records auto-accept it?
6. Should conflicts block publishing until resolved?
7. What bounds should define an implausible run pace or distance?
8. Which planned-workout consumers are allowed to bypass the repository layer?
9. Should existing malformed data be repaired lazily, by backfill, or both?
10. What production telemetry is required before enabling the new model globally?
11. Which target variants are supported in schema version 1, and which must remain `freeform` until adapters exist?
12. What are the documented rounding tolerances for every Intervals export/import conversion?
