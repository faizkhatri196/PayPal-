import express from 'express';
import cors from 'cors';
import { CONFIG } from './config.js';
import { apiRouter } from './api/routes.js';

const app = express();

app.use(cors({ origin: CONFIG.CORS_ORIGIN === '*' ? true : CONFIG.CORS_ORIGIN }));
app.use(express.json({ limit: '10mb' }));

app.use('/api', apiRouter);

// Fallback error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Unhandled Server Error]:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
  });
});

app.listen(CONFIG.PORT, () => {
  console.log(`======================================================`);
  console.log(`🛡️  HOLDFAST AUTHORIZATION HOLD & ACCEPTANCE RECEIPT PROTOCOL`);
  console.log(`📡 Server listening on http://localhost:${CONFIG.PORT}`);
  console.log(`🎯 PayPal Base URL: ${CONFIG.PAYPAL.BASE_URL}`);
  console.log(`🧠 AI Provider: ${CONFIG.AI.PROVIDER}`);
  console.log(`======================================================`);
});

export default app;
