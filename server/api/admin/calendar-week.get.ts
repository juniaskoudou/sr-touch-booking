import { db } from '../../database';
import { availability, availabilityOverrides, bookings, services } from '../../database/schema';
import { eq, and, gte, lte, asc, or } from 'drizzle-orm';

/**
 * Generate an array of YYYY-MM-DD strings starting from startStr for count days.
 * Uses UTC noon to avoid timezone day-shift issues.
 */
function generateDateRange(startStr: string, count: number): string[] {
  const dates: string[] = [];
  const d = new Date(startStr + 'T12:00:00Z');
  for (let i = 0; i < count; i++) {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${day}`);
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return dates;
}

function dayOfWeekFromDateStr(dateStr: string): number {
  const d = new Date(dateStr + 'T12:00:00Z');
  return d.getUTCDay();
}

export default defineEventHandler(async (event) => {
  await verifyAdminAccess(event);

  const query = getQuery(event);
  const startStr = query.start as string;

  if (!startStr || !/^\d{4}-\d{2}-\d{2}$/.test(startStr)) {
    throw createError({ statusCode: 400, message: 'start parameter required (YYYY-MM-DD)' });
  }

  // Generate 7 date strings starting from startStr (timezone-safe)
  const weekDateStrs = generateDateRange(startStr, 7);
  const endStr = weekDateStrs[weekDateStrs.length - 1];

  // For booking queries, use explicit UTC timestamps
  const startDate = new Date(startStr + 'T00:00:00Z');
  const endDate = new Date(endStr + 'T23:59:59.999Z');

  try {
    // 1. Fetch recurring schedule
    const recurringSchedule = await db
      .select()
      .from(availability)
      .where(eq(availability.isAvailable, true))
      .orderBy(asc(availability.dayOfWeek), asc(availability.startTime));

    // 2. Fetch overrides for the date range
    const overrides = await db
      .select()
      .from(availabilityOverrides)
      .where(and(
        gte(availabilityOverrides.date, startStr),
        lte(availabilityOverrides.date, endStr)
      ))
      .orderBy(asc(availabilityOverrides.date));

    // 3. Fetch bookings for the date range (with service info) — exclude cancelled
    const weekBookings = await db
      .select({ booking: bookings, service: services })
      .from(bookings)
      .innerJoin(services, eq(bookings.serviceId, services.id))
      .where(and(
        gte(bookings.bookingDate, startDate),
        lte(bookings.bookingDate, endDate),
        or(
          eq(bookings.status, 'pending'),
          eq(bookings.status, 'confirmed'),
          eq(bookings.status, 'completed'),
        )
      ))
      .orderBy(asc(bookings.bookingTime));

    // 4. Build 7 days
    const days = [];
    for (const dateStr of weekDateStrs) {
      const dayOfWeek = dayOfWeekFromDateStr(dateStr);

      // Resolve availability
      const dayOverrides = overrides.filter((o) => o.date === dateStr);
      let resolvedAvailability: {
        isOpen: boolean;
        slots: Array<{ startTime: string; endTime: string }>;
        source: 'default' | 'override';
        reason?: string | null;
      };

      if (dayOverrides.length > 0) {
        const hasClosed = dayOverrides.some((o) => o.isClosed);
        if (hasClosed) {
          resolvedAvailability = {
            isOpen: false,
            slots: [],
            source: 'override',
            reason: dayOverrides[0].reason,
          };
        } else {
          resolvedAvailability = {
            isOpen: true,
            slots: dayOverrides
              .filter((o) => o.startTime && o.endTime)
              .map((o) => ({
                startTime: o.startTime!.substring(0, 5),
                endTime: o.endTime!.substring(0, 5),
              })),
            source: 'override',
            reason: dayOverrides[0].reason,
          };
        }
      } else {
        const recurringSlots = recurringSchedule.filter((r) => r.dayOfWeek === dayOfWeek);
        if (recurringSlots.length > 0) {
          resolvedAvailability = {
            isOpen: true,
            slots: recurringSlots.map((r) => ({
              startTime: r.startTime.substring(0, 5),
              endTime: r.endTime.substring(0, 5),
            })),
            source: 'default',
          };
        } else {
          resolvedAvailability = { isOpen: false, slots: [], source: 'default' };
        }
      }

      // Filter bookings for this date
      const dayBookings = weekBookings
        .filter(({ booking }) => {
          const bDate = booking.bookingDate instanceof Date
            ? booking.bookingDate.toISOString().split('T')[0]
            : String(booking.bookingDate).split('T')[0];
          return bDate === dateStr;
        })
        .map(({ booking, service }) => ({
          id: booking.id,
          customerName: booking.customerName,
          customerEmail: booking.customerEmail,
          bookingTime: booking.bookingTime.substring(0, 5),
          status: booking.status,
          serviceName: service.name,
          serviceDuration: service.durationMinutes,
        }));

      days.push({
        date: dateStr,
        dayOfWeek,
        availability: resolvedAvailability,
        bookings: dayBookings,
      });
    }

    return days;
  } catch (error) {
    console.error('Calendar week error:', error);
    throw createError({ statusCode: 500, message: 'Erreur lors du chargement du calendrier' });
  }
});
