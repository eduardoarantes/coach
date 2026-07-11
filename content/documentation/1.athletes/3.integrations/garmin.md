---
title: Garmin Integration
description: Sync high-fidelity training and wellness data (HRV, Sleep, Stress) from Garmin Connect.
---

[Garmin Connect](https://connect.garmin.com) provides high-fidelity training and wellness data. While you can sync activities via Strava, connecting Garmin directly gives Coach Watts access to advanced recovery metrics.

## Setup Guide

1. Go to **Settings → Apps** on the Dashboard.
2. Select **Garmin** and follow the authorization prompt.

## Why Connect Garmin?

- **Heart Rate Variability (HRV)**: We use your overnight HRV to calculate your daily **Recovery Status**.
- **Sleep Quality**: Detailed sleep stages help the AI adjust your training intensity.
- **Stress Levels**: Daily stress trends provide context for your overall fatigue.

::alert{type="success"}
Tip: For the best AI recommendations, wear your Garmin watch while sleeping to capture nightly recovery metrics.
::

## Troubleshooting

### Wellness data missing but activities sync

- Wear the watch overnight for HRV and sleep data
- Confirm wellness permissions were granted during OAuth
- Garmin wellness syncs separately from activities — click **Sync** after waking

### Connection expired

Garmin tokens expire periodically. If data stops syncing, go to **Settings → Apps** and reconnect Garmin.
