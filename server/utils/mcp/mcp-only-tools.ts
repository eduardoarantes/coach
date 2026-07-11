import { z } from 'zod/v3'
import { tool } from 'ai'
import { getAsyncJobStatus } from './async-jobs'

export const mcpAsyncStatusTools = (userId: string) => ({
  get_async_job_status: tool({
    description:
      'Poll the status of a queued async job started by another MCP tool. Supports structure generation runs (generation_run_id), reports (report_id), Trigger.dev runs (run_id), and workout analysis (workout_id from analyze_activity).',
    inputSchema: z.object({
      job_type: z
        .enum(['structure_generation', 'report', 'trigger_run', 'workout_analysis'])
        .describe('The kind of async job to inspect'),
      job_id: z.string().describe('The job identifier returned by the tool that queued the work')
    }),
    execute: async ({ job_type, job_id }) => {
      const status = await getAsyncJobStatus(userId, job_type, job_id)
      if (!status) {
        return { error: 'Job not found', job_type, job_id }
      }
      return status
    }
  })
})
