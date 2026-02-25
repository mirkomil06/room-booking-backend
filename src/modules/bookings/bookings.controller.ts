import { Request, Response, NextFunction } from 'express';
import { bookingsService } from './bookings.service';
import { sendSuccess, sendError } from '../../utils/response';
import { createBookingSchema } from '../../validators/booking.validator';
import { BookingStatus } from '@prisma/client';

export class BookingsController {
    // PUBLIC — get room info by QR token
    async getRoomByToken(req: Request, res: Response, next: NextFunction) {
        try {
            const token = req.query.token as string;

            if (!token) {
                sendError(res, 'Token query parameter is required', 400);
                return;
            }

            const room = await bookingsService.getRoomByToken(token);
            sendSuccess(res, 'Room fetched successfully', room);
        } catch (error) {
            next(error);
        }
    }

    // PUBLIC — create a booking
    async create(req: Request, res: Response, next: NextFunction) {
        try {
            const validated = createBookingSchema.parse(req.body);
            const booking = await bookingsService.createBooking(validated);
            sendSuccess(res, 'Booking created successfully', booking, 201);
        } catch (error) {
            next(error);
        }
    }

    // ADMIN — get all bookings with optional filters
    async getAll(req: Request, res: Response, next: NextFunction) {
        try {
            const filters: {
                roomId?: string;
                date?: string;
                status?: BookingStatus;
            } = {};

            if (req.query.roomId) filters.roomId = req.query.roomId as string;
            if (req.query.date) filters.date = req.query.date as string;
            if (req.query.status)
                filters.status = req.query.status as BookingStatus;

            const bookings = await bookingsService.getAllBookings(filters);
            sendSuccess(res, 'Bookings fetched successfully', bookings);
        } catch (error) {
            next(error);
        }
    }

    // ADMIN — get a single booking
    async getById(req: Request, res: Response, next: NextFunction) {
        try {
            const id = req.params.id as string;
            const booking = await bookingsService.getBookingById(id);
            sendSuccess(res, 'Booking fetched successfully', booking);
        } catch (error) {
            next(error);
        }
    }

    // ADMIN — cancel a booking
    async cancel(req: Request, res: Response, next: NextFunction) {
        try {
            const id = req.params.id as string;
            const booking = await bookingsService.cancelBooking(id);
            sendSuccess(res, 'Booking cancelled successfully', booking);
        } catch (error) {
            next(error);
        }
    }

    // ADMIN — mark booking as completed
    async complete(req: Request, res: Response, next: NextFunction) {
        try {
            const id = req.params.id as string;
            const booking = await bookingsService.completeBooking(id);
            sendSuccess(res, 'Booking completed successfully', booking);
        } catch (error) {
            next(error);
        }
    }

    // ADMIN — get booking stats
    async getStats(req: Request, res: Response, next: NextFunction) {
        try {
            const stats = await bookingsService.getStats();
            sendSuccess(res, 'Booking stats fetched successfully', stats);
        } catch (error) {
            next(error);
        }
    }

    // ADMIN — get recent bookings
    async getRecent(req: Request, res: Response, next: NextFunction) {
        try {
            const limit = parseInt(req.query.limit as string) || 5;
            const bookings = await bookingsService.getRecentBookings(limit);
            sendSuccess(res, 'Recent bookings fetched successfully', bookings);
        } catch (error) {
            next(error);
        }
    }
}

export const bookingsController = new BookingsController();
