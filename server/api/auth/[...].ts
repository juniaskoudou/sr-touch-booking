// Auth routes - disabled for dev, will be enabled later
export default defineEventHandler(async (event) => {
  return { message: 'Auth disabled for development' };
});
