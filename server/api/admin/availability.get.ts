import { db } from '../../database';
import { availability } from '../../database/schema';
import { asc } from 'drizzle-orm';

export default defineEventHandler(async () => {
  try {
    const records = await db
      .select()
      .from(availability)
      .orderBy(asc(availability.dayOfWeek), asc(availability.startTime));

    return records;
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch availability',
    });
  }
});
