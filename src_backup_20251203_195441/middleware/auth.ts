import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        console.warn('[Auth] No token provided');
        return res.status(401).json({ error: 'No token provided' });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
        console.error('[Auth] CRITICAL: JWT_SECRET missing');
        return res.status(500).json({ error: 'Server Auth Misconfiguration' });
    }

    jwt.verify(token, secret, (err: any, decoded: any) => {
        if (err) {
            console.error(`[Auth] Verification Failed: ${err.message}`);
            return res.status(403).json({ error: `Invalid Token: ${err.message}` });
        }

        const finalId = decoded.userId || decoded.id;
        
        if (!finalId) {
            console.error('[Auth] Payload missing ID');
            return res.status(403).json({ error: 'Token missing user ID' });
        }

        req.user = {
            id: finalId,
            userId: finalId,
            email: decoded.email,
            username: decoded.username,
            role: decoded.role || 'user'
        };

        next();
    });
};

// Legacy alias
export const authenticate = authenticateToken;
