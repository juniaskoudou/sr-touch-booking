import { db } from '../../database';
import { services, serviceCategories } from '../../database/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const createServiceSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  description: z.string().optional(),
  price: z.union([z.number(), z.string()]).transform((val) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    if (isNaN(num) || num <= 0) {
      throw new Error('Le prix doit être un nombre positif');
    }
    return num;
  }),
  durationMinutes: z.number().int().min(0).optional().default(0),
  isAddon: z.boolean().default(false), // true = Supplément, false = Service
});

export default defineEventHandler(async (event) => {
  await verifyAdminAccess(event);

  const body = await readBody(event);

  try {
    const data = createServiceSchema.parse(body);

    // Get the right category based on isAddon
    const categoryName = data.isAddon ? 'Supplément' : 'Service';
    const category = await db
      .select()
      .from(serviceCategories)
      .where(eq(serviceCategories.name, categoryName))
      .limit(1);

    if (category.length === 0) {
      throw createError({ statusCode: 500, message: `Category "${categoryName}" not found` });
    }

    const priceInCents = Math.round(data.price * 100);

    const [service] = await db
      .insert(services)
      .values({
        categoryId: category[0].id,
        name: data.name,
        description: data.description || null,
        durationMinutes: data.durationMinutes,
        price: priceInCents,
        isActive: true,
      })
      .returning();

    return service;
  } catch (error: any) {
    if (error.statusCode) throw error;
    if (error instanceof z.ZodError) {
      throw createError({ statusCode: 400, message: 'Données invalides', data: error.errors });
    }
    throw createError({ statusCode: 500, message: 'Failed to create service' });
  }
});
