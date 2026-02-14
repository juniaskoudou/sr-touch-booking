import { db } from '../../../database';
import { services } from '../../../database/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const updateServiceSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').optional(),
  description: z.string().optional().nullable(),
  price: z.union([z.number(), z.string()]).transform((val) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    if (isNaN(num) || num <= 0) {
      throw new Error('Le prix doit être un nombre positif');
    }
    return num;
  }).optional(),
  durationMinutes: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export default defineEventHandler(async (event) => {
  await verifyAdminAccess(event);

  const id = parseInt(getRouterParam(event, 'id') || '');
  if (isNaN(id)) {
    throw createError({ statusCode: 400, message: 'ID invalide' });
  }

  const body = await readBody(event);

  try {
    const data = updateServiceSchema.parse(body);

    // Check if service exists
    const existing = await db.select().from(services).where(eq(services.id, id)).limit(1);
    if (existing.length === 0) {
      throw createError({ statusCode: 404, message: 'Prestation introuvable' });
    }

    const updateData: Record<string, any> = { updatedAt: new Date() };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description || null;
    if (data.price !== undefined) updateData.price = Math.round(data.price * 100);
    if (data.durationMinutes !== undefined) updateData.durationMinutes = data.durationMinutes;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const [updated] = await db
      .update(services)
      .set(updateData)
      .where(eq(services.id, id))
      .returning();

    return updated;
  } catch (error: any) {
    if (error.statusCode) throw error;
    if (error instanceof z.ZodError) {
      throw createError({ statusCode: 400, message: 'Données invalides', data: error.errors });
    }
    throw createError({ statusCode: 500, message: 'Erreur lors de la mise à jour' });
  }
});
