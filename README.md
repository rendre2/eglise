# Plateforme de Formation Spirituelle - Église Céleste

Application web de formation spirituelle développée avec Next.js 14, Prisma, PostgreSQL et TypeScript.

## Prérequis

- Node.js 18.x ou supérieur
- PostgreSQL 14.x ou supérieur
- npm ou yarn

## Installation

### 1. Cloner le dépôt

```bash
git clone [url-du-depot]
cd eglise
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Configuration des variables d'environnement

Créer un fichier `.env` à la racine du projet avec les variables suivantes:

```
DATABASE_URL="postgresql://utilisateur:motdepasse@localhost:5432/eglise"

NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=votre_secret_nextauth

GOOGLE_CLIENT_ID=votre_client_id
GOOGLE_CLIENT_SECRET=votre_client_secret

EMAIL_SERVER_HOST=smtp.example.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=utilisateur_email
EMAIL_SERVER_PASSWORD=mot_de_passe_email
EMAIL_FROM=noreply@example.com
```

### 4. Initialiser la base de données

```bash
npx prisma generate
npx prisma db push
npm run seed
```

### 5. Lancer l'application en développement

```bash
npm run dev
```

L'application sera disponible à l'adresse http://localhost:3000

### 6. Construire pour la production

```bash
npm run build
npm start
```

## Structure du projet

- `/app` - Routes et composants de l'application (Next.js App Router)
- `/components` - Composants réutilisables
- `/lib` - Services et utilitaires
- `/prisma` - Schéma de base de données et migrations
- `/public` - Fichiers statiques
- `/types` - Types TypeScript

## Fonctionnalités

- Authentification (NextAuth.js)
- Modules de formation avec chapitres et contenus
- Quiz et système de progression
- Génération de certificats
- Interface d'administration
- Système de notifications
