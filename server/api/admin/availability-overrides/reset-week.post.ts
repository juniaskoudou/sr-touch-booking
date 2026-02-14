import { db } from '../../../database';
import { availabilityOverrides } from '../../../database/schema';
import { and, gte, lte } from 'drizzle-orm';
import { z } from 'zod';

const bodySchema = z.object({
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export default defineEventHandler(async (event) => {
  await verifyAdminAccess(event);

  const body = await readBody(event);

  try {
    const { start } = bodySchema.parse(body);

    const endDate = new Date(start + 'T00:00:00');
    endDate.setDate(endDate.getDate() + 6);
    const end = endDate.toISOString().split('T')[0];

    const deleted = await db
      .delete(availabilityOverrides)
      .where(and(
        gte(availabilityOverrides.date, start),
        lte(availabilityOverrides.date, end)
      ))
      .returning();

    return { success: true, deletedCount: deleted.length };
  } catch (error: any) {
    if (error.statusCode) throw error;
    console.error('Reset week error:', error);
    throw createError({ statusCode: 500, message: 'Erreur lors de la réinitialisation' });
  }
});
