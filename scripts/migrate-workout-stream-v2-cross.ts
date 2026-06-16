/**
 * Cross-server WorkoutStream → WorkoutStreamV2 migration.
 *
 * Reads WorkoutStream from NFT PostgreSQL, inserts converted rows into
 * WorkoutStreamV2 on pmm-bud. Skips rows already present in V2.
 *
 * Usage (run from coach-wattz repo root):
 *   SOURCE_URL="postgresql://coach:coach@100.117.118.92:5432/workout_migration" \
 *   DATABASE_URL="postgresql://coach:3JXkrGaUZURywjZk@185.112.156.142:4426/coach" \
 *   npx tsx scripts/migrate-workout-stream-v2-cross.ts
 *
 *   --dry-run   count rows only, no writes
 */

import { config } from 'dotenv'

import pg from 'pg'
config()

const BATCH_SIZE = 300
const CONCURRENCY = 20 // parallel inserts per batch
const DRY_RUN = process.argv.includes('--dry-run')

const SOURCE_URL = process.env.SOURCE_URL
const DEST_URL = process.env.DATABASE_URL

if (!SOURCE_URL || !DEST_URL) {
  console.error('SOURCE_URL and DATABASE_URL must be set')
  process.exit(1)
}

function toIntArray(val: unknown): number[] | null {
  if (!Array.isArray(val) || val.length === 0) return null
  return val.map((v) => {
    if (v === null || v === undefined) return null
    const n = Math.round(Number(v))
    return isNaN(n) ? null : n
  })
}

function toFloatArray(val: unknown): number[] | null {
  if (!Array.isArray(val) || val.length === 0) return null
  return val.map((v) => {
    if (v === null || v === undefined) return null
    const n = Number(v)
    return isNaN(n) ? null : n
  })
}

function toBoolArray(val: unknown): boolean[] | null {
  if (!Array.isArray(val) || val.length === 0) return null
  return val.map((v) => (v === null || v === undefined ? null : Boolean(v)))
}

function safeJson(val: unknown): string | null {
  if (val === null || val === undefined) return null
  if (typeof val === 'string') {
    try {
      JSON.parse(val)
      return val
    } catch {
      return null
    }
  }
  try {
    return JSON.stringify(val)
  } catch {
    return null
  }
}

function splitLatlng(val: unknown): { lat: number[] | null; lng: number[] | null } {
  if (!Array.isArray(val) || val.length === 0) return { lat: null, lng: null }
  const pairs = (val as any[]).filter((p) => Array.isArray(p) && p.length >= 2)
  if (pairs.length === 0) return { lat: null, lng: null }
  return {
    lat: pairs.map((p) => (p[0] === null ? null : Number(p[0]))),
    lng: pairs.map((p) => (p[1] === null ? null : Number(p[1])))
  }
}

async function main() {
  const src = new pg.Client({ connectionString: SOURCE_URL })
  const dst = new pg.Client({ connectionString: DEST_URL })
  await src.connect()
  await dst.connect()

  const {
    rows: [{ count: srcCount }]
  } = await src.query('SELECT COUNT(*) AS count FROM "WorkoutStream"')
  const {
    rows: [{ count: v2Count }]
  } = await dst.query('SELECT COUNT(*) AS count FROM "WorkoutStreamV2"')
  const total = Number(srcCount)
  console.log(`Source: ${total} rows  |  V2 already done: ${v2Count}`)

  if (DRY_RUN) {
    await src.end()
    await dst.end()
    return
  }

  let migrated = 0
  let skipped = 0
  let offset = 0
  let errors = 0
  const startTime = Date.now()

  while (true) {
    // Fetch batch from source ordered consistently
    const { rows } = await src.query(
      `SELECT * FROM "WorkoutStream" ORDER BY "workoutId" LIMIT $1 OFFSET $2`,
      [BATCH_SIZE, offset]
    )
    if (rows.length === 0) break

    // Batch-check which workoutIds already exist in V2
    const ids = rows.map((r) => r.workoutId)
    const { rows: existing } = await dst.query(
      `SELECT "workoutId" FROM "WorkoutStreamV2" WHERE "workoutId" = ANY($1)`,
      [ids]
    )
    const existingSet = new Set(existing.map((r: any) => r.workoutId))

    const toInsert = rows.filter((r) => !existingSet.has(r.workoutId))
    skipped += rows.length - toInsert.length

    const insertRow = async (row: any) => {
      const { lat, lng } = splitLatlng(row.latlng)
      try {
        await dst.query(
          `INSERT INTO "WorkoutStreamV2" (
            id, "workoutId",
            time, distance, velocity, heartrate, cadence, watts,
            altitude, lat, lng, grade, moving,
            temp, torque, "leftRightBalance", hrv, respiration, "targetPower",
            "avgPacePerKm", "paceVariability",
            "lapSplits", "paceZones", "pacingStrategy", surges,
            "hrZoneTimes", "powerZoneTimes", "extrasMeta",
            "createdAt", "updatedAt"
          ) VALUES (
            gen_random_uuid(), $1,
            $2,$3,$4,$5,$6,$7,
            $8,$9,$10,$11,$12,
            $13,$14,$15,$16,$17,$18,
            $19,$20,
            $21,$22,$23,$24,
            $25,$26,$27,
            $28,$29
          ) ON CONFLICT ("workoutId") DO NOTHING`,
          [
            row.workoutId,
            toIntArray(row.time),
            toFloatArray(row.distance),
            toFloatArray(row.velocity),
            toIntArray(row.heartrate),
            toIntArray(row.cadence),
            toIntArray(row.watts),
            toFloatArray(row.altitude),
            lat,
            lng,
            toFloatArray(row.grade),
            toBoolArray(row.moving),
            toIntArray(row.temp),
            toIntArray(row.torque),
            toIntArray(row.leftRightBalance),
            toFloatArray(row.hrv),
            toFloatArray(row.respiration),
            toIntArray(row.targetPower),
            row.avgPacePerKm ?? null,
            row.paceVariability ?? null,
            safeJson(row.lapSplits),
            safeJson(row.paceZones),
            safeJson(row.pacingStrategy),
            safeJson(row.surges),
            safeJson(row.hrZoneTimes),
            safeJson(row.powerZoneTimes),
            safeJson(row.extrasMeta),
            row.createdAt,
            row.updatedAt
          ]
        )
        migrated++
      } catch (err: any) {
        const msg: string = err.message ?? ''
        if (msg.includes('invalid input syntax') || msg.includes('foreign key constraint')) {
          errors++
          if (errors <= 10) console.error(`\n  Skip ${row.workoutId}: ${msg.split('\n')[0]}`)
        } else {
          console.error(`\n  Fatal on ${row.workoutId}: ${msg}`)
          throw err
        }
      }
    }

    // Process toInsert in parallel chunks of CONCURRENCY
    for (let i = 0; i < toInsert.length; i += CONCURRENCY) {
      await Promise.all(toInsert.slice(i, i + CONCURRENCY).map(insertRow))
    }

    offset += rows.length
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
    const pct = ((offset / total) * 100).toFixed(1)
    process.stdout.write(
      `\r  [${elapsed}s] ${offset}/${total} (${pct}%) — inserted: ${migrated}  skipped: ${skipped}  errors: ${errors}  `
    )

    if (errors > 20) break
  }

  console.log(`\n\nDone. Inserted ${migrated}, skipped ${skipped}, errors ${errors}`)
  console.log(`Time: ${((Date.now() - startTime) / 1000).toFixed(0)}s`)

  await src.end()
  await dst.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
