import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from './database';
import { transporter } from './utils/mail-client';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
  }),
  emailAndPassword: {
    enabled: false,
  },
  magicLink: {
    enabled: true,
    sendMagicLink: async ({ email, url }) => {
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
                  .button { display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                </style>
              </head>
              <body>
                <div class="container">
                  <h1>Connexion à SR-TOUCH Admin</h1>
                  <p>Cliquez sur le lien ci-dessous pour vous connecter :</p>
                  <a href="${url}" class="button">Se connecter</a>
                  <p>Ce lien expire dans 24 heures.</p>
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
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  baseURL: process.env.BASE_URL || 'http://localhost:3000',
  basePath: '/api/auth',
});
