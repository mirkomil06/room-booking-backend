import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { sendError } from '../utils/response';

export interface AuthRequest extends Request {
    admin?: {
        adminId: string;
        email: string;
    };
}

export const authMiddleware = (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): void => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            sendError(res, 'Access token is required', 401);
            return;
        }

        const token = authHeader.split(' ')[1];
        const decoded = verifyAccessToken(token);

        req.admin = {
            adminId: decoded.adminId,
            email: decoded.email,
        };

        next();
    } catch (error) {
        sendError(res, 'Invalid or expired access token', 401);
    }
};
