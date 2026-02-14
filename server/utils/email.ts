import { transporter } from './mail-client';
import type { Booking, Service } from '../database/schema';

const fromEmail = process.env.FROM_EMAIL || 'SR-TOUCH <noreply@sr-touch.com>';

// Inline translations for email (server-side can't use app/ imports)
const t = {
  salon: { name: 'SR-TOUCH' },
  email: {
    greeting: 'Bonjour',
    confirmationMessage: 'Votre réservation a été confirmée par le salon.',
    requestMessage: 'Votre demande de réservation a bien été reçue. Vous recevrez un email dès qu\'elle sera confirmée par le salon.',
    reminderMessage: 'Rappel : vous avez un rendez-vous demain.',
    bookingDetails: 'Détails de la réservation',
    service: 'Prestation',
    date: 'Date',
    time: 'Heure',
    manageBooking: 'Gérer ma réservation',
    footer: 'SR-TOUCH - Merci de votre confiance',
    confirmationSubject: 'Votre réservation est confirmée - SR-TOUCH',
    requestSubject: 'Demande de réservation reçue - SR-TOUCH',
    reminderSubject: 'Rappel de votre rendez-vous demain - SR-TOUCH',
  },
};

export async function sendBookingRequestEmail(booking: Booking, service: Service, bookingUrl: string) {
  const bookingDate = new Date(booking.bookingDate);
  const formattedDate = bookingDate.toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f8f9fa; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .booking-details { background-color: #f8f9fa; padding: 15px; margin: 20px 0; border-radius: 5px; }
          .button { display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
          .status-badge { display: inline-block; padding: 4px 12px; background-color: #fef3c7; color: #92400e; border-radius: 12px; font-weight: bold; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${t.salon.name}</h1>
          </div>
          <div class="content">
            <p>${t.email.greeting} ${booking.customerName},</p>
            <p>${t.email.requestMessage}</p>
            <p><span class="status-badge">⏳ En attente de confirmation</span></p>
            <div class="booking-details">
              <h3>${t.email.bookingDetails}</h3>
              <p><strong>${t.email.service}:</strong> ${service.name}</p>
              <p><strong>${t.email.date}:</strong> ${formattedDate}</p>
              <p><strong>${t.email.time}:</strong> ${booking.bookingTime}</p>
            </div>
            <a href="${bookingUrl}" class="button">${t.email.manageBooking}</a>
          </div>
          <div class="footer">
            <p>${t.email.footer}</p>
          </div>
        </div>
      </body>
    </html>
  `;

  try {
    const result = await transporter.sendMail({
      from: fromEmail,
      to: booking.customerEmail,
      subject: t.email.requestSubject,
      html,
    });

    return { success: true, id: result.messageId };
  } catch (error) {
    console.error('Error sending booking request email:', error);
    return { success: false, error };
  }
}

export async function sendConfirmationEmail(booking: Booking, service: Service, bookingUrl: string) {
  const bookingDate = new Date(booking.bookingDate);
  const formattedDate = bookingDate.toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f8f9fa; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .booking-details { background-color: #f8f9fa; padding: 15px; margin: 20px 0; border-radius: 5px; }
          .button { display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${t.salon.name}</h1>
          </div>
          <div class="content">
            <p>${t.email.greeting} ${booking.customerName},</p>
            <p>${t.email.confirmationMessage}</p>
            <div class="booking-details">
              <h3>${t.email.bookingDetails}</h3>
              <p><strong>${t.email.service}:</strong> ${service.name}</p>
              <p><strong>${t.email.date}:</strong> ${formattedDate}</p>
              <p><strong>${t.email.time}:</strong> ${booking.bookingTime}</p>
            </div>
            <a href="${bookingUrl}" class="button">${t.email.manageBooking}</a>
          </div>
          <div class="footer">
            <p>${t.email.footer}</p>
          </div>
        </div>
      </body>
    </html>
  `;

  try {
    const result = await transporter.sendMail({
      from: fromEmail,
      to: booking.customerEmail,
      subject: t.email.confirmationSubject,
      html,
    });

    return { success: true, id: result.messageId };
  } catch (error) {
    console.error('Error sending confirmation email:', error);
    return { success: false, error };
  }
}

export async function sendReminderEmail(booking: Booking, service: Service, bookingUrl: string) {
  const bookingDate = new Date(booking.bookingDate);
  const formattedDate = bookingDate.toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f8f9fa; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .booking-details { background-color: #f8f9fa; padding: 15px; margin: 20px 0; border-radius: 5px; }
          .button { display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${t.salon.name}</h1>
          </div>
          <div class="content">
            <p>${t.email.greeting} ${booking.customerName},</p>
            <p>${t.email.reminderMessage}</p>
            <div class="booking-details">
              <h3>${t.email.bookingDetails}</h3>
              <p><strong>${t.email.service}:</strong> ${service.name}</p>
              <p><strong>${t.email.date}:</strong> ${formattedDate}</p>
              <p><strong>${t.email.time}:</strong> ${booking.bookingTime}</p>
            </div>
            <a href="${bookingUrl}" class="button">${t.email.manageBooking}</a>
          </div>
          <div class="footer">
            <p>${t.email.footer}</p>
          </div>
        </div>
      </body>
    </html>
  `;

  try {
    const result = await transporter.sendMail({
      from: fromEmail,
      to: booking.customerEmail,
      subject: t.email.reminderSubject,
      html,
    });

    return { success: true, id: result.messageId };
  } catch (error) {
    console.error('Error sending reminder email:', error);
    return { success: false, error };
  }
}
