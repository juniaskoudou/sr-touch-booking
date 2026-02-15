import { db } from '../../database';
import { availability, availabilityOverrides, bookings } from '../../database/schema';
import { eq, and, gte, lte, or, asc } from 'drizzle-orm';
import { parse, addMinutes } from 'date-fns';
import { z } from 'zod';

const querySchema = z.object({
  serviceId: z.string().transform(Number),
  days: z.string().transform(Number).optional().default('30'),
});

/**
 * Generate an array of YYYY-MM-DD strings from startDateStr for `count` days.
 * Uses UTC noon to avoid any timezone day-shift issues.
 */
function generateDateStrings(startDateStr: string, count: number): string[] {
  const dates: string[] = [];
  const d = new Date(startDateStr + 'T12:00:00Z');
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

function getTomorrowStr(): string {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const y = tomorrow.getFullYear();
  const m = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const d = String(tomorrow.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event);

  try {
    const { serviceId, days } = querySchema.parse(query);

    // Get service duration
    const { services } = await import('../../database/schema');
    const service = await db
      .select()
      .from(services)
      .where(eq(services.id, serviceId))
      .limit(1);

    if (service.length === 0) {
      throw createError({ statusCode: 404, message: 'Service not found' });
    }

    const serviceDuration = service[0].durationMinutes;

    // Date range: tomorrow → tomorrow + days (all as YYYY-MM-DD strings)
    const startStr = getTomorrowStr();
    const allDateStrs = generateDateStrings(startStr, days);
    const endStr = allDateStrs[allDateStrs.length - 1];

    // Fetch recurring weekly schedule
    const recurringSchedule = await db
      .select()
      .from(availability)
      .where(eq(availability.isAvailable, true))
      .orderBy(asc(availability.dayOfWeek));

    // Fetch all overrides in range
    const overrides = await db
      .select()
      .from(availabilityOverrides)
      .where(and(
        gte(availabilityOverrides.date, startStr),
        lte(availabilityOverrides.date, endStr)
      ));

    // Fetch all bookings in range (pending + confirmed)
    const rangeStart = new Date(startStr + 'T00:00:00Z');
    const rangeEnd = new Date(endStr + 'T23:59:59.999Z');

    const existingBookings = await db
      .select()
      .from(bookings)
      .where(and(
        gte(bookings.bookingDate, rangeStart),
        lte(bookings.bookingDate, rangeEnd),
        or(eq(bookings.status, 'confirmed'), eq(bookings.status, 'pending'))
      ));

    // Build a map of recurring schedule by day of week
    const recurringByDay = new Map<number, Array<{ startTime: string; endTime: string }>>();
    for (const r of recurringSchedule) {
      const daySlots = recurringByDay.get(r.dayOfWeek) || [];
      daySlots.push({
        startTime: r.startTime.substring(0, 5),
        endTime: r.endTime.substring(0, 5),
      });
      recurringByDay.set(r.dayOfWeek, daySlots);
    }

    // Build override map by date string
    const overridesByDate = new Map<string, typeof overrides>();
    for (const o of overrides) {
      const dateOverrides = overridesByDate.get(o.date) || [];
      dateOverrides.push(o);
      overridesByDate.set(o.date, dateOverrides);
    }

    // Build bookings map by date string (extract YYYY-MM-DD from bookingDate)
    const bookingsByDate = new Map<string, typeof existingBookings>();
    for (const b of existingBookings) {
      // bookingDate is a timestamp — extract the date part safely
      const bDate = b.bookingDate instanceof Date
        ? b.bookingDate.toISOString().split('T')[0]
        : String(b.bookingDate).split('T')[0];
      const dateBookings = bookingsByDate.get(bDate) || [];
      dateBookings.push(b);
      bookingsByDate.set(bDate, dateBookings);
    }

    // Process each date
    const result: Array<{
      date: string;
      isOpen: boolean;
      hasAvailableSlots: boolean;
    }> = [];

    for (const dateStr of allDateStrs) {
      const dayOfWeek = dayOfWeekFromDateStr(dateStr);
      const dateOverrides = overridesByDate.get(dateStr) || [];

      let daySlots: Array<{ startTime: string; endTime: string }> = [];
      let isOpen = false;

      if (dateOverrides.length > 0) {
        // Check overrides first
        if (dateOverrides.some(o => o.isClosed)) {
          // Day is explicitly closed
          continue;
        }
        // Collect custom slots
        for (const o of dateOverrides) {
          if (o.startTime && o.endTime) {
            daySlots.push({
              startTime: o.startTime.substring(0, 5),
              endTime: o.endTime.substring(0, 5),
            });
          }
        }
        isOpen = daySlots.length > 0;
      } else {
        // Fall back to recurring schedule
        daySlots = recurringByDay.get(dayOfWeek) || [];
        isOpen = daySlots.length > 0;
      }

      if (!isOpen) continue;

      // Check if there's at least one available slot
      const dateBookings = bookingsByDate.get(dateStr) || [];
      let hasAvailableSlots = false;

      for (const avail of daySlots) {
        const startTime = parse(avail.startTime, 'HH:mm', new Date());
        const endTime = parse(avail.endTime, 'HH:mm', new Date());
        let currentTime = startTime;

        while (addMinutes(currentTime, serviceDuration) <= endTime) {
          const slotEnd = addMinutes(currentTime, serviceDuration);

          const isBooked = dateBookings.some((booking) => {
            const bookingTime = parse(booking.bookingTime, 'HH:mm:ss', new Date());
            const bookingEnd = addMinutes(bookingTime, serviceDuration);
            return (
              (currentTime >= bookingTime && currentTime < bookingEnd) ||
              (slotEnd > bookingTime && slotEnd <= bookingEnd) ||
              (currentTime <= bookingTime && slotEnd >= bookingEnd)
            );
          });

          if (!isBooked) {
            hasAvailableSlots = true;
            break;
          }

          currentTime = addMinutes(currentTime, 30);
        }

        if (hasAvailableSlots) break;
      }

      result.push({ date: dateStr, isOpen: true, hasAvailableSlots });
    }

    return result;
  } catch (error: any) {
    if (error.statusCode) throw error;
    if (error instanceof z.ZodError) {
      throw createError({ statusCode: 400, message: 'Invalid parameters', data: error.errors });
    }
    throw createError({ statusCode: 500, message: 'Failed to fetch open dates' });
  }
});
