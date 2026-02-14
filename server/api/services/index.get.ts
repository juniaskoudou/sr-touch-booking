import { db } from '../../database';
import { services, serviceCategories } from '../../database/schema';
import { eq, and } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  try {
    // Only fetch services from NON-addon categories
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
          displayOrder: serviceCategories.displayOrder,
        },
      })
      .from(services)
      .innerJoin(serviceCategories, eq(services.categoryId, serviceCategories.id))
      .where(
        and(
          eq(services.isActive, true),
          eq(serviceCategories.isAddon, false)
        )
      )
      .orderBy(serviceCategories.displayOrder, services.name);

    // Group by category
    const grouped = allServices.reduce((acc, service) => {
      const categoryName = service.category.name;
      if (!acc[categoryName]) {
        acc[categoryName] = {
          category: service.category,
          services: [],
        };
      }
      acc[categoryName].services.push({
        id: service.id,
        name: service.name,
        description: service.description,
        durationMinutes: service.durationMinutes,
        price: service.price,
      });
      return acc;
    }, {} as Record<string, any>);

    return Object.values(grouped);
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch services',
    });
  }
});
