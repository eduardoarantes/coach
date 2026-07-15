import * as Sentry from '@sentry/nuxt'

const config = useRuntimeConfig()

if (!config.public.sentryEnabled || !config.public.sentryDsn) {
  // Sentry is disabled in local dev unless SENTRY_ENABLED=true.
} else {
  Sentry.init({
    dsn: config.public.sentryDsn as string,
    release: config.public.sentryRelease as string,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    integrations: [
      Sentry.replayIntegration(),
      Sentry.consoleLoggingIntegration({ levels: ['log', 'warn', 'error'] })
    ],
    enableLogs: true,
    sendDefaultPii: true,
    debug: false,
    environment: process.env.NODE_ENV || 'development',
    ignoreErrors: [
      'Object Not Found Matching Id:2, MethodName:update',
      'Object Not Found Matching Id:3, MethodName:update',
      '/api/auth/session',
      '/_nuxt/builds/meta/dev.json',
      'Failed to fetch dynamically imported module',
      'Importing a module script failed',
      'error loading dynamically imported module',
      'useLocalStorage is not defined',
      'getActivePinia()'
    ],
    beforeSend(event) {
      const message = event.exception?.values?.[0]?.value || event.message || ''
      if (typeof message === 'string') {
        if (message === 'Page not found' && event.request?.url?.includes('/documentation/')) {
          return null
        }
        if (message.includes('Failed to parse JSON file') && message.includes('hero.json')) {
          return null
        }
      }
      return event
    }
  })
}
