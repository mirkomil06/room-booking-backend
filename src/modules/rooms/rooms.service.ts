import prisma from '../../config/db';
import { Prisma } from '@prisma/client';

export class RoomsService {
    async createRoom(data: Prisma.RoomCreateInput) {
        const room = await prisma.room.create({ data });
        return room;
    }

    async getAllRooms() {
        const rooms = await prisma.room.findMany({
            orderBy: { createdAt: 'desc' },
        });
        return rooms;
    }

    async getRoomById(id: string) {
        const room = await prisma.room.findUnique({
            where: { id },
            include: {
                bookings: {
                    where: { status: 'ACTIVE' },
                    orderBy: { startTime: 'asc' },
                },
            },
        });

        if (!room) {
            throw Object.assign(new Error('Room not found'), { statusCode: 404 });
        }

        return room;
    }

    async updateRoom(id: string, data: Prisma.RoomUpdateInput) {
        const room = await prisma.room.findUnique({ where: { id } });

        if (!room) {
            throw Object.assign(new Error('Room not found'), { statusCode: 404 });
        }

        const updatedRoom = await prisma.room.update({
            where: { id },
            data,
        });

        return updatedRoom;
    }

    async deleteRoom(id: string) {
        const room = await prisma.room.findUnique({ where: { id } });

        if (!room) {
            throw Object.assign(new Error('Room not found'), { statusCode: 404 });
        }

        await prisma.room.delete({ where: { id } });
    }

    async toggleActive(id: string) {
        const room = await prisma.room.findUnique({ where: { id } });

        if (!room) {
            throw Object.assign(new Error('Room not found'), { statusCode: 404 });
        }

        const updatedRoom = await prisma.room.update({
            where: { id },
            data: { isActive: !room.isActive },
        });

        return updatedRoom;
    }
}

export const roomsService = new RoomsService();
