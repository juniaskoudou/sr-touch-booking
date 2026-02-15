import { db } from '../../database';
import { bookings } from '../../database/schema';
import { eq, gte, and, lte, or, asc } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  await verifyAdminAccess(event);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endOfToday = new Date(today);
  endOfToday.setHours(23, 59, 59, 999);

  try {
    // Pending bookings (awaiting admin confirmation)
    const pendingBookings = await db
      .select()
      .from(bookings)
      .where(eq(bookings.status, 'pending'))
      .orderBy(asc(bookings.bookingDate));

    // Today's bookings (confirmed only)
    const todayBookings = await db
      .select()
      .from(bookings)
      .where(
        and(
          gte(bookings.bookingDate, today),
          lte(bookings.bookingDate, endOfToday),
          or(eq(bookings.status, 'confirmed'), eq(bookings.status, 'pending'))
        )
      );

    // Upcoming bookings (from tomorrow onwards, confirmed + pending)
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const upcomingBookings = await db
      .select()
      .from(bookings)
      .where(
        and(
          gte(bookings.bookingDate, tomorrow),
          or(eq(bookings.status, 'confirmed'), eq(bookings.status, 'pending'))
        )
      )
      .orderBy(asc(bookings.bookingDate));

    // Total bookings
    const totalBookings = await db
      .select()
      .from(bookings);

    return {
      pendingBookings: pendingBookings.length,
      todayBookings: todayBookings.length,
      upcomingBookings: upcomingBookings.length,
      totalBookings: totalBookings.length,
      firstUpcomingDate: upcomingBookings.length > 0 ? upcomingBookings[0].bookingDate : null,
      firstPendingBookingId: pendingBookings.length > 0 ? pendingBookings[0].id : null,
      firstPendingBookingDate: pendingBookings.length > 0 ? pendingBookings[0].bookingDate : null,
    };
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch stats',
    });
  }
});
