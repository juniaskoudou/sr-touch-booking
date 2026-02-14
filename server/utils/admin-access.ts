// Admin access utility - auth disabled for dev
// Will be enabled later when auth is configured

export async function verifyAdminAccess(event: any): Promise<{ id: string; email: string; name?: string }> {
  // Auth disabled for dev - just return a mock user
  return {
    id: 'dev-user',
    email: 'dev@sr-touch.com',
    name: 'Dev User',
  };
}
