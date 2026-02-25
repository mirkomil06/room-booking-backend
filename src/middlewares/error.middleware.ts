import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

export const errorMiddleware = (
    err: Error,
    _req: Request,
    res: Response,
    _next: NextFunction
): void => {
    console.error('Error:', err);

    // Zod validation errors
    if (err instanceof ZodError) {
        const messages = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
        res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: messages,
            statusCode: 400,
        });
        return;
    }

    // Prisma known request errors
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P2002') {
            res.status(409).json({
                success: false,
                message: 'A record with this value already exists',
                statusCode: 409,
            });
            return;
        }

        if (err.code === 'P2025') {
            res.status(404).json({
                success: false,
                message: 'Record not found',
                statusCode: 404,
            });
            return;
        }
    }

    // Default error
    const statusCode = (err as any).statusCode || 500;
    res.status(statusCode).json({
        success: false,
        message: err.message || 'Internal server error',
        statusCode,
    });
};
