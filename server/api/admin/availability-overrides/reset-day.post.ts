import { db } from '../../../database';
import { availabilityOverrides } from '../../../database/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const bodySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export default defineEventHandler(async (event) => {
  await verifyAdminAccess(event);

  const body = await readBody(event);

  try {
    const { date } = bodySchema.parse(body);

    const deleted = await db
      .delete(availabilityOverrides)
      .where(eq(availabilityOverrides.date, date))
      .returning();

    return { success: true, deletedCount: deleted.length };
  } catch (error: any) {
    if (error.statusCode) throw error;
    console.error('Reset day error:', error);
    throw createError({ statusCode: 500, message: 'Erreur lors de la réinitialisation' });
  }
});
