import { db } from '../../database';
import { services, serviceCategories } from '../../database/schema';
import { eq, and } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  try {
    // Fetch active services from addon categories only
    const addonServices = await db
      .select({
        id: services.id,
        name: services.name,
        description: services.description,
        durationMinutes: services.durationMinutes,
        price: services.price,
        category: {
          id: serviceCategories.id,
          name: serviceCategories.name,
        },
      })
      .from(services)
      .innerJoin(serviceCategories, eq(services.categoryId, serviceCategories.id))
      .where(
        and(
          eq(services.isActive, true),
          eq(serviceCategories.isAddon, true)
        )
      )
      .orderBy(serviceCategories.displayOrder, services.name);

    return addonServices;
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch add-on services',
    });
  }
});
