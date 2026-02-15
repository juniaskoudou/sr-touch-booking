import { db } from '../../../database';
import { bookings, services, emailLogs } from '../../../database/schema';
import { eq } from 'drizzle-orm';
import { sendConfirmationEmail } from '../../../utils/email';
import { z } from 'zod';

const updateSchema = z.object({
  action: z.enum(['confirm', 'cancel', 'reschedule', 'complete']),
  bookingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  bookingTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
});

export default defineEventHandler(async (event) => {
  await verifyAdminAccess(event);

  const idParam = getRouterParam(event, 'id');
  const body = await readBody(event);

  if (!idParam) {
    throw createError({ statusCode: 400, message: 'Booking ID is required' });
  }

  const bookingId = parseInt(idParam, 10);
  if (isNaN(bookingId)) {
    throw createError({ statusCode: 400, message: 'Invalid booking ID' });
  }

  try {
    const data = updateSchema.parse(body);

    // Get existing booking with service
    const existing = await db
      .select({ booking: bookings, service: services })
      .from(bookings)
      .innerJoin(services, eq(bookings.serviceId, services.id))
      .where(eq(bookings.id, bookingId))
      .limit(1);

    if (existing.length === 0) {
      throw createError({ statusCode: 404, message: 'Booking not found' });
    }

    const { booking: currentBooking, service } = existing[0];
    let updateData: Record<string, any> = {};

    switch (data.action) {
      case 'confirm':
        if (currentBooking.status !== 'pending') {
          throw createError({ statusCode: 400, message: 'Seules les réservations en attente peuvent être confirmées' });
        }
        updateData.status = 'confirmed';
        break;

      case 'cancel':
        if (currentBooking.status === 'cancelled') {
          throw createError({ statusCode: 400, message: 'Cette réservation est déjà annulée' });
        }
        updateData.status = 'cancelled';
        break;

      case 'reschedule':
        if (!data.bookingDate || !data.bookingTime) {
          throw createError({
            statusCode: 400,
            message: 'bookingDate et bookingTime sont requis pour reporter',
          });
        }
        if (currentBooking.status === 'cancelled') {
          throw createError({ statusCode: 400, message: 'Impossible de reporter une réservation annulée' });
        }
        const bookingDate = new Date(`${data.bookingDate}T${data.bookingTime}:00`);
        updateData.bookingDate = bookingDate;
        updateData.bookingTime = `${data.bookingTime}:00`;
        updateData.status = 'confirmed'; // Rescheduling also confirms
        break;

      case 'complete':
        if (currentBooking.status !== 'confirmed') {
          throw createError({ statusCode: 400, message: 'Seules les réservations confirmées peuvent être terminées' });
        }
        updateData.status = 'completed';
        break;
    }

    const [updated] = await db
      .update(bookings)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, bookingId))
      .returning();

    // Send confirmation email when booking is confirmed
    let emailSent = false;
    if (data.action === 'confirm' || data.action === 'reschedule') {
      const baseUrl = process.env.BASE_URL || getRequestURL(event).origin;
      const bookingUrl = `${baseUrl}/booking/${currentBooking.token}`;

      try {
        const emailResult = await sendConfirmationEmail(updated, service, bookingUrl);
        emailSent = emailResult.success;

        // Log email result to database
        await db.insert(emailLogs).values({
          bookingId: updated.id,
          emailType: 'confirmation',
          status: emailResult.success ? 'sent' : 'failed',
          errorMessage: emailResult.success ? null : String(emailResult.error),
        });

        if (!emailResult.success) {
          console.error('Confirmation email failed for booking', updated.id, ':', emailResult.error);
        }
      } catch (emailErr) {
        console.error('Email sending failed after admin action:', emailErr);

        // Log the failure
        await db.insert(emailLogs).values({
          bookingId: updated.id,
          emailType: 'confirmation',
          status: 'failed',
          errorMessage: String(emailErr),
        }).catch(() => {}); // Don't fail the whole request if logging fails
      }
    }

    return { ...updated, emailSent };
  } catch (error: any) {
    if (error.statusCode) throw error;
    if (error instanceof z.ZodError) {
      throw createError({ statusCode: 400, message: 'Données invalides', data: error.errors });
    }
    console.error('Error updating booking:', error);
    throw createError({ statusCode: 500, message: 'Erreur lors de la mise à jour de la réservation' });
  }
});
