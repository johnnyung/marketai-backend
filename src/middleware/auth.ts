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
        role?: string;
      };
      isAuditMode?: boolean;
    }
  }
}

const AUDIT_SECRET = process.env.AUDIT_MODE_SECRET || 'marketai-audit-bypass-key-2025';

/**
 * Middleware to verify JWT token OR Audit Key
 */
export function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);

    // AUDIT BYPASS
    if (token === AUDIT_SECRET) {
        console.log(`   🛡️  Audit Mode Access: ${req.path}`);
        req.user = { userId: 0, email: 'system@audit', username: 'AuditSystem', role: 'system' };
        req.isAuditMode = true;
        return next();
    }

    // Standard JWT Verification
    const payload = authService.verifyToken(token);
    req.user = payload;
    
    next();
  } catch (error: any) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Alias for consistency
export const authenticateToken = authenticate;

export function optionalAuthenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      if (token === AUDIT_SECRET) {
          req.user = { userId: 0, email: 'system@audit', username: 'AuditSystem', role: 'system' };
          req.isAuditMode = true;
      } else {
          const payload = authService.verifyToken(token);
          req.user = payload;
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
}
