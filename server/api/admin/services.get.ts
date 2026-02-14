import { db } from '../../database';
import { services, serviceCategories } from '../../database/schema';
import { eq, desc } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  try {
    const allServices = await db
      .select({
        id: services.id,
        categoryId: services.categoryId,
        name: services.name,
        description: services.description,
        durationMinutes: services.durationMinutes,
        price: services.price,
        isActive: services.isActive,
        category: {
          id: serviceCategories.id,
          name: serviceCategories.name,
          isAddon: serviceCategories.isAddon,
        },
      })
      .from(services)
      .leftJoin(serviceCategories, eq(services.categoryId, serviceCategories.id))
      .orderBy(desc(services.createdAt));

    return allServices;
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch services',
    });
  }
});
