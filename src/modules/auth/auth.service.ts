import prisma from '../../config/db';
import bcrypt from 'bcryptjs';
import {
    generateAccessToken,
    generateRefreshToken,
    verifyRefreshToken,
} from '../../utils/jwt';

// In-memory store for invalidated refresh tokens
const invalidatedTokens = new Set<string>();

export class AuthService {
    async register(email: string, password: string, secretKey: string) {
        // Verify admin secret key
        const adminSecretKey = process.env.ADMIN_SECRET_KEY;
        if (!adminSecretKey || secretKey !== adminSecretKey) {
            throw Object.assign(new Error('Invalid admin secret key'), {
                statusCode: 403,
            });
        }

        // Check if admin already exists
        const existingAdmin = await prisma.admin.findUnique({
            where: { email },
        });

        if (existingAdmin) {
            throw Object.assign(
                new Error('Admin with this email already exists'),
                { statusCode: 409 }
            );
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const admin = await prisma.admin.create({
            data: {
                email,
                passwordHash,
            },
            select: {
                id: true,
                email: true,
                createdAt: true,
            },
        });

        return admin;
    }

    async login(email: string, password: string) {
        const admin = await prisma.admin.findUnique({
            where: { email },
        });

        if (!admin) {
            throw Object.assign(new Error('Invalid email or password'), {
                statusCode: 401,
            });
        }

        const isPasswordValid = await bcrypt.compare(password, admin.passwordHash);

        if (!isPasswordValid) {
            throw Object.assign(new Error('Invalid email or password'), {
                statusCode: 401,
            });
        }

        const tokenPayload = { adminId: admin.id, email: admin.email };
        const accessToken = generateAccessToken(tokenPayload);
        const refreshToken = generateRefreshToken(tokenPayload);

        return {
            accessToken,
            refreshToken,
            admin: {
                id: admin.id,
                email: admin.email,
            },
        };
    }

    async refresh(refreshToken: string) {
        if (invalidatedTokens.has(refreshToken)) {
            throw Object.assign(new Error('Refresh token has been invalidated'), {
                statusCode: 401,
            });
        }

        try {
            const decoded = verifyRefreshToken(refreshToken);
            const tokenPayload = { adminId: decoded.adminId, email: decoded.email };
            const newAccessToken = generateAccessToken(tokenPayload);

            return {
                accessToken: newAccessToken,
            };
        } catch {
            throw Object.assign(new Error('Invalid or expired refresh token'), {
                statusCode: 401,
            });
        }
    }

    async logout(refreshToken: string) {
        invalidatedTokens.add(refreshToken);
    }
}

export const authService = new AuthService();
