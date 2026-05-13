import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { prisma } from './db';
import { authRouter } from './routes/auth';
import { restaurantRouter } from './routes/restaurants';
import { programRouter } from './routes/programs';
import { cardRouter } from './routes/cards';
import { appleWalletRouter } from './routes/apple-wallet';
import { googleWalletRouter } from './routes/google-wallet';
import { publicRouter } from './routes/public';
import { apiLimiter, authLimiter, stampLimiter } from './middleware/rate-limit';

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: config.nodeEnv === 'production'
    ? [config.frontendUrl, config.apiBaseUrl].filter(Boolean)
    : true,
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

app.use('/api/', apiLimiter);
app.use('/api/auth', authLimiter, authRouter);
app.use('/api/restaurants', restaurantRouter);
app.use('/api/programs', programRouter);
app.use('/api/cards', stampLimiter, cardRouter);
app.use('/api/passes/apple', appleWalletRouter);
app.use('/api/passes/google', googleWalletRouter);
app.use('/api/public', publicRouter);

// Apple Wallet web service endpoints (required path structure by Apple)
app.use('/api/v1', appleWalletRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const start = async () => {
  try {
    await prisma.$connect();
    console.log('Database connected');

    app.listen(config.port, () => {
      console.log(`Server running on port ${config.port}`);
      console.log(`Environment: ${config.nodeEnv}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

start();

export default app;
