import { tool } from 'ai'
import { z } from 'zod/v3'
import { prisma } from '../db'
import {
  formatUserDate,
  formatDateUTC,
  getUserLocalDate,
  getStartOfDayUTC,
  getEndOfDayUTC
} from '../date'
import { activityRecommendationRepository } from '../repositories/activityRecommendationRepository'
import { recommendationRepository } from '../repositories/recommendationRepository'
import { workoutRepository } from '../repositories/workoutRepository'

export const summaryTools = (userId: string, timezone: string) => ({
  get_daily_summary: tool({
    description:
      'Get a single-day dashboard summary: local time context, planned workouts, today recommendation, wellness snapshot, training load, and recent activity.',
    inputSchema: z.object({
      date: z.string().optional().describe('Date in YYYY-MM-DD. Defaults to the user local today.')
    }),
    execute: async ({ date }) => {
      const queryDate = date ? new Date(`${date}T12:00:00Z`) : getUserLocalDate(timezone)
      const dateStr = date || formatDateUTC(queryDate)
      const start = getStartOfDayUTC(timezone, queryDate)
      const end = getEndOfDayUTC(timezone, queryDate)

      const now = new Date()
      const hourOfDay = parseInt(
        now.toLocaleString('en-US', { timeZone: timezone, hour: 'numeric', hour12: false })
      )
      let timeOfDay = 'morning'
      if (hourOfDay >= 12 && hourOfDay < 17) timeOfDay = 'afternoon'
      else if (hourOfDay >= 17 && hourOfDay < 21) timeOfDay = 'evening'
      else if (hourOfDay >= 21 || hourOfDay < 5) timeOfDay = 'late night'

      const [plannedWorkouts, wellness, activityRec, pendingRecs, latestWorkout] =
        await Promise.all([
          prisma.plannedWorkout.findMany({
            where: { userId, date: queryDate },
            orderBy: { startTime: 'asc' },
            select: {
              id: true,
              title: true,
              type: true,
              startTime: true,
              durationSec: true,
              tss: true,
              completed: true
            }
          }),
          prisma.wellness.findFirst({
            where: { userId, date: queryDate },
            select: {
              recoveryScore: true,
              hrv: true,
              restingHr: true,
              sleepHours: true,
              sleepScore: true,
              readiness: true,
              fatigue: true,
              soreness: true,
              stress: true,
              mood: true
            }
          }),
          activityRecommendationRepository.findToday(userId, queryDate),
          recommendationRepository.list(userId, { status: 'ACTIVE', limit: 5 }),
          workoutRepository.getForUser(userId, {
            limit: 1,
            orderBy: { date: 'desc' },
            select: { id: true, ctl: true, atl: true, date: true, title: true, tss: true }
          })
        ])

      const loadWorkout = latestWorkout[0]
      const ctl = loadWorkout?.ctl ?? null
      const atl = loadWorkout?.atl ?? null
      const tsb = ctl !== null && atl !== null ? Math.round((ctl - atl) * 10) / 10 : null

      return {
        date: dateStr,
        local_time: {
          iso: now.toISOString(),
          formatted: formatUserDate(now, timezone, 'EEEE, MMMM d, yyyy h:mm a'),
          timezone,
          time_of_day: timeOfDay
        },
        planned_workouts: plannedWorkouts.map((workout) => ({
          id: workout.id,
          title: workout.title,
          type: workout.type,
          start_time: workout.startTime,
          duration_minutes: workout.durationSec ? Math.round(workout.durationSec / 60) : null,
          tss: workout.tss,
          completed: workout.completed
        })),
        activity_recommendation: activityRec
          ? {
              id: activityRec.id,
              recommendation: activityRec.recommendation,
              confidence: activityRec.confidence,
              status: activityRec.status,
              user_accepted: activityRec.userAccepted,
              planned_workout_id: activityRec.plannedWorkoutId
            }
          : null,
        pending_profile_recommendations: pendingRecs.map((rec) => ({
          id: rec.id,
          title: rec.title,
          category: rec.category,
          priority: rec.priority
        })),
        wellness: wellness || null,
        training_load: {
          ctl,
          atl,
          tsb,
          as_of_workout: loadWorkout
            ? {
                id: loadWorkout.id,
                title: loadWorkout.title,
                date: formatDateUTC(loadWorkout.date)
              }
            : null
        },
        recent_activity_window: {
          start: start.toISOString(),
          end: end.toISOString()
        }
      }
    }
  })
})
