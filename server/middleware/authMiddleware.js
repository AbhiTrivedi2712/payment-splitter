import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { APP_CONFIG } from '../config/appConfig.js';

// ── protect middleware ────────────────────────────────────────
// Validates the Bearer token from the Authorization header.
// Attaches req.user on success; returns 401 on failure.
export const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  // 1. No token provided at all
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Not authorized — no token provided' });
  }

  try {
    // 2. Verify token
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, APP_CONFIG.JWT_SECRET);

    // 3. Attach user to request (exclude password)
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ message: 'Not authorized — user no longer exists' });
    }

    req.user = user;
    next();
  } catch (error) {
    // Covers expired tokens, malformed tokens, etc.
    return res.status(401).json({ message: 'Not authorized — token is invalid or expired' });
  }
};
