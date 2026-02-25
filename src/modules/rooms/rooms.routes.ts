import { Router } from 'express';
import { roomsController } from './rooms.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { adminOnly } from '../../middlewares/role.middleware';

const router = Router();

// All room routes require admin authentication
router.use(authMiddleware, adminOnly);

router.post('/', roomsController.create.bind(roomsController));
router.get('/', roomsController.getAll.bind(roomsController));
router.get('/:id', roomsController.getById.bind(roomsController));
router.patch('/:id', roomsController.update.bind(roomsController));
router.delete('/:id', roomsController.delete.bind(roomsController));
router.patch(
    '/:id/toggle-active',
    roomsController.toggleActive.bind(roomsController)
);

export default router;
