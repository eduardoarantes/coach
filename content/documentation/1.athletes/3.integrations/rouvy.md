---
title: ROUVY Integration
description: How indoor cycling activities from ROUVY appear in Coach Watts.
---

[ROUVY](https://rouvy.com) is a virtual cycling platform for indoor training. Coach Watts does not connect to ROUVY directly — activities arrive through your linked activity platform.

## How ROUVY data reaches Coach Watts

ROUVY exports completed rides to connected platforms. To get ROUVY activities into Coach Watts:

1. Enable sync from ROUVY to **Strava** or **Garmin Connect** in your ROUVY account settings
2. Connect that platform to Coach Watts via **Settings → Apps**
3. Completed ROUVY rides appear as regular cycling activities

## Recommended setup

| ROUVY syncs to | Coach Watts connection                                            |
| -------------- | ----------------------------------------------------------------- |
| Strava         | [Strava Integration](/documentation/athletes/integrations/strava) |
| Garmin Connect | [Garmin Integration](/documentation/athletes/integrations/garmin) |

::alert{type="info"}
Connect only one primary activity source. If both Strava and Garmin receive ROUVY exports, pick one for Coach Watts to avoid duplicate activities.
::

## What Coach Watts analyzes

ROUVY rides sync with the same analysis as outdoor rides:

- Power and heart rate zones
- TSS calculation
- AI workout scores
- Plan matching for [training plans](/documentation/athletes/training-plans)

Virtual rides are tagged as indoor cycling, which the AI accounts for in pacing and effort analysis.

## Related guides

- [Integrations overview](/documentation/athletes/integrations)
- [Activities & Workout Analysis](/documentation/athletes/activities-workouts)
