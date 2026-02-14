import { db } from '../../database';
import { availability } from '../../database/schema';
import { z } from 'zod';

const timeSlotSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Format HH:mm attendu'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Format HH:mm attendu'),
  isAvailable: z.boolean(),
});

const bodySchema = z.object({
  slots: z.array(timeSlotSchema),
});

export default defineEventHandler(async (event) => {
  await verifyAdminAccess(event);

  const body = await readBody(event);

  try {
    const { slots } = bodySchema.parse(body);

    // Validate each slot: endTime must be after startTime
    for (const slot of slots) {
      if (slot.startTime >= slot.endTime) {
        throw createError({
          statusCode: 400,
          message: `L'heure de fin doit être après l'heure de début (${slot.startTime} - ${slot.endTime})`,
        });
      }
    }

    // Atomic replace: delete all existing, insert new ones
    await db.transaction(async (tx) => {
      await tx.delete(availability);

      if (slots.length > 0) {
        await tx.insert(availability).values(
          slots.map((s) => ({
            dayOfWeek: s.dayOfWeek,
            startTime: s.startTime,
            endTime: s.endTime,
            isAvailable: s.isAvailable,
          }))
        );
      }
    });

    // Return the new state
    const updated = await db
      .select()
      .from(availability)
      .orderBy(availability.dayOfWeek, availability.startTime);

    return updated;
  } catch (error: any) {
    if (error.statusCode) throw error;
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        message: 'Données invalides',
        data: error.errors,
      });
    }
    console.error('Availability update error:', error);
    throw createError({
      statusCode: 500,
      message: 'Erreur lors de la mise à jour des disponibilités',
    });
  }
});
