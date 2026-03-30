import app from './app';
import { config } from './config/env';
import { testConnection } from './config/database';
import { AggregationService } from './services/AggregationService';

async function start(): Promise<void> {
  // Test database connection
  const dbConnected = await testConnection();
  if (!dbConnected) {
    console.error('[Server] Failed to connect to database. Exiting.');
    process.exit(1);
  }

  // Start aggregation cron jobs
  const aggregation = new AggregationService();
  aggregation.startCronJobs();

  // Start HTTP server
  const server = app.listen(config.port, () => {
    console.log(`[Server] Web Monitor running on port ${config.port}`);
    console.log(`[Server] Environment: ${config.nodeEnv}`);
    console.log(`[Server] Health check: http://localhost:${config.port}/api/v1/health`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`[Server] ${signal} received. Shutting down gracefully...`);
    aggregation.stopCronJobs();

    server.close(() => {
      console.log('[Server] Closed out remaining connections');
      process.exit(0);
    });

    // Force shutdown after 10s
    setTimeout(() => {
      console.error('[Server] Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10_000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch((err) => {
  console.error('[Server] Failed to start:', err);
  process.exit(1);
});
