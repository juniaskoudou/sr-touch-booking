export default defineNuxtRouteMiddleware(async (to) => {
  // Only protect admin routes (except login)
  if (!to.path.startsWith('/admin') || to.path === '/admin/login') {
    return;
  }

  try {
    const session = await $fetch<{ user?: { email?: string } }>('/api/auth/get-session', {
      headers: import.meta.server ? useRequestHeaders(['cookie']) : undefined,
    });

    if (!session?.user?.email) {
      return navigateTo('/admin/login');
    }

    // Server-side: verify the email matches SMTP_USER
    if (import.meta.server) {
      const allowedEmail = process.env.SMTP_USER || '';
      if (!allowedEmail || session.user.email.toLowerCase() !== allowedEmail.toLowerCase()) {
        return navigateTo('/admin/login');
      }
    }
  } catch {
    return navigateTo('/admin/login');
  }
});
