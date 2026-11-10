import { syncUserClaims, isValidAtsRole, getUserClaims, revokeUserSessions } from './claimsSyncService';
import * as firebaseAdminModule from '../config/firebaseAdmin';

jest.mock('../config/firebaseAdmin', () => ({
  setCustomClaims: jest.fn().mockResolvedValue(undefined),
  adminAuth: {
    getUser: jest.fn().mockResolvedValue({
      uid: 'user-123',
      customClaims: { role: 'RECRUITER', companyId: 'comp-456' },
    }),
    revokeRefreshTokens: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('Claims Sync Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isValidAtsRole', () => {
    it('should validate allowed ATS roles', () => {
      expect(isValidAtsRole('ADMIN')).toBe(true);
      expect(isValidAtsRole('CANDIDATE')).toBe(true);
      expect(isValidAtsRole('HR_MANAGER')).toBe(true);
      expect(isValidAtsRole('INVALID_ROLE')).toBe(false);
    });
  });

  describe('syncUserClaims', () => {
    it('should sync claims successfully for valid user and role', async () => {
      const result = await syncUserClaims('user-123', 'admin', 'comp-999');

      expect(result.success).toBe(true);
      expect(result.claims.role).toBe('ADMIN');
      expect(result.claims.companyId).toBe('comp-999');
      expect(firebaseAdminModule.setCustomClaims).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          role: 'ADMIN',
          companyId: 'comp-999',
        })
      );
    });

    it('should throw an error for an invalid role', async () => {
      await expect(syncUserClaims('user-123', 'SUPERMAN')).rejects.toThrow(/Invalid role/);
    });

    it('should throw an error if UID is missing', async () => {
      await expect(syncUserClaims('', 'ADMIN')).rejects.toThrow(/valid Firebase UID is required/);
    });
  });

  describe('getUserClaims & revokeUserSessions', () => {
    it('should retrieve existing custom claims', async () => {
      const claims = await getUserClaims('user-123');
      expect(claims).toEqual({ role: 'RECRUITER', companyId: 'comp-456' });
    });

    it('should invoke revokeRefreshTokens', async () => {
      await revokeUserSessions('user-123');
      expect(firebaseAdminModule.adminAuth.revokeRefreshTokens).toHaveBeenCalledWith('user-123');
    });
  });
});
