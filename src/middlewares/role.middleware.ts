import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { sendError } from '../utils/response';

export const adminOnly = (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): void => {
    if (!req.admin) {
        sendError(res, 'Admin access required', 403);
        return;
    }

    next();
};
