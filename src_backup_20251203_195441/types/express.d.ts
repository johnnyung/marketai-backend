import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        userId: number; // Support both conventions
        email: string;
        username: string;
        role: string;
      };
      isAuditMode?: boolean;
    }
  }
}
