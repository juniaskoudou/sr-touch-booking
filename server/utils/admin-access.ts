import { auth } from '../auth';
import type { H3Event } from 'h3';

const allowedEmail = () => (process.env.SMTP_USER || '').toLowerCase();

export async function verifyAdminAccess(event: H3Event): Promise<{ id: string; email: string; name?: string }> {
  const session = await auth.api.getSession({
    headers: event.headers,
  });

  if (!session?.user) {
    throw createError({
      statusCode: 401,
      message: 'Non authentifié',
    });
  }

  // Only the SMTP_USER email is allowed
  if (session.user.email.toLowerCase() !== allowedEmail()) {
    throw createError({
      statusCode: 403,
      message: 'Accès refusé',
    });
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name || undefined,
  };
}
