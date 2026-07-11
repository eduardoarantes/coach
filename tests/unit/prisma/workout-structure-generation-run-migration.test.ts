import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const migrationsDir = join(process.cwd(), 'prisma/migrations')

describe('workout structure generation run migrations', () => {
  it('creates the revision index with the Prisma-expected truncated name', () => {
    const sql = readFileSync(
      join(migrationsDir, '20260711120000_add_workout_structure_generation_runs/migration.sql'),
      'utf8'
    )
    expect(sql).toContain(
      'CREATE INDEX "WorkoutStructureGenerationRun_plannedWorkoutId_generationRe_idx"'
    )
    expect(sql).not.toContain('generationRevision_idx')
  })

  it('does not rename the revision index before the table exists', () => {
    const migrationDirs = readdirSync(migrationsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort()

    const createIndexMigration = '20260711120000_add_workout_structure_generation_runs'
    const renameMigrations = migrationDirs.filter((dir) => {
      const sql = readFileSync(join(migrationsDir, dir, 'migration.sql'), 'utf8')
      return sql.includes(
        'RENAME TO "WorkoutStructureGenerationRun_plannedWorkoutId_generationRe_idx"'
      )
    })

    expect(renameMigrations).toEqual([])
    expect(migrationDirs).toContain(createIndexMigration)
  })
})
