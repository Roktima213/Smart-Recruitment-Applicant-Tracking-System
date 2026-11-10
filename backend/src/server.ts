import app from './app';
import { closeDatabasePool } from './config/database';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

const server = app.listen(PORT, () => {
  console.log('================================================================');
  console.log(`🚀 Smart ATS Backend Server running on port ${PORT}`);
  console.log(`📡 Environment: ${NODE_ENV}`);
  console.log(`🩺 Health check: http://localhost:${PORT}/api/health`);
  console.log('================================================================');
});

// Graceful shutdown handling (BUG-02)
const shutdown = (signal: string) => {
  console.log(`\nReceived ${signal}. Shutting down HTTP server and database pool gracefully...`);
  server.close(async () => {
    console.log('HTTP server closed.');
    try {
      await closeDatabasePool();
      console.log('Database pool connection closed cleanly.');
      process.exit(0);
    } catch (err: any) {
      console.error('Error closing database pool during shutdown:', err.message);
      process.exit(1);
    }
  });

  // Force exit after 10 seconds if hanging
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Process-level unhandled rejection & exception handlers (BUG-03)
process.on('unhandledRejection', (reason: unknown) => {
  console.error('[Process Error] Unhandled Promise Rejection:', reason);
});

process.on('uncaughtException', (err: Error) => {
  console.error('[Process Fatal] Uncaught Exception:', err.message);
  if (err.stack) console.error(err.stack);
  shutdown('uncaughtException');
});

export default server;
