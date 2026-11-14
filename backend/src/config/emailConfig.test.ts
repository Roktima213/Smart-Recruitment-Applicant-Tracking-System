import { getEmailConfig, isSimulatedEmailMode, formatSimulatedEmailLog } from './emailConfig';

describe('Email Configuration & Simulation Mode (Floor 17)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('1. Defaults safely to SIMULATED mode when EMAIL_MODE is unset', () => {
    delete process.env.EMAIL_MODE;
    delete process.env.EMAIL_FROM;
    const config = getEmailConfig();
    expect(config.mode).toBe('SIMULATED');
    expect(isSimulatedEmailMode()).toBe(true);
    expect(config.from).toContain('smart-ats.internal');
  });

  it('2. Respects LIVE_SMTP mode when explicitly set in environment', () => {
    process.env.EMAIL_MODE = 'LIVE_SMTP';
    process.env.SMTP_HOST = 'smtp.sendgrid.net';
    process.env.SMTP_PORT = '465';
    process.env.SMTP_USER = 'apikey';
    process.env.SMTP_PASS = 'secret-token';
    process.env.EMAIL_FROM = 'recruiting@corp.com';

    const config = getEmailConfig();
    expect(config.mode).toBe('LIVE_SMTP');
    expect(isSimulatedEmailMode()).toBe(false);
    expect(config.smtp.host).toBe('smtp.sendgrid.net');
    expect(config.smtp.port).toBe(465);
    expect(config.smtp.secure).toBe(true);
    expect(config.from).toBe('recruiting@corp.com');
  });

  it('3. Formats clean, reproducible log string for SIMULATED email output', () => {
    const payload = {
      to: 'candidate@example.com',
      subject: 'Interview Scheduled: Technical Round',
      html: '<p>Your interview is confirmed for tomorrow.</p>',
      text: 'Your interview is confirmed for tomorrow.',
      metadata: { applicationId: 'app-123' },
    };

    const logOutput = formatSimulatedEmailLog(payload, 'msg-uuid-999');
    expect(logOutput).toContain('[SIMULATED EMAIL DISPATCH]');
    expect(logOutput).toContain('candidate@example.com');
    expect(logOutput).toContain('Interview Scheduled: Technical Round');
    expect(logOutput).toContain('Your interview is confirmed for tomorrow.');
  });
});
