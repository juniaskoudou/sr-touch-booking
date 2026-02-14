import { db } from '../database';
import { availability, availabilityOverrides, bookings } from '../database/schema';
import { eq, and, gte, lte, or } from 'drizzle-orm';
import { format, addMinutes, parse } from 'date-fns';

export interface TimeSlot {
  time: string;
  available: boolean;
}

/**
 * Get available time slots for a given date and service duration.
 *
 * Priority:
 * 1. Check for date-specific overrides (closed day or custom hours)
 * 2. Fall back to recurring weekly schedule
 * 3. Subtract already-booked slots
 */
export async function getAvailableTimeSlots(date: Date, serviceDurationMinutes: number) {
  const dateStr = format(date, 'yyyy-MM-dd');
  const dayOfWeek = date.getDay();

  // 1. Check for date-specific overrides (may be multiple rows — one per slot)
  const overrides = await db
    .select()
    .from(availabilityOverrides)
    .where(eq(availabilityOverrides.date, dateStr));

  let daySlots: Array<{ startTime: string; endTime: string }> = [];

  if (overrides.length > 0) {
    // If any override marks the day as closed, no slots
    if (overrides.some((o) => o.isClosed)) {
      return [];
    }

    // Collect all custom time slots from overrides
    for (const override of overrides) {
      if (override.startTime && override.endTime) {
        daySlots.push({
          startTime: override.startTime.substring(0, 5),
          endTime: override.endTime.substring(0, 5),
        });
      }
    }
  }

  // 2. If no overrides produced slots, fall back to recurring weekly schedule
  if (daySlots.length === 0 && overrides.length === 0) {
    const dayAvailability = await db
      .select()
      .from(availability)
      .where(and(
        eq(availability.dayOfWeek, dayOfWeek),
        eq(availability.isAvailable, true)
      ));

    if (dayAvailability.length === 0) {
      return [];
    }

    daySlots = dayAvailability.map((a) => ({
      startTime: a.startTime.substring(0, 5),
      endTime: a.endTime.substring(0, 5),
    }));
  }

  if (daySlots.length === 0) {
    return [];
  }

  // 3. Get existing bookings for this date
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  // Block slots for both pending and confirmed bookings
  const existingBookings = await db
    .select()
    .from(bookings)
    .where(and(
      gte(bookings.bookingDate, startOfDay),
      lte(bookings.bookingDate, endOfDay),
      or(eq(bookings.status, 'confirmed'), eq(bookings.status, 'pending'))
    ));

  // 4. Generate time slots and filter out booked ones
  const slots: TimeSlot[] = [];

  for (const avail of daySlots) {
    const startTime = parse(avail.startTime, 'HH:mm', new Date());
    const endTime = parse(avail.endTime, 'HH:mm', new Date());

    let currentTime = startTime;

    while (addMinutes(currentTime, serviceDurationMinutes) <= endTime) {
      const timeStr = format(currentTime, 'HH:mm');
      const slotEnd = addMinutes(currentTime, serviceDurationMinutes);

      // Check if this slot conflicts with existing bookings
      const isBooked = existingBookings.some((booking) => {
        const bookingTime = parse(booking.bookingTime, 'HH:mm:ss', new Date());
        const bookingEnd = addMinutes(bookingTime, serviceDurationMinutes);

        return (
          (currentTime >= bookingTime && currentTime < bookingEnd) ||
          (slotEnd > bookingTime && slotEnd <= bookingEnd) ||
          (currentTime <= bookingTime && slotEnd >= bookingEnd)
        );
      });

      slots.push({
        time: timeStr,
        available: !isBooked,
      });

      currentTime = addMinutes(currentTime, 30); // 30-minute intervals
    }
  }

  return slots;
}
