import { tool } from 'ai'
import { z } from 'zod/v3'
import { getUserIntegrationStatus } from '../integration-status'

export const integrationTools = (userId: string) => ({
  get_integrations_status: tool({
    description:
      'List connected data sources (Strava, Garmin, Intervals.icu, etc.) with sync status and last sync time.',
    inputSchema: z.object({}),
    execute: async () => getUserIntegrationStatus(userId)
  })
})
