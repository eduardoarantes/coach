/**
 * Migrates existing WorkoutStream (JSONB) rows into WorkoutStreamV2 (native arrays),
 * then deletes the migrated V1 rows and vacuums periodically to reclaim disk space.
 *
 * Disk-safe: V2 is ~46% the size of V1, so disk usage shrinks as migration progresses.
 * Peak temporary increase between vacuums is ~1.5GB at the default settings.
 *
 * Safe to run multiple times — skips rows already present in V2.
 *
 * Usage:
 *   DATABASE_URL=postgresql://... npx tsx scripts/migrate-workout-stream-v2.ts
 *   DATABASE_URL=postgresql://... npx tsx scripts/migrate-workout-stream-v2.ts --dry-run
 */

import { config } from 'dotenv'
config()

const BATCH_SIZE = 500 // rows per INSERT batch
const VACUUM_EVERY = 10 // vacuum V1 after this many batches
const DRY_RUN = process.argv.includes('--dry-run')

async function diskFree(prisma: any): Promise<string> {
  const [row] = await prisma.$queryRaw<[{ v1: string; v2: string }]>`
    SELECT
      pg_size_pretty(pg_total_relation_size('"WorkoutStream"')) AS v1,
      pg_size_pretty(pg_total_relation_size('"WorkoutStreamV2"')) AS v2
  `
  return `V1=${row.v1} V2=${row.v2}`
}

