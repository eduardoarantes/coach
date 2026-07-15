/**
 * Shared Nuxt UI card surfaces for mobile single-gutter layouts.
 * Pair with a page-level `px-4 sm:px-0` wrapper for the standard 16px phone gutter.
 */

/** Profile Settings tabs — no stacked panel + card horizontal padding on mobile. */
export const profileSettingsCardUi = {
  root: 'rounded-none sm:rounded-lg shadow-none sm:shadow ring-0 sm:ring-1 ring-gray-200 dark:ring-gray-800 border-y sm:border',
  header: 'px-0 pt-0 sm:px-6 sm:pt-6',
  body: 'px-0 py-4 sm:px-6 sm:py-6',
  footer: 'px-0 sm:px-6'
} as const

/** Athlete Profile analysis cards — edge-to-container on mobile, comfortable inner text padding. */
export const athleteProfileCardUi = {
  root: 'rounded-none sm:rounded-lg shadow-none sm:shadow ring-0 sm:ring-1 ring-gray-200 dark:ring-gray-800 border-y sm:border',
  header: 'px-4 pt-4 sm:px-6 sm:pt-6',
  body: 'px-4 py-4 sm:px-6 sm:py-6',
  footer: 'px-4 sm:px-6'
} as const

/** Recovery page section cards — full-width on mobile within page gutter. */
export const recoverySectionCardUi = {
  root: 'rounded-none sm:rounded-lg shadow-none sm:shadow',
  body: 'p-4 sm:p-5'
} as const

/**
 * List / action cards (issues, help, events, etc.) — full-bleed on mobile,
 * rounded + ring on sm+. Pair with page text in `px-4 sm:px-0`; do not wrap
 * these cards in another horizontal gutter.
 */
export const mobileListCardUi = {
  root: 'rounded-none sm:rounded-lg shadow-none sm:shadow ring-0 sm:ring-1 ring-gray-200 dark:ring-gray-800 border-y sm:border',
  header: 'p-4 sm:p-5',
  body: 'p-4 sm:p-5',
  footer: 'p-4 sm:p-5'
} as const

/** Compact metric / summary tiles on list pages. */
export const mobileStatCardUi = {
  root: 'rounded-none sm:rounded-lg shadow-none sm:shadow ring-0 sm:ring-1 ring-gray-200 dark:ring-gray-800 border-y sm:border',
  body: 'p-4'
} as const
