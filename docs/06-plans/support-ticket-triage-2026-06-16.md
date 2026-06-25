# Support Ticket Triage Report - 2026-06-16

## Scope

This report reviews the 50 most recent support tickets in production as of 2026-06-16 using `pnpm cw:cli support tickets` and `pnpm cw:cli db sql ... --prod`.

No ticket statuses, comments, or product code were changed as part of this investigation.

## Snapshot

- Tickets reviewed: 50
- Status mix:
  - `OPEN`: 48
  - `IN_PROGRESS`: 1
  - `RESOLVED`: 1
- Dominant theme: sync and ingestion failures
  - Rough bucket count: 27 of 50
- Repeat reporters:
  - `dzmitrysuravets@gmail.com`: 11 tickets
  - `ralf.gieske@googlemail.com`: 11 tickets
  - `sylvain.deroch@gmail.com`: 5 tickets

## Executive Summary

The current queue is not mostly 50 independent problems. It is a smaller number of recurring incidents that are being re-reported as fresh tickets.

The biggest operational issue is repeated sync and ingestion failures, especially around Intervals.icu, Garmin/Hammerhead imports, and downstream activity visibility. Two users alone account for 22 of the last 50 tickets, and many of their tickets appear to describe the same unresolved incidents from different days or angles.

The queue would benefit from consolidation into a small set of canonical incident tickets, with later related reports linked as duplicates or follow-ups. Without that, the apparent backlog size overstates the number of distinct engineering problems and makes prioritization harder.

## Major Clusters

### 1. Sync and ingestion failures

This is the largest cluster and the highest leverage area to address first.

Representative tickets:

- `05c440b8-416c-4352-b750-1eb77061a90a` `HIGHEST PRIORITY: Bridge Sync Failure (Intervals -> AI) - Ralf Gieske`
- `ba28a661-3f38-4db5-bb95-54adcb01807a` `Sync-Fehler: Keine Daten-Updates seit 10.05.2026 (Ralf Gieske)`
- `8ce1eb5f-b665-463b-a75a-57b23057efd8` `Workout-Synchronisation verzögert/funktioniert nicht (User: Ralf)`
- `343d3dc4-2230-4ed6-84ba-2b26f9bd6637` `Data Sync Issue - Workouts missing for Ralf Gieske`
- `f2925038-7525-4e73-8140-f314c7a95c44` `Sync issue: Workouts from Intervals.icu not appearing`
- `71d6b51a-9fa8-4af1-8823-2a07975df6ca` `CRITICAL: Persistent 2-Week Data Sync Failure (Ralf Gieske)`
- `698b9bf5-2a86-4c7a-944a-d88fbdd83e18` `Datenstream`
- `d94f8241-8439-45c8-8b94-03a518bf2259` `Synchronisationsfehler Intervals.icu ab Anfang Mai`
- `afe90d13-aad1-484b-bdd9-c06b84cb5744` `Dashboard TSS and Workout Sync Issues - Ralf Gieske`
- `4076711c-d3e5-40fa-823b-f5b6f02081e8` `Intervals.icu sync failure reported by user`
- `3087f54b-59ff-4f58-9945-97d194cfd3b0` `Intervals.icu Sync Issue - 2026-05-15 9:19 PM`
- `f56f33f6-e8fd-46b0-a587-8c1b75861354` `Intervals.icu Sync Issue - Workout not loading`
- `ddaed42a-c844-4cd5-b279-f2f376ed0c91` `Hammerhead Sync Issue - May 13 - Дима`
- `d46cdb78-c9d3-427d-9bb1-289debbaca35` `Workout not syncing from Intervals.icu`
- `65aa4f0a-9f0d-450d-ac81-83dcd14cea4c` `Workout from yesterday not syncing`
- `221c609f-ae1c-4020-b4cc-d61d059d39e9` `Workout not syncing to Intervals.icu`
- `fd7c42ec-19f1-4a15-bde9-4ffd223af28d` `Missing Cycling Workout Sync - 2026-06-06`
- `8f567102-c948-4039-8e73-5fe60f9f9047` `Workouts from Garmin/Intervals.icu not syncing`
- `fec5b9ae-5a3b-46af-af24-507efdcb0abd` `Strava activity not syncing`
- `85182d74-4ba2-469b-bd89-1f56857f6a51` `Intervals.icu Data Sync Failure`
- `ae78baec-9842-49b8-90e7-0db439c09fd6` `Missing Cadence Data from Garmin/ICU for User David Conley`

Assessment:

- This cluster likely contains both:
  - one broad ingestion reliability incident
  - several narrower source-specific bugs
