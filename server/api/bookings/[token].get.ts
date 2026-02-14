import { db } from '../../database';
import { bookings, services, bookingAddons } from '../../database/schema';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, 'token');

  if (!token) {
    throw createError({ statusCode: 400, message: 'Token is required' });
  }

  try {
    const booking = await db
      .select({
        booking: bookings,
        service: services,
      })
      .from(bookings)
      .innerJoin(services, eq(bookings.serviceId, services.id))
      .where(eq(bookings.token, token))
      .limit(1);

    if (booking.length === 0) {
      throw createError({ statusCode: 404, message: 'Booking not found' });
    }

    // Fetch booking add-ons
    const addons = await db
      .select({
        id: bookingAddons.id,
        name: services.name,
        price: bookingAddons.price,
      })
      .from(bookingAddons)
      .innerJoin(services, eq(bookingAddons.serviceId, services.id))
      .where(eq(bookingAddons.bookingId, booking[0].booking.id));

    return {
      booking: booking[0].booking,
      service: booking[0].service,
      addons,
    };
  } catch (error: any) {
    if (error.statusCode) throw error;
    throw createError({ statusCode: 500, message: 'Failed to fetch booking' });
  }
});
