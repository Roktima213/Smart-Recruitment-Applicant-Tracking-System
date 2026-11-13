jest.mock('./firebaseAdmin', () => ({
  adminAuth: {
    getUser: jest.fn(),
    createUser: jest.fn(),
    updateUser: jest.fn(),
    setCustomUserClaims: jest.fn(),
  },
  firebaseAdminApp: { name: '[DEFAULT]' },
  verifyFirebaseIdToken: jest.fn(),
  setCustomClaims: jest.fn(),
  isAuthEmulatorEnabled: jest.fn().mockReturnValue(true),
}));

jest.mock('./database', () => ({
  pool: {
    connect: jest.fn(),
    end: jest.fn(),
    query: jest.fn(),
  },
}));

import { DEMO_COMPANY, DEMO_USERS, DEMO_JOB, SEED_CANDIDATES } from '../../../database/seed/seed';

describe('Synthetic Seed Configuration & Entities', () => {
  it('should define valid demo company with UUID and settings', () => {
    expect(DEMO_COMPANY).toHaveProperty('id');
    expect(DEMO_COMPANY.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(DEMO_COMPANY.name).toBe('Acme Corporation');
    expect(DEMO_COMPANY.settings.timezone).toBe('UTC');
  });

  it('should define distinct demo accounts for ADMIN, HR, and CANDIDATE', () => {
    expect(DEMO_USERS).toHaveLength(3);

    const roles = DEMO_USERS.map((u) => u.role);
    expect(roles).toContain('ADMIN');
    expect(roles).toContain('HR');
    expect(roles).toContain('CANDIDATE');

    for (const user of DEMO_USERS) {
      expect(user.email).toMatch(/@ats\.local$/);
      expect(user.password.length).toBeGreaterThanOrEqual(8);
      expect(user.firebaseUid).toBeTruthy();
    }
  });

  it('should define published demo job matching company ID and salary constraints', () => {
    expect(DEMO_JOB.companyId).toBe(DEMO_COMPANY.id);
    expect(DEMO_JOB.salaryMax).toBeGreaterThanOrEqual(DEMO_JOB.salaryMin);
    expect(DEMO_JOB.status).toBe('PUBLISHED');
  });

  it('should define expanded realistic candidate seed dataset with 20+ applications across all 6 stages', () => {
    expect(SEED_CANDIDATES.length).toBeGreaterThanOrEqual(20);

    const stages = new Set(SEED_CANDIDATES.map((c) => c.stage));
    expect(stages.has('APPLIED')).toBe(true);
    expect(stages.has('SCREENING')).toBe(true);
    expect(stages.has('INTERVIEW')).toBe(true);
    expect(stages.has('SELECTED')).toBe(true);
    expect(stages.has('OFFERED')).toBe(true);
    expect(stages.has('REJECTED')).toBe(true);

    for (const candidate of SEED_CANDIDATES) {
      expect(candidate.email).toMatch(/@example\.com$/);
      expect(candidate.skills.length).toBeGreaterThanOrEqual(3);
      expect(candidate.resumeFileName.endsWith('.pdf')).toBe(true);
      expect(candidate.experienceYears).toBeGreaterThan(0);
    }
  });
});
