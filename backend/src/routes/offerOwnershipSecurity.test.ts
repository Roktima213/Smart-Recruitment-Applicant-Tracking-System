const mockVerifyFirebaseIdToken = jest.fn();
const mockQuery = jest.fn();
const mockClientQuery = jest.fn();
const mockClientRelease = jest.fn();

const mockClient = {
  query: mockClientQuery,
  release: mockClientRelease,
};

jest.mock('../config/firebaseAdmin', () => ({
  verifyFirebaseIdToken: (...args: any[]) => mockVerifyFirebaseIdToken(...args),
  setCustomClaims: jest.fn().mockResolvedValue(undefined),
  isAuthEmulatorEnabled: jest.fn().mockReturnValue(true),
  firebaseAdminApp: { name: '[DEFAULT]' },
  adminAuth: {
    getUser: jest.fn(),
    revokeRefreshTokens: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../config/database', () => ({
  pool: {
    query: (...args: any[]) => mockQuery(...args),
    connect: jest.fn().mockImplementation(async () => mockClient),
  },
  query: (...args: any[]) => mockQuery(...args),
  getClient: jest.fn().mockImplementation(async () => mockClient),
  checkDatabaseConnection: jest.fn().mockResolvedValue({ connected: true, latencyMs: 2 }),
  closeDatabasePool: jest.fn().mockResolvedValue(undefined),
}));

import request from 'supertest';
import app from '../app';
import {
  resolveCandidateByFirebaseUid,
  verifyOfferOwnershipAndAccess,
  respondToOfferWithOwnershipGuard,
} from '../services/offerOwnershipService';

describe('Candidate Offer Ownership & Multi-Tenant Security Auditing (Floor 19)', () => {
  const candidateAlice = {
    uid: 'candidate-alice-uid-101',
    email: 'alice@candidate.com',
    role: 'CANDIDATE',
    companyId: null,
    isActive: true,
  };

  const candidateBobAttacker = {
    uid: 'candidate-bob-attacker-uid-102',
    email: 'bob@attacker.com',
    role: 'CANDIDATE',
    companyId: null,
    isActive: true,
  };

  const hrCompany1 = {
    uid: 'hr-comp1-uid-201',
    email: 'hr@company1.com',
    role: 'HR',
    companyId: '11111111-1111-4111-8111-111111111111',
    isActive: true,
  };

  const hrCompany2 = {
    uid: 'hr-comp2-uid-202',
    email: 'hr@company2.com',
    role: 'HR',
    companyId: '22222222-2222-4222-8222-222222222222',
    isActive: true,
  };

  const adminCompany1 = {
    uid: 'admin-comp1-uid-301',
    email: 'admin@company1.com',
    role: 'ADMIN',
    companyId: '11111111-1111-4111-8111-111111111111',
    isActive: true,
  };

  const superAdmin = {
    uid: 'superadmin-uid-999',
    email: 'root@platform.com',
    role: 'SUPER_ADMIN',
    companyId: null,
    isActive: true,
  };

  const offerAliceId = 'aaaaaaaa-1111-4aaa-8aaa-aaaaaaaaaaaa';
  const offerAliceRecord = {
    id: offerAliceId,
    application_id: 'app-alice-uuid-001',
    salary_amount: '145000.00',
    currency: 'USD',
    start_date: '2027-02-01',
    offer_letter_html: '<div>Formal Offer for Alice</div>',
    status: 'ISSUED',
    issued_at: '2026-11-15T10:00:00.000Z',
    responded_at: null,
    accepted_at: null,
    declined_at: null,
    expired_at: null,
    expires_at: '2026-12-15T23:59:59.000Z',
    created_by: 'hr-user-id-1',
    created_at: '2026-11-15T09:00:00.000Z',
    updated_at: '2026-11-15T10:00:00.000Z',
    current_stage: 'OFFERED',
    candidate_id: 'candidate-profile-alice-id',
    job_id: 'job-comp1-uuid-001',
    job_title: 'Senior Cloud Architect',
    job_company_id: '11111111-1111-4111-8111-111111111111', // Company 1
    company_name: 'Alpha Cloud Corp',
    candidate_firebase_uid: 'candidate-alice-uid-101', // Alice is the owner
    candidate_user_id: 'user-alice-db-id',
    candidate_name: 'Alice Henderson',
    candidate_email: 'alice@candidate.com',
  };

  beforeEach(() => {
    mockVerifyFirebaseIdToken.mockReset();
    mockQuery.mockReset();
    mockClientQuery.mockReset();
    mockClientRelease.mockReset();
  });

  describe('1. Anti-IDOR: Candidate Row-Level Ownership Verification', () => {
    it('SEC-IDOR-01: Candidate B (Attacker) CANNOT view Candidate A (Alice) offer details (403 Forbidden)', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce({
        uid: candidateBobAttacker.uid,
        email: candidateBobAttacker.email,
        role: candidateBobAttacker.role,
      });

      mockQuery.mockResolvedValueOnce({
        rows: [offerAliceRecord],
      });

      const response = await request(app)
        .get(`/api/offers/${offerAliceId}`)
        .set('Authorization', 'Bearer attacker-token');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Forbidden');
      expect(response.body.error.message).toContain('You do not have permission to access');
    });

    it('SEC-IDOR-02: Candidate Owner (Alice) CAN successfully inspect her own offer (200 OK)', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce({
        uid: candidateAlice.uid,
        email: candidateAlice.email,
        role: candidateAlice.role,
      });

      mockQuery.mockResolvedValueOnce({
        rows: [offerAliceRecord],
      });

      const response = await request(app)
        .get(`/api/offers/${offerAliceId}`)
        .set('Authorization', 'Bearer alice-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(offerAliceId);
      expect(response.body.data.salaryAmount).toBe(145000);
      expect(response.body.data.offerLetterHtml).toContain('Formal Offer for Alice');
    });

    it('SEC-IDOR-03: Candidate B CANNOT accept or decline Candidate A offer (403 Forbidden)', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce({
        uid: candidateBobAttacker.uid,
        email: candidateBobAttacker.email,
        role: candidateBobAttacker.role,
      });

      mockQuery.mockResolvedValueOnce({
        rows: [offerAliceRecord],
      });

      const response = await request(app)
        .post(`/api/offers/${offerAliceId}/respond`)
        .set('Authorization', 'Bearer attacker-token')
        .send({ action: 'ACCEPT' });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('You do not have permission to access or respond to this offer');
    });

    it('SEC-IDOR-04: Candidate Owner (Alice) CAN successfully accept her issued offer (200 OK)', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce({
        uid: candidateAlice.uid,
        email: candidateAlice.email,
        role: candidateAlice.role,
      });

      // 1. Initial lookup query in verifyOfferOwnershipAndAccess
      mockQuery.mockResolvedValueOnce({
        rows: [offerAliceRecord],
      });

      // 2. Update query in respondToOfferWithOwnershipGuard
      const acceptedRecord = {
        ...offerAliceRecord,
        status: 'ACCEPTED',
        responded_at: '2026-11-16T12:00:00.000Z',
        accepted_at: '2026-11-16T12:00:00.000Z',
      };
      mockQuery.mockResolvedValueOnce({
        rows: [acceptedRecord],
      });

      const response = await request(app)
        .post(`/api/offers/${offerAliceId}/respond`)
        .set('Authorization', 'Bearer alice-token')
        .send({ action: 'ACCEPT' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('ACCEPTED');
      expect(response.body.message).toContain('accepted');
    });

    it('SEC-IDOR-05: Candidate Owner CAN successfully decline with formal reason (200 OK)', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce({
        uid: candidateAlice.uid,
        email: candidateAlice.email,
        role: candidateAlice.role,
      });

      mockQuery.mockResolvedValueOnce({
        rows: [offerAliceRecord],
      });

      const declinedRecord = {
        ...offerAliceRecord,
        status: 'DECLINED',
        responded_at: '2026-11-16T12:00:00.000Z',
        declined_at: '2026-11-16T12:00:00.000Z',
        declined_reason: 'Pursuing other opportunity',
      };
      mockQuery.mockResolvedValueOnce({
        rows: [declinedRecord],
      });

      const response = await request(app)
        .post(`/api/offers/${offerAliceId}/respond`)
        .set('Authorization', 'Bearer alice-token')
        .send({ action: 'DECLINE', decline_reason: 'Pursuing other opportunity' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('DECLINED');
      expect(response.body.message).toContain('declined');
    });

    it('SEC-IDOR-06: Reject response when offer is still in DRAFT status (400 Bad Request)', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce({
        uid: candidateAlice.uid,
        email: candidateAlice.email,
        role: candidateAlice.role,
      });

      const draftOffer = { ...offerAliceRecord, status: 'DRAFT', issued_at: null };
      mockQuery.mockResolvedValueOnce({
        rows: [draftOffer],
      });

      const response = await request(app)
        .post(`/api/offers/${offerAliceId}/respond`)
        .set('Authorization', 'Bearer alice-token')
        .send({ action: 'ACCEPT' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Only ISSUED offers can be accepted or declined');
    });

    it('SEC-IDOR-07: Reject response when offer has expired (400 Bad Request)', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce({
        uid: candidateAlice.uid,
        email: candidateAlice.email,
        role: candidateAlice.role,
      });

      const expiredOffer = {
        ...offerAliceRecord,
        expires_at: '2020-01-01T00:00:00.000Z',
      };
      mockQuery.mockResolvedValueOnce({
        rows: [expiredOffer],
      });

      const response = await request(app)
        .post(`/api/offers/${offerAliceId}/respond`)
        .set('Authorization', 'Bearer alice-token')
        .send({ action: 'ACCEPT' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('validity period has expired');
    });
  });

  describe('2. Multi-Tenant Corporate Isolation (Zero Data Leakage)', () => {
    it('SEC-TENANT-01: HR User from Company 2 CANNOT access Offer from Company 1 (403 Forbidden)', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce({
        uid: hrCompany2.uid,
        email: hrCompany2.email,
        role: hrCompany2.role,
        companyId: hrCompany2.companyId,
      });

      mockQuery.mockResolvedValueOnce({
        rows: [offerAliceRecord],
      });

      const response = await request(app)
        .get(`/api/offers/${offerAliceId}`)
        .set('Authorization', 'Bearer hr2-token');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Forbidden');
      expect(response.body.error.message).toContain('another organization');
    });

    it('SEC-TENANT-02: HR User from Company 1 CAN access Offer from Company 1 (200 OK)', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce({
        uid: hrCompany1.uid,
        email: hrCompany1.email,
        role: hrCompany1.role,
        companyId: hrCompany1.companyId,
      });

      mockQuery.mockResolvedValueOnce({
        rows: [offerAliceRecord],
      });

      const response = await request(app)
        .get(`/api/offers/${offerAliceId}`)
        .set('Authorization', 'Bearer hr1-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(offerAliceId);
    });

    it('SEC-TENANT-03: Admin User from Company 2 CANNOT access Company 1 Offer (403 Forbidden)', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce({
        uid: 'admin-comp2-uid-302',
        email: 'admin@company2.com',
        role: 'ADMIN',
        companyId: '22222222-2222-4222-8222-222222222222',
      });

      mockQuery.mockResolvedValueOnce({
        rows: [offerAliceRecord],
      });

      const response = await request(app)
        .get(`/api/offers/${offerAliceId}`)
        .set('Authorization', 'Bearer admin2-token');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Forbidden');
    });

    it('SEC-TENANT-04: Super Admin CAN access offers across all corporate tenants (200 OK)', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce({
        uid: superAdmin.uid,
        email: superAdmin.email,
        role: superAdmin.role,
      });

      mockQuery.mockResolvedValueOnce({
        rows: [offerAliceRecord],
      });

      const response = await request(app)
        .get(`/api/offers/${offerAliceId}`)
        .set('Authorization', 'Bearer superadmin-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('SEC-TENANT-05: Non-existent offer returns 404 without leaking tenant information', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce({
        uid: candidateAlice.uid,
        email: candidateAlice.email,
        role: candidateAlice.role,
      });

      mockQuery.mockResolvedValueOnce({
        rows: [],
      });

      const nonExistentId = '99999999-9999-4999-8999-999999999999';
      const response = await request(app)
        .get(`/api/offers/${nonExistentId}`)
        .set('Authorization', 'Bearer alice-token');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Offer not found');
    });

    it('SEC-TENANT-06: Malformed UUID returns 400 Bad Request immediately', async () => {
      mockVerifyFirebaseIdToken.mockResolvedValueOnce({
        uid: candidateAlice.uid,
        email: candidateAlice.email,
        role: candidateAlice.role,
      });

      const response = await request(app)
        .get('/api/offers/malformed-id-1234')
        .set('Authorization', 'Bearer alice-token');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Invalid offer UUID format');
    });
  });

  describe('3. Firebase UID Resolution & Inactive Account Defense', () => {
    it('should resolve candidate details and active status correctly from Firebase UID', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            user_id: 'user-db-001',
            firebase_uid: 'candidate-alice-uid-101',
            email: 'alice@candidate.com',
            full_name: 'Alice Henderson',
            is_active: true,
            candidate_id: 'candidate-profile-001',
          },
        ],
      });

      const resolved = await resolveCandidateByFirebaseUid('candidate-alice-uid-101');
      expect(resolved).not.toBeNull();
      expect(resolved?.email).toBe('alice@candidate.com');
      expect(resolved?.candidateId).toBe('candidate-profile-001');
      expect(resolved?.isActive).toBe(true);
    });

    it('should return null when Firebase UID does not match any database user', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
      });

      const resolved = await resolveCandidateByFirebaseUid('unknown-phantom-uid');
      expect(resolved).toBeNull();
    });

    it('should safely reject empty or non-string Firebase UID inputs', async () => {
      expect(await resolveCandidateByFirebaseUid('')).toBeNull();
      expect(await resolveCandidateByFirebaseUid('   ')).toBeNull();
      expect(await resolveCandidateByFirebaseUid(null as any)).toBeNull();
    });
  });
});
