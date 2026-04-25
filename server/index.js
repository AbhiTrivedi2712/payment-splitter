import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db.js';
import { APP_CONFIG } from './config/appConfig.js';
import authRoutes from './routes/authRoutes.js';
import groupRoutes from './routes/groupRoutes.js';
import expenseRoutes from './routes/expenseRoutes.js';

// ── Connect to database ───────────────────────────────────────
connectDB();

const app = express();

// ── Middleware ────────────────────────────────────────────────
app.use(cors({
  origin: APP_CONFIG.CORS_ORIGIN,
  credentials: true,
}));
app.use(express.json());

// ── Health check (useful for debugging) ──────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', env: APP_CONFIG.NODE_ENV, time: new Date().toISOString() });
});

// ── Routes ────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/expenses', expenseRoutes);

// ── 404 handler ───────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.originalUrl} not found` });
});

// ── Global error handler ──────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ message: 'Internal server error' });
});

// ── Start server (auto-advance port if busy) ──────────────────
const startServer = (port) => {
  const server = app.listen(port, () => {
    console.log(`🚀 Server running in ${APP_CONFIG.NODE_ENV} mode on port ${port}`);
    console.log(`   Health: http://localhost:${port}/api/health`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`⚠️  Port ${port} busy — trying port ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('Server error:', err);
      process.exit(1);
    }
  });
};

startServer(Number(APP_CONFIG.PORT));
