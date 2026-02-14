import { db } from '../../../database';
import { availabilityOverrides } from '../../../database/schema';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  await verifyAdminAccess(event);

  const id = parseInt(getRouterParam(event, 'id') || '');

  if (isNaN(id)) {
    throw createError({
      statusCode: 400,
      message: 'ID invalide',
    });
  }

  try {
    const deleted = await db
      .delete(availabilityOverrides)
      .where(eq(availabilityOverrides.id, id))
      .returning();

    if (deleted.length === 0) {
      throw createError({
        statusCode: 404,
        message: 'Exception non trouvée',
      });
    }

    return { success: true };
  } catch (error: any) {
    if (error.statusCode) throw error;
    throw createError({
      statusCode: 500,
      message: 'Erreur lors de la suppression',
    });
  }
});
