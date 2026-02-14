import { db } from '../../database';
import { availability, availabilityOverrides, bookings } from '../../database/schema';
import { eq, and, gte, lte, or, asc } from 'drizzle-orm';
import { format, parse, addMinutes, eachDayOfInterval, addDays, startOfDay } from 'date-fns';
import { z } from 'zod';

const querySchema = z.object({
  serviceId: z.string().transform(Number),
  days: z.string().transform(Number).optional().default('30'),
});

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

    // Date range: tomorrow → tomorrow + days
    const tomorrow = addDays(startOfDay(new Date()), 1);
    const endDate = addDays(tomorrow, days);
    const allDates = eachDayOfInterval({ start: tomorrow, end: endDate });

    // Fetch recurring weekly schedule
    const recurringSchedule = await db
      .select()
      .from(availability)
      .where(eq(availability.isAvailable, true))
      .orderBy(asc(availability.dayOfWeek));

    // Fetch all overrides in range
    const startStr = format(tomorrow, 'yyyy-MM-dd');
    const endStr = format(endDate, 'yyyy-MM-dd');

    const overrides = await db
      .select()
      .from(availabilityOverrides)
      .where(and(
        gte(availabilityOverrides.date, startStr),
        lte(availabilityOverrides.date, endStr)
      ));

    // Fetch all bookings in range (pending + confirmed)
    const existingBookings = await db
      .select()
      .from(bookings)
      .where(and(
        gte(bookings.bookingDate, tomorrow),
        lte(bookings.bookingDate, endDate),
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

    // Build bookings map by date string
    const bookingsByDate = new Map<string, typeof existingBookings>();
    for (const b of existingBookings) {
      const dateStr = format(b.bookingDate, 'yyyy-MM-dd');
      const dateBookings = bookingsByDate.get(dateStr) || [];
      dateBookings.push(b);
      bookingsByDate.set(dateStr, dateBookings);
    }

    // Process each date
    const result: Array<{
      date: string;
      isOpen: boolean;
      hasAvailableSlots: boolean;
    }> = [];

    for (const date of allDates) {
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayOfWeek = date.getDay();
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
