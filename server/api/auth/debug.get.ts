import { sql } from 'drizzle-orm';

export default defineEventHandler(async () => {
  // Temporary debug endpoint - REMOVE after fixing the issue
  const checks: Record<string, any> = {};

  // Check env vars (only show if set, never show values)
  checks.env = {
    DATABASE_URL: !!process.env.DATABASE_URL,
    BETTER_AUTH_SECRET: !!process.env.BETTER_AUTH_SECRET,
    SMTP_HOST: process.env.SMTP_HOST || '(not set, defaults to smtp.gmail.com)',
    SMTP_USER: !!process.env.SMTP_USER,
    SMTP_PASS: !!process.env.SMTP_PASS,
    SMTP_PORT: process.env.SMTP_PORT || '(not set, defaults to 587)',
    BASE_URL: process.env.BASE_URL || '(not set)',
    VERCEL_URL: process.env.VERCEL_URL || '(not set)',
    VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL || '(not set)',
    NODE_ENV: process.env.NODE_ENV || '(not set)',
  };

  // Check DB connection
  try {
    const { db } = await import('../../database');
    await db.execute(sql`SELECT 1`);
    checks.database = 'connected';
  } catch (error: any) {
    checks.database = `error: ${error.message}`;
  }

  // Check if better-auth can be imported and show resolved baseURL
  try {
    const { auth } = await import('../../auth');
    checks.auth = 'loaded';
    checks.resolvedBaseURL = auth.options.baseURL;
  } catch (error: any) {
    checks.auth = `error: ${error.message}`;
  }

  return checks;
});