async function main() {
  const { prisma } = await import('../server/utils/db')

  const [{ pending }] = await prisma.$queryRaw<[{ pending: bigint }]>`
    SELECT COUNT(*) AS pending
    FROM "WorkoutStream" ws
    WHERE NOT EXISTS (
      SELECT 1 FROM "WorkoutStreamV2" v2 WHERE v2."workoutId" = ws."workoutId"
    )
  `

  const total = Number(pending)
  console.log(`Pending: ${total} rows  |  ${await diskFree(prisma)}`)

  if (total === 0) {
    console.log('Nothing to migrate.')
    await prisma.$disconnect()
    return
  }

  if (DRY_RUN) {
    console.log('Dry run — exiting without writing.')
    await prisma.$disconnect()
    return
  }

  let migrated = 0
  let batches = 0
  let errors = 0
  const startTime = Date.now()

  while (migrated < total) {
    const batchStart = Date.now()

    try {
      // 1. Insert batch into V2
      const inserted = await prisma.$executeRaw`
        INSERT INTO "WorkoutStreamV2" (
          "id", "workoutId",
          "time", "distance", "velocity",
          "heartrate", "cadence", "watts",
          "altitude", "lat", "lng", "grade", "moving",
          "temp", "torque", "leftRightBalance",
          "hrv", "respiration", "targetPower",
          "avgPacePerKm", "paceVariability",
          "lapSplits", "paceZones", "pacingStrategy", "surges",
          "hrZoneTimes", "powerZoneTimes", "extrasMeta",
          "createdAt", "updatedAt"
        )
        SELECT
          gen_random_uuid()::text, ws."workoutId",
          CASE WHEN jsonb_typeof(ws.time) = 'array' THEN ARRAY(SELECT v::integer FROM jsonb_array_elements_text(ws.time) v) ELSE NULL END,
          CASE WHEN jsonb_typeof(ws.distance) = 'array' THEN ARRAY(SELECT v::double precision FROM jsonb_array_elements_text(ws.distance) v) ELSE NULL END,
          CASE WHEN jsonb_typeof(ws.velocity) = 'array' THEN ARRAY(SELECT v::double precision FROM jsonb_array_elements_text(ws.velocity) v) ELSE NULL END,
          CASE WHEN jsonb_typeof(ws.heartrate) = 'array' THEN ARRAY(SELECT v::integer FROM jsonb_array_elements_text(ws.heartrate) v) ELSE NULL END,
          CASE WHEN jsonb_typeof(ws.cadence) = 'array' THEN ARRAY(SELECT v::integer FROM jsonb_array_elements_text(ws.cadence) v) ELSE NULL END,
          CASE WHEN jsonb_typeof(ws.watts) = 'array' THEN ARRAY(SELECT v::integer FROM jsonb_array_elements_text(ws.watts) v) ELSE NULL END,
          CASE WHEN jsonb_typeof(ws.altitude) = 'array' THEN ARRAY(SELECT v::double precision FROM jsonb_array_elements_text(ws.altitude) v) ELSE NULL END,
          CASE WHEN jsonb_typeof(ws.latlng) = 'array' AND jsonb_array_length(ws.latlng) > 0 THEN ARRAY(SELECT (elem->>0)::double precision FROM jsonb_array_elements(ws.latlng) AS elem) ELSE NULL END,
          CASE WHEN jsonb_typeof(ws.latlng) = 'array' AND jsonb_array_length(ws.latlng) > 0 THEN ARRAY(SELECT (elem->>1)::double precision FROM jsonb_array_elements(ws.latlng) AS elem) ELSE NULL END,
          CASE WHEN jsonb_typeof(ws.grade) = 'array' THEN ARRAY(SELECT v::double precision FROM jsonb_array_elements_text(ws.grade) v) ELSE NULL END,
          CASE WHEN jsonb_typeof(ws.moving) = 'array' THEN ARRAY(SELECT v::boolean FROM jsonb_array_elements_text(ws.moving) v) ELSE NULL END,
          CASE WHEN jsonb_typeof(ws.temp) = 'array' THEN ARRAY(SELECT v::integer FROM jsonb_array_elements_text(ws.temp) v) ELSE NULL END,
          CASE WHEN jsonb_typeof(ws.torque) = 'array' THEN ARRAY(SELECT v::integer FROM jsonb_array_elements_text(ws.torque) v) ELSE NULL END,
          CASE WHEN jsonb_typeof(ws."leftRightBalance") = 'array' THEN ARRAY(SELECT v::integer FROM jsonb_array_elements_text(ws."leftRightBalance") v) ELSE NULL END,
          CASE WHEN jsonb_typeof(ws.hrv) = 'array' THEN ARRAY(SELECT v::double precision FROM jsonb_array_elements_text(ws.hrv) v) ELSE NULL END,
          CASE WHEN jsonb_typeof(ws.respiration) = 'array' THEN ARRAY(SELECT v::double precision FROM jsonb_array_elements_text(ws.respiration) v) ELSE NULL END,
          CASE WHEN jsonb_typeof(ws."targetPower") = 'array' THEN ARRAY(SELECT v::integer FROM jsonb_array_elements_text(ws."targetPower") v) ELSE NULL END,
          ws."avgPacePerKm", ws."paceVariability",
          ws."lapSplits", ws."paceZones", ws."pacingStrategy", ws.surges,
          ws."hrZoneTimes", ws."powerZoneTimes", ws."extrasMeta",
          ws."createdAt", ws."updatedAt"
        FROM "WorkoutStream" ws
        WHERE NOT EXISTS (
          SELECT 1 FROM "WorkoutStreamV2" v2 WHERE v2."workoutId" = ws."workoutId"
        )
        LIMIT ${BATCH_SIZE}
      `

      if (inserted === 0) break

      // 2. Delete the just-migrated V1 rows (safe: app reads V2 first)
      await prisma.$executeRaw`
        DELETE FROM "WorkoutStream" ws
        WHERE EXISTS (
          SELECT 1 FROM "WorkoutStreamV2" v2 WHERE v2."workoutId" = ws."workoutId"
        )
      `

      migrated += inserted
      batches++

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
      const batchMs = Date.now() - batchStart
      const pct = ((migrated / total) * 100).toFixed(1)
      console.log(
        `  [${elapsed}s] ${migrated}/${total} (${pct}%) — ${inserted} rows in ${batchMs}ms`
      )

      // 3. Vacuum V1 periodically to reclaim dead tuples from deletes
      if (batches % VACUUM_EVERY === 0) {
        process.stdout.write(`  Vacuuming WorkoutStream...`)
        const vacStart = Date.now()
        await prisma.$executeRawUnsafe(`VACUUM "WorkoutStream"`)
        console.log(
          ` done in ${((Date.now() - vacStart) / 1000).toFixed(1)}s  |  ${await diskFree(prisma)}`
        )
      }

      errors = 0
    } catch (err) {
      errors++
      console.error(`  Batch error (migrated so far: ${migrated}):`, err)
      if (errors >= 3) {
        console.error('Too many consecutive errors, aborting.')
        break
      }
    }
  }

  // Final vacuum to reclaim all remaining dead tuples
  console.log('\nFinal vacuum...')
  await prisma.$executeRawUnsafe(`VACUUM "WorkoutStream"`)

  const totalSec = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log(`\nDone. Migrated ${migrated} rows in ${totalSec}s.`)
  console.log(await diskFree(prisma))

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
