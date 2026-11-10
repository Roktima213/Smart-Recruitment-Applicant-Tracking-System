export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  JOBS: '/jobs',
  CANDIDATE: '/candidate',
  HR_JOBS: '/hr/jobs',
  HR_PIPELINE: '/hr/pipeline',
  HR_INTERVIEWS: '/hr/interviews',
  HR_OFFERS: '/hr/offers',
  HR_ANALYTICS: '/hr/analytics',
  ADMIN: '/admin',
  SETTINGS: '/settings',
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];
