import { db } from '../../database';
import { bookings, services, bookingAddons, serviceCategories } from '../../database/schema';
import { eq, inArray } from 'drizzle-orm';
import { generateToken } from '../../utils/auth';
import { sendBookingRequestEmail, sendAdminNewBookingNotification } from '../../utils/email';
import { z } from 'zod';

const bookingSchema = z.object({
  serviceId: z.number(),
  customerName: z.string().min(1),
  customerEmail: z.string().email(),
  customerPhone: z.string().optional(),
  bookingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  bookingTime: z.string().regex(/^\d{2}:\d{2}$/),
  addonIds: z.array(z.number()).optional().default([]),
});

export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  try {
    const data = bookingSchema.parse(body);

    // Verify main service exists and is NOT an addon
    const service = await db
      .select({ service: services, category: serviceCategories })
      .from(services)
      .innerJoin(serviceCategories, eq(services.categoryId, serviceCategories.id))
      .where(eq(services.id, data.serviceId))
      .limit(1);

    if (service.length === 0) {
      throw createError({ statusCode: 404, message: 'Service not found' });
    }

    if (service[0].category.isAddon) {
      throw createError({ statusCode: 400, message: 'Cannot book an add-on service directly' });
    }

    // Verify add-on services exist and belong to addon categories
    let selectedAddons: any[] = [];
    if (data.addonIds.length > 0) {
      const addons = await db
        .select({ service: services, category: serviceCategories })
        .from(services)
        .innerJoin(serviceCategories, eq(services.categoryId, serviceCategories.id))
        .where(inArray(services.id, data.addonIds));

      const nonAddons = addons.filter(a => !a.category.isAddon);
      if (nonAddons.length > 0) {
        throw createError({ statusCode: 400, message: 'Some selected services are not add-ons' });
      }

      selectedAddons = addons.map(a => a.service);
    }

    // Create booking
    const token = generateToken();
    const bookingDate = new Date(`${data.bookingDate}T${data.bookingTime}:00`);

    const [booking] = await db
      .insert(bookings)
      .values({
        serviceId: data.serviceId,
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        customerPhone: data.customerPhone || null,
        bookingDate,
        bookingTime: `${data.bookingTime}:00`,
        status: 'pending',
        token,
      })
      .returning();

    // Insert booking add-ons
    if (selectedAddons.length > 0) {
      await db.insert(bookingAddons).values(
        selectedAddons.map(addon => ({
          bookingId: booking.id,
          serviceId: addon.id,
          price: addon.price,
        }))
      );
    }

    // Send "booking request received" email (non-blocking)
    const baseUrl = process.env.BASE_URL || getRequestURL(event).origin;
    const bookingUrl = `${baseUrl}/booking/${token}`;

    try {
      await sendBookingRequestEmail(booking, service[0].service, bookingUrl);
    } catch (emailErr) {
      console.error('Email sending failed (booking still created):', emailErr);
    }

    // Notify admin (salon owner) about the new booking
    const adminUrl = `${baseUrl}/admin/bookings`;
    try {
      await sendAdminNewBookingNotification(booking, service[0].service, adminUrl);
    } catch (emailErr) {
      console.error('Admin notification email failed:', emailErr);
    }

    return {
      booking,
      token,
      bookingUrl,
    };
  } catch (error: any) {
    if (error.statusCode) throw error;
    if (error instanceof z.ZodError) {
      throw createError({ statusCode: 400, message: 'Invalid booking data', data: error.errors });
    }
    throw createError({ statusCode: 500, message: 'Failed to create booking' });
  }
});
