import { db } from '../../database';
import { availabilityOverrides } from '../../database/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const slotSchema = z.object({
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
});

const bodySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format YYYY-MM-DD attendu'),
  isClosed: z.boolean(),
  slots: z.array(slotSchema).optional().default([]),
  reason: z.string().optional().nullable(),
});

export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  try {
    const data = bodySchema.parse(body);

    // If not closed, at least one slot is required
    if (!data.isClosed && data.slots.length === 0) {
      throw createError({
        statusCode: 400,
        message: 'Au moins un créneau est requis si le salon est ouvert',
      });
    }

    // Validate slots
    if (!data.isClosed) {
      for (const slot of data.slots) {
        if (slot.startTime >= slot.endTime) {
          throw createError({
            statusCode: 400,
            message: `L'heure de fin doit être après l'heure de début (${slot.startTime} → ${slot.endTime})`,
          });
        }
      }
    }

    // Atomic upsert: delete all overrides for this date, then insert new ones
    await db.transaction(async (tx) => {
      await tx.delete(availabilityOverrides).where(eq(availabilityOverrides.date, data.date));

      if (data.isClosed) {
        await tx.insert(availabilityOverrides).values({
          date: data.date,
          isClosed: true,
          startTime: null,
          endTime: null,
          reason: data.reason || null,
        });
      } else {
        for (const slot of data.slots) {
          await tx.insert(availabilityOverrides).values({
            date: data.date,
            isClosed: false,
            startTime: slot.startTime,
            endTime: slot.endTime,
            reason: data.reason || null,
          });
        }
      }
    });

    return { success: true };
  } catch (error: any) {
    if (error.statusCode) throw error;
    if (error instanceof z.ZodError) {
      throw createError({ statusCode: 400, message: 'Données invalides' });
    }
    console.error('Override save error:', error);
    throw createError({ statusCode: 500, message: 'Erreur lors de la sauvegarde' });
  }
});
