import { Router } from 'express';
import { qrController } from './qr.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { adminOnly } from '../../middlewares/role.middleware';

const router = Router();

// Generate QR - admin only
router.post(
    '/generate/:roomId',
    authMiddleware,
    adminOnly,
    qrController.generate.bind(qrController)
);

// Get QR image - public (for printing)
router.get('/image/:roomId', qrController.getImage.bind(qrController));

export default router;
