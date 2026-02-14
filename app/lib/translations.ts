// French translations for the SR-TOUCH booking system

export const t = {
  // Common
  common: {
    choose: 'Choisir',
    confirm: 'Confirmer',
    cancel: 'Annuler',
    save: 'Enregistrer',
    delete: 'Supprimer',
    edit: 'Modifier',
    back: 'Retour',
    next: 'Suivant',
    close: 'Fermer',
    loading: 'Chargement...',
    error: 'Erreur',
    success: 'Succès',
  },

  // Booking
  booking: {
    bookAppointment: 'Prendre RDV',
    selectService: 'Choisir la prestation',
    selectDate: 'Sélectionner la date',
    selectTime: 'Sélectionner l\'heure',
    customerInfo: 'Vos informations',
    customerName: 'Nom',
    customerEmail: 'Email',
    confirmBooking: 'Réserver',
    bookingConfirmed: 'Réservation confirmée',
    bookingPending: 'Demande envoyée',
    bookingPendingMessage: 'Votre demande de réservation a été envoyée. Vous recevrez un email dès qu\'elle sera confirmée par le salon.',
    bookingDetails: 'Détails de la réservation',
    viewBooking: 'Voir ma réservation',
    cancelBooking: 'Annuler la réservation',
    rescheduleBooking: 'Reporter la réservation',
    bookingCancelled: 'Réservation annulée',
    bookingRescheduled: 'Réservation reportée',
    noAvailableSlots: 'Aucun créneau disponible',
    invalidDate: 'Date invalide',
    invalidTime: 'Heure invalide',
    bookingNotFound: 'Réservation introuvable',
  },

  // Services
  services: {
    services: 'Prestations',
    duration: 'Durée',
    price: 'Prix',
    minutes: 'min',
    euro: '€',
    from: 'à partir de',
  },

  // Admin
  admin: {
    login: 'Connexion',
    logout: 'Déconnexion',
    dashboard: 'Tableau de bord',
    services: 'Prestations',
    bookings: 'Réservations',
    availability: 'Disponibilités',
    sendMagicLink: 'Envoyer le lien de connexion',
    magicLinkSent: 'Lien de connexion envoyé à votre email',
    enterEmail: 'Entrez votre email',
    invalidEmail: 'Email invalide',
    allBookings: 'Toutes les réservations',
    todayBookings: 'Réservations du jour',
    upcomingBookings: 'Réservations à venir',
    completedBookings: 'Réservations terminées',
    cancelledBookings: 'Réservations annulées',
    addService: 'Ajouter une prestation',
    editService: 'Modifier la prestation',
    deleteService: 'Supprimer la prestation',
    serviceName: 'Nom de la prestation',
    serviceDescription: 'Description',
    serviceDuration: 'Durée (minutes)',
    servicePrice: 'Prix (€)',
    serviceCategory: 'Catégorie',
    setAvailability: 'Définir les disponibilités',
    confirmBooking: 'Confirmer la réservation',
    cancelBooking: 'Annuler la réservation',
    rescheduleBooking: 'Reporter la réservation',
    markCompleted: 'Marquer comme terminée',
    pendingBookings: 'En attente de confirmation',
  },

  // Salon Info
  salon: {
    name: 'SR-TOUCH',
    address: 'Adresse',
    phone: 'Téléphone',
    email: 'Email',
    openingHours: 'Horaires d\'ouverture',
    location: 'Où se situe le salon ?',
  },

  // Status
  status: {
    pending: 'En attente',
    confirmed: 'Confirmée',
    cancelled: 'Annulée',
    completed: 'Terminée',
  },

  // Days
  days: {
    monday: 'Lundi',
    tuesday: 'Mardi',
    wednesday: 'Mercredi',
    thursday: 'Jeudi',
    friday: 'Vendredi',
    saturday: 'Samedi',
    sunday: 'Dimanche',
  },

  // Email
  email: {
    confirmationSubject: 'Votre réservation est confirmée - SR-TOUCH',
    requestSubject: 'Demande de réservation reçue - SR-TOUCH',
    reminderSubject: 'Rappel: Votre réservation demain - SR-TOUCH',
    greeting: 'Bonjour',
    confirmationMessage: 'Votre réservation a été confirmée par le salon.',
    requestMessage: 'Votre demande de réservation a bien été reçue. Vous recevrez un email dès qu\'elle sera confirmée.',
    reminderMessage: 'Nous vous rappelons votre réservation demain.',
    bookingDetails: 'Détails de votre réservation:',
    service: 'Prestation',
    date: 'Date',
    time: 'Heure',
    manageBooking: 'Gérer ma réservation',
    footer: 'SR-TOUCH - Salon de beauté',
  },
} as const;
