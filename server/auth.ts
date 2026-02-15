import { betterAuth, APIError } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { magicLink } from 'better-auth/plugins/magic-link';
import { db } from './database';
import { transporter } from './utils/mail-client';

function isAllowedEmail(email: string): boolean {
  const allowed = process.env.SMTP_USER || '';
  return !!allowed && email.toLowerCase() === allowed.toLowerCase();
}

// Resolve the base URL: explicit BASE_URL > NUXT_BASE_URL > Vercel auto-URL > localhost
function getBaseURL(): string {
  if (process.env.BASE_URL) return process.env.BASE_URL;
  if (process.env.NUXT_BASE_URL) return process.env.NUXT_BASE_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

const baseURL = getBaseURL();

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
  }),
  emailAndPassword: {
    enabled: false,
  },
  trustedOrigins: [baseURL],
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        // Double-check: only allow the SMTP_USER to receive magic links
        if (!isAllowedEmail(email)) {
          throw new APIError('FORBIDDEN', { message: 'Adresse email non autorisée' });
        }

        try {
          await transporter.sendMail({
            from: process.env.FROM_EMAIL || 'SR-TOUCH <noreply@sr-touch.com>',
            to: email,
            subject: 'Connexion à SR-TOUCH Admin',
            html: `
              <!DOCTYPE html>
              <html>
                <head>
                  <meta charset="utf-8">
                  <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .button { display: inline-block; padding: 12px 24px; background-color: #18181b; color: white; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: 500; }
                    .footer { margin-top: 30px; font-size: 12px; color: #999; }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <h1>Connexion à SR-TOUCH Admin</h1>
                    <p>Cliquez sur le bouton ci-dessous pour vous connecter à votre espace d'administration :</p>
                    <a href="${url}" class="button">Se connecter</a>
                    <p class="footer">Ce lien expire dans 5 minutes. Si vous n'avez pas demandé ce lien, vous pouvez ignorer cet email.</p>
                  </div>
                </body>
              </html>
            `,
          });
        } catch (error) {
          console.error('Error sending magic link email:', error);
          throw error;
        }
      },
      disableSignUp: false,
      expiresIn: 60 * 5, // 5 minutes
    }),
  ],
  hooks: {
    user: {
      create: {
        before: async (user) => {
          // Only allow the SMTP_USER to create an account
          if (!isAllowedEmail(user.email)) {
            return false; // Block user creation entirely
          }
        },
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  baseURL,
  basePath: '/api/auth',
});
