import { pgTable, text, integer, timestamp, boolean, jsonb, serial, time, date } from 'drizzle-orm/pg-core';

// Service Categories (2 fixed: "Service" and "Supplément")
export const serviceCategories = pgTable('service_categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  displayOrder: integer('display_order').notNull().default(0),
  isAddon: boolean('is_addon').default(false).notNull(), // true = Supplément category
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Services
export const services = pgTable('services', {
  id: serial('id').primaryKey(),
  categoryId: integer('category_id').references(() => serviceCategories.id).notNull(),
  name: text('name').notNull(),
  description: text('description'),
  durationMinutes: integer('duration_minutes').notNull(),
  price: integer('price').notNull(), // Price in cents
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Bookings
export const bookings = pgTable('bookings', {
  id: serial('id').primaryKey(),
  serviceId: integer('service_id').references(() => services.id).notNull(),
  customerName: text('customer_name').notNull(),
  customerEmail: text('customer_email').notNull(),
  customerPhone: text('customer_phone'),
  bookingDate: timestamp('booking_date').notNull(),
  bookingTime: time('booking_time').notNull(),
  status: text('status').notNull().default('pending'), // pending, confirmed, cancelled, completed
  token: text('token').notNull().unique(), // Token for customer access
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Booking Add-ons (add-on services selected for a booking)
export const bookingAddons = pgTable('booking_addons', {
  id: serial('id').primaryKey(),
  bookingId: integer('booking_id').references(() => bookings.id, { onDelete: 'cascade' }).notNull(),
  serviceId: integer('service_id').references(() => services.id).notNull(),
  price: integer('price').notNull(), // Price at time of booking (in cents)
});

// Availability
export const availability = pgTable('availability', {
  id: serial('id').primaryKey(),
  dayOfWeek: integer('day_of_week').notNull(), // 0 = Sunday, 1 = Monday, etc.
  startTime: time('start_time').notNull(),
  endTime: time('end_time').notNull(),
  isAvailable: boolean('is_available').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Availability Overrides (date-specific exceptions to the recurring schedule)
export const availabilityOverrides = pgTable('availability_overrides', {
  id: serial('id').primaryKey(),
  date: date('date').notNull(), // The specific date (YYYY-MM-DD)
  isClosed: boolean('is_closed').default(false).notNull(), // If true, salon is closed this day
  startTime: time('start_time'), // Custom hours (null if isClosed=true)
  endTime: time('end_time'), // Custom hours (null if isClosed=true)
  reason: text('reason'), // Optional reason (ex: "Vacances", "Jour férié")
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Better Auth tables
export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
});

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expiresAt').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
});

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
});

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow(),
});

// Email Logs
export const emailLogs = pgTable('email_logs', {
  id: serial('id').primaryKey(),
  bookingId: integer('booking_id').references(() => bookings.id),
  emailType: text('email_type').notNull(), // confirmation, reminder
  sentAt: timestamp('sent_at').defaultNow().notNull(),
  status: text('status').notNull().default('sent'), // sent, failed
  errorMessage: text('error_message'),
});

// Salon Info
export const salonInfo = pgTable('salon_info', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  address: text('address'),
  phone: text('phone'),
  email: text('email'),
  openingHours: jsonb('opening_hours'), // JSON object with day: {open, close}
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Type exports
export type ServiceCategory = typeof serviceCategories.$inferSelect;
export type NewServiceCategory = typeof serviceCategories.$inferInsert;
export type Service = typeof services.$inferSelect;
export type NewService = typeof services.$inferInsert;
export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;
export type Availability = typeof availability.$inferSelect;
export type NewAvailability = typeof availability.$inferInsert;
export type EmailLog = typeof emailLogs.$inferSelect;
export type NewEmailLog = typeof emailLogs.$inferInsert;
export type SalonInfo = typeof salonInfo.$inferSelect;
export type NewSalonInfo = typeof salonInfo.$inferInsert;
export type AvailabilityOverride = typeof availabilityOverrides.$inferSelect;
export type NewAvailabilityOverride = typeof availabilityOverrides.$inferInsert;
export type BookingAddon = typeof bookingAddons.$inferSelect;
export type NewBookingAddon = typeof bookingAddons.$inferInsert;