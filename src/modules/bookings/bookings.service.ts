import prisma from '../../config/db';
import { BookingStatus } from '@prisma/client';

export class BookingsService {
    async getRoomByToken(token: string) {
        const room = await prisma.room.findUnique({
            where: { qrToken: token },
            select: {
                id: true,
                name: true,
                location: true,
                capacity: true,
                isActive: true,
            },
        });

        if (!room) {
            throw Object.assign(new Error('Invalid QR token'), { statusCode: 404 });
        }

        return room;
    }

    async createBooking(data: {
        token: string;
        firstName: string;
        lastName: string;
        date: string;
        startTime: string;
        endTime: string;
        departmentId?: string;
    }) {
        // Find room by QR token
        const room = await prisma.room.findUnique({
            where: { qrToken: data.token },
        });

        if (!room) {
            throw Object.assign(new Error('Invalid QR token'), { statusCode: 404 });
        }

        if (!room.isActive) {
            throw Object.assign(
                new Error('This room is currently not available for booking'),
                { statusCode: 403 }
            );
        }

        const bookingDate = new Date(data.date);
        const startTime = new Date(data.startTime);
        const endTime = new Date(data.endTime);

        // Check for overlapping ACTIVE bookings
        const overlapping = await prisma.booking.findFirst({
            where: {
                roomId: room.id,
                status: BookingStatus.ACTIVE,
                date: bookingDate,
                startTime: { lt: endTime },
                endTime: { gt: startTime },
            },
        });

        if (overlapping) {
            throw Object.assign(
                new Error('This time slot is already booked'),
                { statusCode: 409 }
            );
        }

        const booking = await prisma.booking.create({
            data: {
                roomId: room.id,
                firstName: data.firstName,
                lastName: data.lastName,
                date: bookingDate,
                startTime,
                endTime,
                departmentId: data.departmentId,
            },
            include: {
                room: {
                    select: { id: true, name: true, location: true },
                },
                department: {
                    select: { id: true, name: true },
                },
            },
        });

        return booking;
    }

    async getAllBookings(filters: {
        roomId?: string;
        date?: string;
        status?: BookingStatus;
    }) {
        // Auto-complete any ACTIVE bookings whose endTime has passed
        await prisma.booking.updateMany({
            where: {
                status: BookingStatus.ACTIVE,
                endTime: { lt: new Date() },
            },
            data: {
                status: BookingStatus.COMPLETED,
            },
        });

        const where: any = {};

        if (filters.roomId) {
            where.roomId = filters.roomId;
        }

        if (filters.date) {
            where.date = new Date(filters.date);
        }

        if (filters.status) {
            where.status = filters.status;
        }

        const bookings = await prisma.booking.findMany({
            where,
            include: {
                room: {
                    select: { id: true, name: true, location: true },
                },
                department: {
                    select: { id: true, name: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return bookings;
    }

    async getBookingById(id: string) {
        const booking = await prisma.booking.findUnique({
            where: { id },
            include: {
                room: {
                    select: { id: true, name: true, location: true },
                },
            },
        });

        if (!booking) {
            throw Object.assign(new Error('Booking not found'), {
                statusCode: 404,
            });
        }

        return booking;
    }

    async cancelBooking(id: string) {
        const booking = await prisma.booking.findUnique({ where: { id } });

        if (!booking) {
            throw Object.assign(new Error('Booking not found'), {
                statusCode: 404,
            });
        }

        const cancelled = await prisma.booking.update({
            where: { id },
            data: { status: BookingStatus.CANCELLED },
            include: {
                room: {
                    select: { id: true, name: true, location: true },
                },
            },
        });

        return cancelled;
    }

    async completeBooking(id: string) {
        const booking = await prisma.booking.findUnique({ where: { id } });

        if (!booking) {
            throw Object.assign(new Error('Booking not found'), {
                statusCode: 404,
            });
        }

        const completed = await prisma.booking.update({
            where: { id },
            data: { status: BookingStatus.COMPLETED },
            include: {
                room: {
                    select: { id: true, name: true, location: true },
                },
            },
        });

        return completed;
    }

    /**
     * Auto-complete past bookings — called by cron at midnight
     */
    async autoCompletePastBookings() {
        const now = new Date();

        const result = await prisma.booking.updateMany({
            where: {
                status: BookingStatus.ACTIVE,
                endTime: { lt: now },
            },
            data: {
                status: BookingStatus.COMPLETED,
            },
        });

        return result.count;
    }

    async getStats() {
        // Auto-complete any ACTIVE bookings whose endTime has passed
        await prisma.booking.updateMany({
            where: {
                status: BookingStatus.ACTIVE,
                endTime: { lt: new Date() },
            },
            data: {
                status: BookingStatus.COMPLETED,
            },
        });

        const [totalRooms, activeBookings, completedBookings, inactiveRooms] =
            await Promise.all([
                prisma.room.count(),
                prisma.booking.count({
                    where: { status: BookingStatus.ACTIVE },
                }),
                prisma.booking.count({
                    where: { status: BookingStatus.COMPLETED },
                }),
                prisma.room.count({
                    where: { isActive: false },
                }),
            ]);

        return { totalRooms, activeBookings, completedBookings, inactiveRooms };
    }

    async getRecentBookings(limit: number = 5) {
        // Auto-complete any ACTIVE bookings whose endTime has passed
        await prisma.booking.updateMany({
            where: {
                status: BookingStatus.ACTIVE,
                endTime: { lt: new Date() },
            },
            data: {
                status: BookingStatus.COMPLETED,
            },
        });

        const bookings = await prisma.booking.findMany({
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
                room: {
                    select: { name: true },
                },
                department: {
                    select: { id: true, name: true },
                },
            },
        });

        return bookings;
    }
}

export const bookingsService = new BookingsService();
