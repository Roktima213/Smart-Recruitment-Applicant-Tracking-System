const mockVerifyIdToken = jest.fn();
const mockSetCustomUserClaims = jest.fn();

jest.mock('firebase-admin/app', () => ({
  initializeApp: jest.fn().mockReturnValue({ name: '[DEFAULT]' }),
  getApps: jest.fn().mockReturnValue([{ name: '[DEFAULT]' }]),
  cert: jest.fn(),
  applicationDefault: jest.fn(),
}));

jest.mock('firebase-admin/auth', () => ({
  getAuth: jest.fn().mockImplementation(() => ({
    verifyIdToken: mockVerifyIdToken,
    setCustomUserClaims: mockSetCustomUserClaims,
  })),
}));

import { isAuthEmulatorEnabled, firebaseAdminApp, verifyFirebaseIdToken, setCustomClaims } from './firebaseAdmin';

describe('Firebase Admin Configuration & Emulator Support', () => {
  beforeEach(() => {
    mockVerifyIdToken.mockResolvedValue({ uid: 'mock-user-123', email: 'test@example.com' });
    mockSetCustomUserClaims.mockResolvedValue(undefined);
  });

  it('should initialize firebaseAdminApp instance', () => {
    expect(firebaseAdminApp).toBeDefined();
    expect(firebaseAdminApp.name).toBe('[DEFAULT]');
  });

  it('isAuthEmulatorEnabled should return boolean based on env', () => {
    expect(typeof isAuthEmulatorEnabled()).toBe('boolean');
  });

  it('verifyFirebaseIdToken should resolve decoded token', async () => {
    const token = await verifyFirebaseIdToken('mock-id-token');
    expect(token).toHaveProperty('uid', 'mock-user-123');
    expect(token).toHaveProperty('email', 'test@example.com');
  });

  it('setCustomClaims should execute successfully', async () => {
    await expect(setCustomClaims('mock-user-123', { role: 'ADMIN' })).resolves.not.toThrow();
  });
});
