import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.js';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number;
        email: string;
        username: string;
      };
    }
  }
}

/**
 * Middleware to verify JWT token
 */
export function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const payload = authService.verifyToken(token);
    
    // Attach user to request
    req.user = payload;
    
    next();
  } catch (error: any) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Alias for consistency
export const authenticateToken = authenticate;

/**
 * Optional authentication - doesn't fail if no token
 */
export function optionalAuthenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = authService.verifyToken(token);
      req.user = payload;
    }
    
    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
}
