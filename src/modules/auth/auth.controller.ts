import { Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthRequest } from '../../middlewares/auth.middleware';

export class AuthController {
    async register(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { email, password, secretKey } = req.body;

            if (!email || !password || !secretKey) {
                sendError(res, 'Email, password, and secretKey are required', 400);
                return;
            }

            const admin = await authService.register(email, password, secretKey);
            sendSuccess(res, 'Admin registered successfully', admin, 201);
        } catch (error) {
            next(error);
        }
    }

    async login(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                sendError(res, 'Email and password are required', 400);
                return;
            }

            const result = await authService.login(email, password);

            // Set refresh token as HttpOnly cookie
            res.cookie('refreshToken', result.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            });

            sendSuccess(res, 'Login successful', {
                accessToken: result.accessToken,
                refreshToken: result.refreshToken,
                admin: result.admin,
            });
        } catch (error) {
            next(error);
        }
    }

    async refresh(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const refreshToken =
                req.cookies?.refreshToken || req.body?.refreshToken;

            if (!refreshToken) {
                sendError(res, 'Refresh token is required', 400);
                return;
            }

            const result = await authService.refresh(refreshToken);
            sendSuccess(res, 'Token refreshed successfully', result);
        } catch (error) {
            next(error);
        }
    }

    async logout(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const refreshToken =
                req.cookies?.refreshToken || req.body?.refreshToken;

            if (!refreshToken) {
                sendError(res, 'Refresh token is required', 400);
                return;
            }

            await authService.logout(refreshToken);

            res.clearCookie('refreshToken');
            sendSuccess(res, 'Logged out successfully');
        } catch (error) {
            next(error);
        }
    }

    async changePassword(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { currentPassword, newPassword } = req.body;

            if (!currentPassword || !newPassword) {
                sendError(res, 'currentPassword and newPassword are required', 400);
                return;
            }

            const adminId = req.admin!.adminId;
            await authService.changePassword(adminId, currentPassword, newPassword);
            sendSuccess(res, 'Password changed successfully');
        } catch (error) {
            next(error);
        }
    }
}

export const authController = new AuthController();
