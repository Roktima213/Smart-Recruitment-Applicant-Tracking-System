import {
  LOCK_APPLICATION_FOR_UPDATE_SQL,
  UPDATE_APPLICATION_STAGE_SQL,
  INSERT_STAGE_AUDIT_LOG_SQL,
  executeStageTransitionWithLock,
  getStageTransitionStats,
  clearStageTransitionStats,
} from './stageTransitionDbService';

describe('Stage Transition Database Service & Concurrency Locking', () => {
  const mockClient = {
    query: jest.fn(),
    release: jest.fn(),
  };

  const appId = '55555555-5555-4555-8555-555555555555';
  const actorId = 'actor-user-uuid-1234';

  beforeEach(() => {
    jest.clearAllMocks();
    clearStageTransitionStats();
  });

  it('1. SQL query must use SELECT ... FOR UPDATE OF a to guarantee row-level lock', () => {
    expect(LOCK_APPLICATION_FOR_UPDATE_SQL).toContain('FOR UPDATE OF a');
    expect(LOCK_APPLICATION_FOR_UPDATE_SQL).toContain('FROM applications a');
    expect(LOCK_APPLICATION_FOR_UPDATE_SQL).toContain('JOIN jobs j ON a.job_id = j.id');
  });

  it('2. Executes atomic stage transition with lock, update, audit insert and commits', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({
        rows: [
          {
            id: appId,
            job_id: 'job-1',
            candidate_id: 'cand-1',
            current_stage: 'APPLIED',
            updated_at: '2026-11-13T10:00:00Z',
          },
        ],
      }) // FOR UPDATE query
      .mockResolvedValueOnce({
        rows: [
          {
            id: appId,
            job_id: 'job-1',
            candidate_id: 'cand-1',
            current_stage: 'SCREENING',
            updated_at: '2026-11-13T10:05:00Z',
          },
        ],
      }) // UPDATE query
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'history-1',
            application_id: appId,
            from_stage: 'APPLIED',
            to_stage: 'SCREENING',
            changed_by: actorId,
            reason: 'Strong engineering background',
            changed_at: '2026-11-13T10:05:00Z',
          },
        ],
      }) // INSERT history
      .mockResolvedValueOnce({ rows: [] }); // COMMIT

    const result = await executeStageTransitionWithLock({
      applicationId: appId,
      toStage: 'SCREENING',
      actorUserId: actorId,
      reason: 'Strong engineering background',
      validateTransition: () => ({ valid: true }),
      providedClient: mockClient as any,
    });

    expect(result.application.current_stage).toBe('SCREENING');
    expect(result.history.to_stage).toBe('SCREENING');
    expect(result.telemetry.lockAcquired).toBe(true);
    expect(result.telemetry.success).toBe(true);

    expect(mockClient.query).toHaveBeenNthCalledWith(1, 'BEGIN');
    expect(mockClient.query).toHaveBeenNthCalledWith(2, LOCK_APPLICATION_FOR_UPDATE_SQL, [appId]);
    expect(mockClient.query).toHaveBeenNthCalledWith(3, UPDATE_APPLICATION_STAGE_SQL, ['SCREENING', appId]);
    expect(mockClient.query).toHaveBeenNthCalledWith(4, INSERT_STAGE_AUDIT_LOG_SQL, [
      appId,
      'APPLIED',
      'SCREENING',
      actorId,
      'Strong engineering background',
    ]);
    expect(mockClient.query).toHaveBeenNthCalledWith(5, 'COMMIT');

    const stats = getStageTransitionStats();
    expect(stats.totalTransitions).toBe(1);
    expect(stats.successCount).toBe(1);
    expect(stats.failureCount).toBe(0);
  });

  it('3. Rolls back transaction and records failure telemetry when validation fails', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({
        rows: [
          {
            id: appId,
            job_id: 'job-1',
            candidate_id: 'cand-1',
            current_stage: 'APPLIED',
            updated_at: '2026-11-13T10:00:00Z',
          },
        ],
      }) // FOR UPDATE query
      .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

    await expect(
      executeStageTransitionWithLock({
        applicationId: appId,
        toStage: 'OFFERED', // Illegal transition directly from APPLIED
        actorUserId: actorId,
        reason: 'Skipping stages',
        validateTransition: () => ({ valid: false, error: 'Cannot jump from APPLIED to OFFERED' }),
        providedClient: mockClient as any,
      })
    ).rejects.toThrow('Cannot jump from APPLIED to OFFERED');

    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');

    const stats = getStageTransitionStats();
    expect(stats.totalTransitions).toBe(1);
    expect(stats.successCount).toBe(0);
    expect(stats.failureCount).toBe(1);
  });

  it('4. Rolls back and returns 404 when application does not exist', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [] }) // FOR UPDATE returned 0 rows
      .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

    await expect(
      executeStageTransitionWithLock({
        applicationId: appId,
        toStage: 'SCREENING',
        actorUserId: actorId,
        reason: 'Non-existent app',
        validateTransition: () => ({ valid: true }),
        providedClient: mockClient as any,
      })
    ).rejects.toThrow(`Application with ID ${appId} not found`);

    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
  });
});
