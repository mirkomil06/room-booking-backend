import { z } from 'zod';

export const createBookingSchema = z
    .object({
        token: z.string().uuid('Invalid QR token'),
        firstName: z.string().min(1, 'First name is required').max(100),
        lastName: z.string().min(1, 'Last name is required').max(100),
        departmentId: z.string().uuid().optional(),
        date: z.string().refine((val) => !isNaN(Date.parse(val)), {
            message: 'Invalid date format. Use ISO 8601 format.',
        }),
        startTime: z.string().refine((val) => !isNaN(Date.parse(val)), {
            message: 'Invalid startTime format. Use ISO 8601 format.',
        }),
        endTime: z.string().refine((val) => !isNaN(Date.parse(val)), {
            message: 'Invalid endTime format. Use ISO 8601 format.',
        }),
    })
    .refine(
        (data) => {
            const start = new Date(data.startTime);
            const end = new Date(data.endTime);
            return start < end;
        },
        {
            message: 'startTime must be before endTime',
            path: ['endTime'],
        }
    );

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export const adminCreateBookingSchema = z
    .object({
        roomId: z.string().uuid(),
        firstName: z.string().min(1).max(100),
        lastName: z.string().min(1).max(100),
        departmentId: z.string().uuid().optional(),
        date: z.string().refine((val) => !isNaN(Date.parse(val)), {
            message: 'Invalid date format. Use ISO 8601 format.',
        }),
        startTime: z.string().refine((val) => !isNaN(Date.parse(val)), {
            message: 'Invalid startTime format. Use ISO 8601 format.',
        }),
        endTime: z.string().refine((val) => !isNaN(Date.parse(val)), {
            message: 'Invalid endTime format. Use ISO 8601 format.',
        }),
        forceOverride: z.boolean().optional().default(false),
    })
    .refine(
        (data) => {
            const start = new Date(data.startTime);
            const end = new Date(data.endTime);
            return start < end;
        },
        {
            message: 'startTime must be before endTime',
            path: ['endTime'],
        }
    );

export type AdminCreateBookingInput = z.infer<typeof adminCreateBookingSchema>;
