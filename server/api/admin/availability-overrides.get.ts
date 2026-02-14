import { db } from '../../database';
import { availabilityOverrides } from '../../database/schema';
import { asc, gte } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  await verifyAdminAccess(event);

  const query = getQuery(event);

  try {
    // Optionally filter from a date onwards (default: today)
    const fromDate = (query.from as string) || new Date().toISOString().split('T')[0];

    const overrides = await db
      .select()
      .from(availabilityOverrides)
      .where(gte(availabilityOverrides.date, fromDate))
      .orderBy(asc(availabilityOverrides.date));

    return overrides;
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch availability overrides',
    });
  }
});
