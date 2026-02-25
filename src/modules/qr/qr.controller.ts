import { Request, Response, NextFunction } from 'express';
import { qrService } from './qr.service';
import { sendSuccess } from '../../utils/response';

export class QrController {
    async generate(req: Request, res: Response, next: NextFunction) {
        try {
            const roomId = req.params.roomId as string;
            const result = await qrService.generateQr(roomId);
            sendSuccess(res, 'QR code generated successfully', result, 201);
        } catch (error) {
            next(error);
        }
    }

    async getImage(req: Request, res: Response, next: NextFunction) {
        try {
            const roomId = req.params.roomId as string;
            const filePath = await qrService.getQrImage(roomId);
            res.sendFile(filePath);
        } catch (error) {
            next(error);
        }
    }
}

export const qrController = new QrController();
