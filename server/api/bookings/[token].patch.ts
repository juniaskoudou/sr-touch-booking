import { db } from '../../database';
import { bookings } from '../../database/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const updateSchema = z.object({
  action: z.enum(['cancel', 'reschedule']),
  bookingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  bookingTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
});

export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, 'token');
  const body = await readBody(event);

  if (!token) {
    throw createError({
      statusCode: 400,
      message: 'Token is required',
    });
  }

  try {
    const data = updateSchema.parse(body);

    // Get existing booking
    const existing = await db
      .select()
      .from(bookings)
      .where(eq(bookings.token, token))
      .limit(1);

    if (existing.length === 0) {
      throw createError({
        statusCode: 404,
        message: 'Booking not found',
      });
    }

    let updateData: any = {};

    if (data.action === 'cancel') {
      updateData.status = 'cancelled';
    } else if (data.action === 'reschedule') {
      if (!data.bookingDate || !data.bookingTime) {
        throw createError({
          statusCode: 400,
          message: 'bookingDate and bookingTime are required for rescheduling',
        });
      }
      const bookingDate = new Date(`${data.bookingDate}T${data.bookingTime}:00`);
      updateData.bookingDate = bookingDate;
      updateData.bookingTime = `${data.bookingTime}:00`;
    }

    const [updated] = await db
      .update(bookings)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(bookings.token, token))
      .returning();

    return updated;
  } catch (error: any) {
    if (error.statusCode) {
      throw error;
    }
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        message: 'Invalid update data',
        data: error.errors,
      });
    }
    throw createError({
      statusCode: 500,
      message: 'Failed to update booking',
    });
  }
});
