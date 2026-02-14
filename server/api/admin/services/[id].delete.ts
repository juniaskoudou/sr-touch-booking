import { db } from '../../../database';
import { services, bookings } from '../../../database/schema';
import { eq, and, or } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  await verifyAdminAccess(event);

  const id = parseInt(getRouterParam(event, 'id') || '');
  if (isNaN(id)) {
    throw createError({ statusCode: 400, message: 'ID invalide' });
  }

  try {
    // Check if service exists
    const existing = await db.select().from(services).where(eq(services.id, id)).limit(1);
    if (existing.length === 0) {
      throw createError({ statusCode: 404, message: 'Prestation introuvable' });
    }

    // Check if there are active bookings for this service
    const activeBookings = await db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.serviceId, id),
          or(eq(bookings.status, 'pending'), eq(bookings.status, 'confirmed'))
        )
      )
      .limit(1);

    if (activeBookings.length > 0) {
      throw createError({
        statusCode: 409,
        message: 'Impossible de supprimer cette prestation car elle a des réservations en cours. Désactivez-la plutôt.',
      });
    }

    await db.delete(services).where(eq(services.id, id));

    return { success: true };
  } catch (error: any) {
    if (error.statusCode) throw error;
    throw createError({ statusCode: 500, message: 'Erreur lors de la suppression' });
  }
});
