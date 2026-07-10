import { describe, expect, it } from 'vitest'
import {
  buildIntervalsImportPersistenceFields,
  buildRemoteImportAcceptedWriteData
} from '../../../../server/utils/canonical-planned-workout-write'
import { createZoneProfileSnapshot } from '../../../../shared/structured-workout-contract'

describe('intervals import canonical persistence', () => {
  const sportSettings = {
    ftp: 250,
    lthr: 170,
    thresholdPace: 2.75,
    paceZones: [{ min: 2.2, max: 2.4, name: 'Z2' }]
  }

  it('accepts remote imports with atomic structure and derived metrics', () => {
    const snapshot = createZoneProfileSnapshot(sportSettings)
    const remote = {
      schemaVersion: 1,
      zoneProfileSnapshot: snapshot,
      steps: [
        {
          duration: 3600,
          pace: { metric: 'pace', kind: 'zone', zone: 2, rangeMps: { min: 2.2, max: 2.4 } }
        }
      ]
    }
    const data = buildIntervalsImportPersistenceFields({
      existingRecord: null,
      normalizedPlanned: {
        userId: 'user-1',
        externalId: '123',
        title: 'Zone 2 Run',
        type: 'Run',
        durationSec: 3600,
        structuredWorkout: remote
      },
      sportSettings,
      seenAt: new Date('2026-07-10T12:00:00Z')
    })

    expect(data.structuredWorkout).toMatchObject({ schemaVersion: 1 })
    expect(data.durationSec).toBe(3600)
    expect(data.structureHash).toBeTruthy()
    expect(data.remoteStructureHash).toBeTruthy()
    expect(data.syncStatus).toBe('SYNCED')
  })

  it('preserves local structure and records conflict when locally modified', () => {
    const snapshot = createZoneProfileSnapshot(sportSettings)
    const local = {
      schemaVersion: 1,
      zoneProfileSnapshot: snapshot,
      steps: [
        {
          duration: 3600,
          pace: { metric: 'pace', kind: 'zone', zone: 2, rangeMps: { min: 2.2, max: 2.4 } }
        }
      ]
    }
    const remote = {
      schemaVersion: 1,
      zoneProfileSnapshot: snapshot,
      steps: [
        {
          duration: 3000,
          pace: { metric: 'pace', kind: 'zone', zone: 2, rangeMps: { min: 2.2, max: 2.4 } }
        }
      ]
    }

    const data = buildIntervalsImportPersistenceFields({
      existingRecord: {
        structuredWorkout: local,
        modifiedLocally: true,
        durationSec: 3600,
        structureHash: 'local-hash'
      },
      normalizedPlanned: {
        externalId: '123',
        durationSec: 3000,
        structuredWorkout: remote
      },
      sportSettings,
      seenAt: new Date('2026-07-10T12:00:00Z')
    })

    expect(data.syncConflict).toBe(true)
    expect(data.pendingRemoteStructuredWorkout).toEqual(remote)
    expect(data.structuredWorkout).toBeUndefined()
  })

  it('builds remote accepted writes with remote hash metadata', () => {
    const snapshot = createZoneProfileSnapshot(sportSettings)
    const { data, canonical } = buildRemoteImportAcceptedWriteData({
      structure: {
        zoneProfileSnapshot: snapshot,
        steps: [{ duration: 600, power: { value: 0.7, units: '%' } }]
      },
      sportSettings,
      seenAt: new Date('2026-07-10T12:00:00Z')
    })
    expect(canonical?.schemaVersion).toBe(1)
    expect(data.remoteStructureHash).toBeTruthy()
    expect(data.lastRemoteStructureSeenAt).toBeTruthy()
  })
})
