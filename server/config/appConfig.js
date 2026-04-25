// =============================================================
//  🔧  APP CONFIG — Plug & Play Control Panel
//  All configurable values live here. Change them in one place
//  and they apply everywhere in the codebase.
//
//  dotenv.config() is called HERE so that process.env is populated
//  before any other module reads APP_CONFIG values.
// =============================================================

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Resolve the path to server/.env regardless of Node's working directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env') }); // ← server/.env

export const APP_CONFIG = {
  // ── Server ──────────────────────────────────────────────────
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',

  // ── Database ─────────────────────────────────────────────────
  // Set MONGO_URI in your .env file to use a real MongoDB Atlas cluster.
  // Leave it empty to automatically fall back to an in-memory DB (dev only).
  MONGO_URI: process.env.MONGO_URI || '',
  get USE_MEMORY_DB() { return !this.MONGO_URI; }, // re-evaluated at access time

  // ── Auth ─────────────────────────────────────────────────────
  JWT_SECRET: process.env.JWT_SECRET || 'change_this_secret_in_production',
  JWT_EXPIRES_IN: '30d',
  BCRYPT_SALT_ROUNDS: 10,

  // ── CORS ─────────────────────────────────────────────────────
  // Add your frontend origin(s) here. '*' allows all (dev only).
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',

  // ── Client URL (used for redirection hints, emails, etc.) ───
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
};
