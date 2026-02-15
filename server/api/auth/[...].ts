import { auth } from '../../auth';

export default defineEventHandler(async (event) => {
  try {
    return await auth.handler(toWebRequest(event));
  } catch (error) {
    console.error('[Auth Handler Error]', error);
    throw error;
  }
});
