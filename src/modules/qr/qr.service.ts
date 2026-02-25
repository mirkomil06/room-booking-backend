import crypto from 'crypto';
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';
import prisma from '../../config/db';

export class QrService {
    async generateQr(roomId: string) {
        const room = await prisma.room.findUnique({ where: { id: roomId } });

        if (!room) {
            throw Object.assign(new Error('Room not found'), { statusCode: 404 });
        }

        // Generate a unique QR token
        const qrToken = crypto.randomUUID();

        // Build the booking URL
        const frontendUrl =
            process.env.FRONTEND_URL || 'http://localhost:3000';
        const bookingUrl = `${frontendUrl}/book?token=${qrToken}`;

        // Ensure the directory exists
        const qrDir = path.join(process.cwd(), 'public', 'qrcodes');
        if (!fs.existsSync(qrDir)) {
            fs.mkdirSync(qrDir, { recursive: true });
        }

        // Generate QR code PNG
        const filePath = path.join(qrDir, `${roomId}.png`);
        await QRCode.toFile(filePath, bookingUrl, {
            width: 400,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF',
            },
        });

        const qrImageUrl = `/public/qrcodes/${roomId}.png`;

        // Update room with QR data
        await prisma.room.update({
            where: { id: roomId },
            data: {
                qrCodeUrl: qrImageUrl,
                qrToken,
            },
        });

        return {
            qrImageUrl,
            bookingUrl,
            qrToken,
        };
    }

    async getQrImage(roomId: string) {
        const room = await prisma.room.findUnique({ where: { id: roomId } });

        if (!room) {
            throw Object.assign(new Error('Room not found'), { statusCode: 404 });
        }

        const filePath = path.join(
            process.cwd(),
            'public',
            'qrcodes',
            `${roomId}.png`
        );

        if (!fs.existsSync(filePath)) {
            throw Object.assign(
                new Error('QR code image not found. Generate QR first.'),
                { statusCode: 404 }
            );
        }

        return filePath;
    }
}

export const qrService = new QrService();
