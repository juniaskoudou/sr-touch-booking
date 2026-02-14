import { getAvailableTimeSlots } from '../../utils/availability';
import { z } from 'zod';

const querySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  serviceId: z.string().transform(Number),
});

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  
  try {
    const { date, serviceId } = querySchema.parse(query);
    
    // Get service to know duration
    const { db } = await import('../../database');
    const { services } = await import('../../database/schema');
    const { eq } = await import('drizzle-orm');
    
    const service = await db
      .select()
      .from(services)
      .where(eq(services.id, serviceId))
      .limit(1);

    if (service.length === 0) {
      throw createError({
        statusCode: 404,
        message: 'Service not found',
      });
    }

    const bookingDate = new Date(date);
    const slots = await getAvailableTimeSlots(bookingDate, service[0].durationMinutes);

    return slots;
  } catch (error: any) {
    if (error.statusCode) {
      throw error;
    }
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        message: 'Invalid query parameters',
        data: error.errors,
      });
    }
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch availability',
    });
  }
});
