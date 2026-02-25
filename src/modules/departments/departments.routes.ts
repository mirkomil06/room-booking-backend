import { Router } from 'express';
import { departmentsController } from './departments.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { adminOnly } from '../../middlewares/role.middleware';

const router = Router();

// Public route — no auth required
router.get('/', departmentsController.getAll.bind(departmentsController));

// Admin-only routes
router.post('/', authMiddleware, adminOnly, departmentsController.create.bind(departmentsController));
router.get('/:id', authMiddleware, adminOnly, departmentsController.getById.bind(departmentsController));
router.patch('/:id', authMiddleware, adminOnly, departmentsController.update.bind(departmentsController));
router.delete('/:id', authMiddleware, adminOnly, departmentsController.delete.bind(departmentsController));

export default router;
