export const MCP_SCOPE_LABELS: Record<
  string,
  { id: string; title: string; description: string; icon: string }
> = {
  'profile:read': {
    id: 'profile:read',
    title: 'Read Profile',
    description: 'Access your basic profile info, FTP, and settings.',
    icon: 'i-heroicons-user'
  },
  'profile:write': {
    id: 'profile:write',
    title: 'Update Profile',
    description: 'Modify your profile settings like weight and FTP.',
    icon: 'i-heroicons-pencil-square'
  },
  'workout:read': {
    id: 'workout:read',
    title: 'Read Workouts',
    description: 'View your workout history and performance metrics.',
    icon: 'i-heroicons-activity'
  },
  'workout:write': {
    id: 'workout:write',
    title: 'Manage Workouts',
    description: 'Upload new workouts or edit existing ones.',
    icon: 'i-heroicons-cloud-arrow-up'
  },
  'planning:read': {
    id: 'planning:read',
    title: 'Read Training Plan',
    description: 'View planned workouts, availability, and current plan.',
    icon: 'i-heroicons-calendar-days'
  },
  'planning:write': {
    id: 'planning:write',
    title: 'Manage Training Plan',
    description: 'Create, update, and reschedule planned workouts.',
    icon: 'i-heroicons-calendar'
  },
  'health:read': {
    id: 'health:read',
    title: 'Read Health Data',
    description: 'Access your HRV, sleep, and recovery metrics.',
    icon: 'i-heroicons-heart'
  },
  'health:write': {
    id: 'health:write',
    title: 'Log Health Data',
    description: 'Log new health metrics like HRV, sleep, and weight.',
    icon: 'i-heroicons-plus-circle'
  },
  'nutrition:read': {
    id: 'nutrition:read',
    title: 'Read Nutrition',
    description: 'View your daily nutrition logs and macro targets.',
    icon: 'i-heroicons-shopping-cart'
  },
  'nutrition:write': {
    id: 'nutrition:write',
    title: 'Log Nutrition',
    description: 'Log new meals, calories, and macros.',
    icon: 'i-heroicons-plus-circle'
  },
  'analysis:read': {
    id: 'analysis:read',
    title: 'Read Training Analysis',
    description: 'Access training load analysis and forecasts.',
    icon: 'i-heroicons-chart-bar'
  },
  'memory:read': {
    id: 'memory:read',
    title: 'Read AI Memory',
    description: 'List memories stored for your account.',
    icon: 'i-heroicons-book-open'
  },
  'memory:write': {
    id: 'memory:write',
    title: 'Manage AI Memory',
    description: 'Create, update, or forget stored memories.',
    icon: 'i-heroicons-pencil'
  },
  'recommendations:read': {
    id: 'recommendations:read',
    title: 'Read Recommendations',
    description: 'View training recommendations.',
    icon: 'i-heroicons-light-bulb'
  },
  'recommendations:write': {
    id: 'recommendations:write',
    title: 'Manage Recommendations',
    description: 'Accept or dismiss training recommendations.',
    icon: 'i-heroicons-check-circle'
  },
  'ai:generate': {
    id: 'ai:generate',
    title: 'AI Generation',
    description: 'Run AI-powered generation tools.',
    icon: 'i-heroicons-sparkles'
  },
  offline_access: {
    id: 'offline_access',
    title: 'Offline Access',
    description: 'Allow this app to access your data when you are not using it.',
    icon: 'i-heroicons-clock'
  }
}