- The Ralf and Dzmitry tickets are clearly repetitive enough to consolidate.
- Some tickets may be symptoms rather than separate causes, for example:
  - missing workouts
  - delayed activity rendering
  - missing TSS
  - missing cadence

### 2. Activity tab and activity rendering failures

Representative tickets:

- `d1f6ddbd-90b6-4bc6-aac7-7b87771bfa34` `Вкладка «Деятельность» не загружается`
- `eeccc4ba-554c-4475-a457-72dfcbba8f73` `Вкладка 'Деятельность' и тренировки не загружаются`
- `fcc8048a-e902-4d8f-a99a-902c0cb08442` `Aktivitätsanzeige auf Mobilgeräten (und evtl. generell) defekt`
- `0d62fa04-884d-4fcd-a328-2226f2eb4ad5` `Проблема отображения структуры тренировок в Activity/Календаре`

Assessment:

- `d1f6ddbd` and `eeccc4ba` look like duplicate reports from the same user on 2026-05-30.
- `fcc8048a` may be the same frontend rendering/loading family, but should be validated before merging because it explicitly mentions mobile.
- `0d62fa04` appears adjacent but not identical. It is more about malformed workout structure rendering than total page failure.

### 3. Structured workout generation and display

Representative tickets:

- `a232e0ab-245e-4e95-ac37-e03fa7db6e37` `Workout steps missing for ID ad1d83d8-abea-4d1b-946a-c3c9d0ecf638`
- `0eb3e1a5-101d-4746-91b3-0e9529195072` `Structured steps missing for workout 1c6a4d09-ad4a-4adc-ad35-440488d1b82b`
- `d3512b30-86a2-493d-beff-ab6fdb66378d` `Failure to update planned workout structure for user Дима`
- `0d62fa04-884d-4fcd-a328-2226f2eb4ad5` `Проблема отображения структуры тренировок в Activity/Календаре`

Assessment:

- These are likely related to a shared structured-workout pipeline, but they are not safe to mark as duplicates yet.
- They should be grouped under one engineering investigation owner because they all touch workout structure creation, persistence, or rendering.

### 4. Chat and AI quality

Representative tickets:

- `6895d6a0-f4b9-466e-9caf-2bdb54464d90` `не работает чат`
- `eef22f81-ed15-4282-a5a0-bef89ee07a4e` `AI chat`
- `dacd72e1-fc2d-42ca-baec-629f14806fa5` `Incorrect AI Workout Analysis`
- `015fb174-0957-4d1d-aadb-d11127507b83` `ERG Mode Not Recognized in Workout Analysis`
- `e95af730-3322-4dbd-a4e9-98558a993211` `Bug de raisonnement temporel - Confusion événement passé/futur`
- `c98c8a28-181f-43c0-b760-8ac0d76bfbf4` `Feedback sur Coach Watts : Rétention du contexte et proactivité des ajustements`
- `13b95016-2b92-4414-9bbf-ce56b903b7f1` `Problème d'utilisation du bot Telegram - Slyder`

Assessment:

- `6895d6a0` and `eef22f81` are strong duplicate candidates from the same user on the same day.
- The other AI tickets are related by product area, but not duplicates. They should be separated into:
  - chat availability and timeout failures
  - workout analysis correctness
  - temporal reasoning and memory/context quality
  - Telegram channel-specific behavior

### 5. Single-ticket but high-severity outliers

- `31cf00a6-f276-456b-aa74-b44b8b2d575e`
  - Potential cross-user workout exposure
  - This is the most severe data-integrity or privacy risk in the sample
- `9f3975a4-55fd-40c5-a757-d420a95e9424`
  - Account deletion request
  - Operational rather than engineering, but should not sit mixed into the bug backlog
- `86197b3a-9527-4b11-b0a0-976f210367b2`
  - App inaccessible
  - Needs validation, but could represent an availability incident

## Strong Duplicate Candidates

These are the clearest places to consolidate without much ambiguity.

### Ralf Gieske sync incident cluster

Use `05c440b8-416c-4352-b750-1eb77061a90a` as the canonical incident unless a newer master ticket is preferred.

Probable duplicates or follow-ups:

- `ba28a661-3f38-4db5-bb95-54adcb01807a`
- `8ce1eb5f-b665-463b-a75a-57b23057efd8`
- `343d3dc4-2230-4ed6-84ba-2b26f9bd6637`
- `f2925038-7525-4e73-8140-f314c7a95c44`
- `71d6b51a-9fa8-4af1-8823-2a07975df6ca`
- `698b9bf5-2a86-4c7a-944a-d88fbdd83e18`
- `d94f8241-8439-45c8-8b94-03a518bf2259`
- `afe90d13-aad1-484b-bdd9-c06b84cb5744`
- `fcc8048a-e902-4d8f-a99a-902c0cb08442`

