import { db } from '../database';
import { bookings, services, emailLogs } from '../database/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { sendReminderEmail } from '../utils/email';

// This task runs daily to send reminder emails 24 hours before bookings
export default defineTask({
  meta: {
    name: 'reminder-emails',
    description: 'Send reminder emails 24 hours before bookings',
  },
  async run() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const endOfTomorrow = new Date(tomorrow);
    endOfTomorrow.setHours(23, 59, 59, 999);

    try {
      // Find bookings scheduled for tomorrow
      const bookingsToRemind = await db
        .select({
          booking: bookings,
          service: services,
        })
        .from(bookings)
        .innerJoin(services, eq(bookings.serviceId, services.id))
        .where(
          and(
            gte(bookings.bookingDate, tomorrow),
            lte(bookings.bookingDate, endOfTomorrow),
            eq(bookings.status, 'confirmed')
          )
        );

      let sent = 0;
      let failed = 0;

      for (const { booking, service } of bookingsToRemind) {
        // Check if reminder already sent
        const existingLog = await db
          .select()
          .from(emailLogs)
          .where(
            and(
              eq(emailLogs.bookingId, booking.id),
              eq(emailLogs.emailType, 'reminder')
            )
          )
          .limit(1);

        if (existingLog.length > 0) {
          continue; // Already sent
        }

        try {
          const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
          const bookingUrl = `${baseUrl}/booking/${booking.token}`;
          
          const result = await sendReminderEmail(booking, service, bookingUrl);

          // Log email
          await db.insert(emailLogs).values({
            bookingId: booking.id,
            emailType: 'reminder',
            status: result.success ? 'sent' : 'failed',
            errorMessage: result.success ? null : String(result.error),
          });

          if (result.success) {
            sent++;
          } else {
            failed++;
          }
        } catch (error) {
          console.error(`Error sending reminder for booking ${booking.id}:`, error);
          failed++;
          
          // Log failed email
          await db.insert(emailLogs).values({
            bookingId: booking.id,
            emailType: 'reminder',
            status: 'failed',
            errorMessage: String(error),
          });
        }
      }

      return {
        success: true,
        sent,
        failed,
        total: bookingsToRemind.length,
      };
    } catch (error) {
      console.error('Error in reminder-emails task:', error);
      return {
        success: false,
        error: String(error),
      };
    }
  },
});
