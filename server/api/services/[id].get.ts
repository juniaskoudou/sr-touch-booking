import { db } from '../../database';
import { services } from '../../database/schema';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  
  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Service ID is required',
    });
  }

  try {
    const service = await db
      .select()
      .from(services)
      .where(eq(services.id, parseInt(id)))
      .limit(1);

    if (service.length === 0) {
      throw createError({
        statusCode: 404,
        message: 'Service not found',
      });
    }

    return service[0];
  } catch (error: any) {
    if (error.statusCode) {
      throw error;
    }
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch service',
    });
  }
});
