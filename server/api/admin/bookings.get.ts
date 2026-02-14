import { db } from '../../database';
import { bookings, services } from '../../database/schema';
import { eq, desc } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  await verifyAdminAccess(event);

  const query = getQuery(event);
  const limit = query.limit ? parseInt(query.limit as string) : 50;

  try {
    const allBookings = await db
      .select({
        booking: bookings,
        service: services,
      })
      .from(bookings)
      .innerJoin(services, eq(bookings.serviceId, services.id))
      .orderBy(desc(bookings.createdAt))
      .limit(limit);

    return allBookings.map(({ booking, service }) => ({
      ...booking,
      service,
    }));
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch bookings',
    });
  }
});
