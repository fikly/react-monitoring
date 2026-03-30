import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { config } from './config/env';
import healthRouter from './routes/health';
import ingestRouter from './routes/ingest';
import queryRouter from './routes/query';

const app = express();

// Security
app.use(helmet());
app.use(cors({ origin: config.cors.origin }));

// Parsing
app.use(express.json({ limit: '1mb' }));
app.use(compression());

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Routes
app.use('/api/v1', healthRouter);
app.use('/api/v1', ingestRouter);
app.use('/api/v1', queryRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Server] Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