Notes:

- `fcc8048a` may be downstream UI fallout rather than the same root cause.
- Keep it linked to the incident, but validate before formally setting `DUPLICATE`.

### Dzmitry sync and activity cluster

No single perfect master exists yet, but `4076711c-d3e5-40fa-823b-f5b6f02081e8` or `3087f54b-59ff-4f58-9945-97d194cfd3b0` are good candidates.

Probable duplicates or closely related reports:

- `f56f33f6-e8fd-46b0-a587-8c1b75861354`
- `ddaed42a-c844-4cd5-b279-f2f376ed0c91`
- `d1f6ddbd-90b6-4bc6-aac7-7b87771bfa34`
- `eeccc4ba-554c-4475-a457-72dfcbba8f73`
- `6895d6a0-f4b9-466e-9caf-2bdb54464d90`
- `eef22f81-ed15-4282-a5a0-bef89ee07a4e`

Notes:

- This cluster probably includes at least three sub-problems:
  - sync/import failure
  - activity page loading/rendering failure
  - chat availability
- They should not all be collapsed into one ticket, but they should be grouped under one user incident timeline.

### Same-day chat duplicates

- `6895d6a0-f4b9-466e-9caf-2bdb54464d90`
- `eef22f81-ed15-4282-a5a0-bef89ee07a4e`

### Same-day activity-page duplicates

- `d1f6ddbd-90b6-4bc6-aac7-7b87771bfa34`
- `eeccc4ba-554c-4475-a457-72dfcbba8f73`

## Recommended Triage Order

### Priority 0

- `31cf00a6-f276-456b-aa74-b44b8b2d575e`
  - Investigate possible data leak immediately

### Priority 1

- Canonical sync incident for Ralf
- Canonical sync incident for Dzmitry
- General sync failures affecting additional users:
  - `221c609f-ae1c-4020-b4cc-d61d059d39e9`
  - `fd7c42ec-19f1-4a15-bde9-4ffd223af28d`
  - `8f567102-c948-4039-8e73-5fe60f9f9047`
  - `85182d74-4ba2-469b-bd89-1f56857f6a51`
  - `d46cdb78-c9d3-427d-9bb1-289debbaca35`

### Priority 2

- Activity tab and frontend rendering failures
- Structured workout step generation and rendering failures
- Chat availability failures

### Priority 3

- Analysis quality and reasoning issues
- Nutrition, Yazio, Health Sync, Huawei Health, subscription, and account operations

## Proposed Operational Plan

### 1. Consolidate the queue

- Pick one master incident ticket for Ralf sync issues.
- Pick one master incident ticket for Dzmitry sync issues.
- Mark obvious same-incident repeats as `DUPLICATE` only after adding a note linking them to the master.
- For ambiguous tickets, add internal notes and keep them open until verified.

### 2. Split by root-cause track, not by wording

Create or use internal buckets for:

- ingestion and sync pipeline
- activity page loading and rendering
- structured workout generation and device export
- chat uptime and timeout classification
- AI analysis correctness

### 3. Add minimum internal metadata on active incidents

For each canonical ticket, internal notes should capture:

- first known occurrence date
- affected sources:
  - Intervals.icu
  - Garmin
  - Hammerhead
  - Strava
  - wellness import
- whether data is missing in storage or only missing in UI
- whether workaround exists
- linked duplicate ticket IDs

### 4. Reduce re-reporting

- When a user reopens the same sync problem through chat, prefer appending to the canonical ticket rather than creating a new standalone bug report.
- If the AI support flow can detect a matching recent open ticket for the same user and issue family, it should suggest updating that ticket.

## Suggested Ticket Actions

If we want to act on the backlog without code changes yet, the next low-risk step would be:

- add one internal note to the Ralf master ticket listing related IDs
- add one internal note to the Dzmitry master ticket listing related IDs
- add one internal note to the data-leak ticket flagging severity and investigation owner

I did not perform those updates in this pass.

## Investigation Commands Used

- `pnpm cw:cli support tickets list --all --limit 5 --prod`
- `pnpm cw:cli db sql "<recent-ticket queries>" --prod`

## Follow-up Questions For The Next Pass

- Which ticket should become the official master for the Dzmitry incident family?
- Should repeated user complaints about the same unresolved incident be auto-linked instead of creating new tickets?
- Do we want a reusable `cw:cli support tickets export` or `cw:cli support tickets search-related` command to avoid raw SQL for future triage?
