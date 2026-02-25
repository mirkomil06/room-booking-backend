import app from './app';
import cron from 'node-cron';
import { bookingsService } from './modules/bookings/bookings.service';

const PORT = process.env.PORT || 3000;

// ── Start Server ────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
});

// ── Cron Job: Auto-complete past bookings at midnight ───
cron.schedule('0 0 * * *', async () => {
    try {
        const count = await bookingsService.autoCompletePastBookings();
        console.log(
            `✅ [CRON] Auto-completed ${count} past booking(s) at ${new Date().toISOString()}`
        );
    } catch (error) {
        console.error('❌ [CRON] Failed to auto-complete bookings:', error);
    }
});
