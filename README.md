# SR-TOUCH Booking System

Système de réservation en ligne pour le salon SR-TOUCH, inspiré du design Planity.

## Fonctionnalités

### Côté Client
- ✅ Sélection de prestations par catégories (design Planity)
- ✅ Réservation en ligne avec sélection de date et heure
- ✅ Confirmation par email
- ✅ Gestion des réservations (annulation, report) via lien unique
- ✅ Interface entièrement en français

### Côté Admin
- ✅ Authentification par magic link (sans mot de passe)
- ✅ Tableau de bord avec statistiques
- ✅ Gestion des réservations (visualisation, filtres)
- ✅ Gestion des prestations (à venir)
- ✅ Gestion des disponibilités (à venir)
- ✅ Envoi automatique de rappels 24h avant les rendez-vous

## Technologies

- **Framework**: Nuxt 4
- **Base de données**: Neon DB (PostgreSQL)
- **ORM**: Drizzle ORM
- **Authentification**: Better Auth (magic link)
- **Email**: Nodemailer (SMTP)
- **UI**: Tailwind CSS + shadcn-nuxt
- **Validation**: Zod

## Installation

1. **Installer les dépendances**:
```bash
pnpm install
```

2. **Configurer les variables d'environnement**:
```bash
cp .env.example .env
```

Remplir les variables dans `.env`:
- `DATABASE_URL`: URL de connexion Neon PostgreSQL
- `SMTP_HOST`: Serveur SMTP (ex: `smtp.gmail.com`)
- `SMTP_PORT`: Port SMTP (ex: `587`)
- `SMTP_USER`: Utilisateur SMTP (email)
- `SMTP_PASS`: Mot de passe SMTP (App Password pour Gmail)
- `FROM_EMAIL`: Email d'envoi (ex: `SR-TOUCH <noreply@sr-touch.com>`)
- `BASE_URL`: URL de base de l'application
- `ADMIN_EMAIL`: Email admin pour les magic links

3. **Configurer la base de données**:
```bash
# Générer les migrations
pnpm db:generate

# Appliquer les migrations (après avoir configuré DATABASE_URL)
pnpm db:migrate
```

4. **Lancer le serveur de développement**:
```bash
pnpm dev
```

## Structure du projet

```
app/
├── server/
│   ├── api/              # Endpoints API
│   │   ├── bookings/     # Gestion des réservations
│   │   ├── services/     # Gestion des prestations
│   │   └── admin/        # Dashboard admin
│   ├── database/         # Schéma et migrations Drizzle
│   ├── tasks/            # Tâches planifiées (rappels emails)
│   └── utils/            # Utilitaires (email, auth, availability)
├── pages/
│   ├── index.vue         # Page d'accueil avec sélection de prestations
│   ├── book/             # Flux de réservation
│   ├── booking/          # Gestion des réservations client
│   └── admin/            # Dashboard admin
├── components/
│   ├── booking/          # Composants de réservation
│   └── ui/               # Composants UI (shadcn)
└── lib/
    └── translations.ts   # Traductions françaises
```

## Scripts disponibles

- `pnpm dev` - Lancer le serveur de développement
- `pnpm build` - Construire pour la production
- `pnpm preview` - Prévisualiser le build de production
- `pnpm db:generate` - Générer les migrations Drizzle
- `pnpm db:migrate` - Appliquer les migrations
- `pnpm db:studio` - Ouvrir Drizzle Studio

## Tâches planifiées

Le système envoie automatiquement des emails de rappel 24 heures avant chaque rendez-vous. La tâche s'exécute quotidiennement à 9h00.

## Prochaines étapes

- [ ] Page admin pour gérer les prestations
- [ ] Page admin pour gérer les disponibilités
- [ ] Améliorer l'envoi des magic links par email
- [ ] Ajouter la gestion des collaborateurs/staff
- [ ] Ajouter les informations du salon (adresse, horaires)

## Notes

- Better Auth gère automatiquement les tables d'authentification dans la base de données
- Les magic links sont envoyés automatiquement par email via Nodemailer (SMTP)
- Assurez-vous que `BASE_URL` est correctement configuré pour les liens dans les emails
- Better Auth crée automatiquement les tables nécessaires lors de la première utilisation
