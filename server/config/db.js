import mongoose from 'mongoose';
import { APP_CONFIG } from './appConfig.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Local data folder — stored inside the server directory, persists between restarts
const LOCAL_DB_PATH = join(__dirname, '..', 'data', 'db');

export const connectDB = async () => {
  try {
    let mongoUri = APP_CONFIG.MONGO_URI;

    // ── Local / Atlas connection ───────────────────────────────
    if (mongoUri) {
      const conn = await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 8000,
      });
      console.log(`✅  MongoDB Connected (local): ${conn.connection.host}`);
      return;
    }

    // ── Persistent local fallback via MongoMemoryServer ────────
    // Uses a fixed dbPath so data survives server restarts
    console.log('');
    console.warn('⚠️  No MONGO_URI — starting persistent local MongoDB...');
    console.log(`    Data stored at: ${LOCAL_DB_PATH}`);
    console.log('');

    const { MongoMemoryServer } = await import('mongodb-memory-server');
    const mongoServer = await MongoMemoryServer.create({
      instance: {
        dbPath: LOCAL_DB_PATH,    // fixed path → data persists
        storageEngine: 'wiredTiger',
      },
    });

    const memUri = mongoServer.getUri();
    await mongoose.connect(memUri);
    console.log(`✅  MongoDB Connected (persistent local): ${LOCAL_DB_PATH}`);

  } catch (error) {
    console.error('');
    console.error('❌  MongoDB connection failed:', error.message);

    if (error.message.includes('ETIMEOUT') || error.message.includes('querySrv') || error.message.includes('ECONNREFUSED')) {
      console.error('');
      console.error('🔧  LIKELY CAUSES:');
      console.error('    1. Local MongoDB not running → start mongod, or clear MONGO_URI to use built-in');
      console.error('    2. Atlas cluster paused → resume at https://cloud.mongodb.com');
      console.error('    3. IP not whitelisted → Atlas → Network Access → Add 0.0.0.0/0');
      console.error('');
    }

    // ── Last-resort in-memory fallback (no persistence) ────────
    console.warn('⚠️  Falling back to in-memory DB (data WILL be lost on restart).');
    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      const mongoServer = await MongoMemoryServer.create();
      await mongoose.connect(mongoServer.getUri());
      console.log('✅  MongoDB Connected (in-memory fallback): 127.0.0.1');
    } catch (fallbackError) {
      console.error('❌  All DB options failed:', fallbackError.message);
      process.exit(1);
    }
  }
};