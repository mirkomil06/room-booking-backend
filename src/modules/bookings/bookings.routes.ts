import { Router } from 'express';
import { bookingsController } from './bookings.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { adminOnly } from '../../middlewares/role.middleware';

const router = Router();

// ── PUBLIC routes (no auth required) ────────────────────
router.get(
    '/room-by-token',
    bookingsController.getRoomByToken.bind(bookingsController)
);
router.post('/', bookingsController.create.bind(bookingsController));

// ── ADMIN routes (auth required) ────────────────────────
router.get(
    '/stats',
    authMiddleware,
    adminOnly,
    bookingsController.getStats.bind(bookingsController)
);
router.get(
    '/recent',
    authMiddleware,
    adminOnly,
    bookingsController.getRecent.bind(bookingsController)
);
router.get(
    '/',
    authMiddleware,
    adminOnly,
    bookingsController.getAll.bind(bookingsController)
);
router.get(
    '/:id',
    authMiddleware,
    adminOnly,
    bookingsController.getById.bind(bookingsController)
);
router.delete(
    '/:id',
    authMiddleware,
    adminOnly,
    bookingsController.cancel.bind(bookingsController)
);
router.patch(
    '/:id/complete',
    authMiddleware,
    adminOnly,
    bookingsController.complete.bind(bookingsController)
);

export default router;
