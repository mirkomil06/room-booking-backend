import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import dotenv from 'dotenv';

import authRoutes from './modules/auth/auth.routes';
import roomsRoutes from './modules/rooms/rooms.routes';
import qrRoutes from './modules/qr/qr.routes';
import bookingsRoutes from './modules/bookings/bookings.routes';
import departmentsRoutes from './modules/departments/departments.routes';
import { errorMiddleware } from './middlewares/error.middleware';

dotenv.config();

const app = express();

// ── Global Middleware ───────────────────────────────────
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── Static Files ────────────────────────────────────────
app.use('/public', express.static(path.join(process.cwd(), 'public')));

// ── Health Check ────────────────────────────────────────
app.get('/api/health', (_req, res) => {
    res.json({ success: true, message: 'Server is running', data: null });
});

// ── API Routes ──────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomsRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/departments', departmentsRoutes);

// ── Global Error Handler ────────────────────────────────
app.use(errorMiddleware);

export default app;
