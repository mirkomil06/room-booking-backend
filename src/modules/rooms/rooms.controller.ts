import { Request, Response, NextFunction } from 'express';
import { roomsService } from './rooms.service';
import { sendSuccess } from '../../utils/response';
import { createRoomSchema, updateRoomSchema } from '../../validators/room.validator';

export class RoomsController {
    async create(req: Request, res: Response, next: NextFunction) {
        try {
            const validated = createRoomSchema.parse(req.body);
            const room = await roomsService.createRoom(validated);
            sendSuccess(res, 'Room created successfully', room, 201);
        } catch (error) {
            next(error);
        }
    }

    async getAll(_req: Request, res: Response, next: NextFunction) {
        try {
            const rooms = await roomsService.getAllRooms();
            sendSuccess(res, 'Rooms fetched successfully', rooms);
        } catch (error) {
            next(error);
        }
    }

    async getById(req: Request, res: Response, next: NextFunction) {
        try {
            const id = req.params.id as string;
            const room = await roomsService.getRoomById(id);
            sendSuccess(res, 'Room fetched successfully', room);
        } catch (error) {
            next(error);
        }
    }

    async update(req: Request, res: Response, next: NextFunction) {
        try {
            const id = req.params.id as string;
            const validated = updateRoomSchema.parse(req.body);
            const room = await roomsService.updateRoom(id, validated);
            sendSuccess(res, 'Room updated successfully', room);
        } catch (error) {
            next(error);
        }
    }

    async delete(req: Request, res: Response, next: NextFunction) {
        try {
            const id = req.params.id as string;
            await roomsService.deleteRoom(id);
            sendSuccess(res, 'Room deleted successfully');
        } catch (error) {
            next(error);
        }
    }

    async toggleActive(req: Request, res: Response, next: NextFunction) {
        try {
            const id = req.params.id as string;
            const room = await roomsService.toggleActive(id);
            sendSuccess(
                res,
                `Room ${room.isActive ? 'activated' : 'deactivated'} successfully`,
                room
            );
        } catch (error) {
            next(error);
        }
    }
}

export const roomsController = new RoomsController();
