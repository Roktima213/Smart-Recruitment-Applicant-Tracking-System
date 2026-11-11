import { pool, checkDatabaseConnection, closeDatabasePool } from './database';

describe('Database Configuration & Pool', () => {
  afterAll(async () => {
    await closeDatabasePool();
  });

  it('should initialize pool with expected configuration', () => {
    expect(pool).toBeDefined();
    expect(typeof pool.query).toBe('function');
    expect(typeof pool.connect).toBe('function');
  });

  it('checkDatabaseConnection should handle disconnected state gracefully', async () => {
    // When no local postgres is actively running during test pass, it should return connected: false with latency
    const health = await checkDatabaseConnection();
    expect(health).toHaveProperty('connected');
    expect(health).toHaveProperty('latencyMs');
    expect(typeof health.latencyMs).toBe('number');
  });
});
