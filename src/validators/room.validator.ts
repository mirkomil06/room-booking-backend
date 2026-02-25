import { z } from 'zod';

export const createRoomSchema = z.object({
    name: z.string().min(1, 'Room name is required').max(100),
    location: z.string().max(200).optional(),
    capacity: z.number().int().positive().optional(),
    isActive: z.boolean().optional(),
});

export const updateRoomSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    location: z.string().max(200).optional().nullable(),
    capacity: z.number().int().positive().optional().nullable(),
    isActive: z.boolean().optional(),
});
