# Première Terre Finance — simulateur (simulation.premiereterre.fr)

Simulateur de financement (PTZ, montage, diagnostic) réservé aux vendeurs, derrière une connexion
par e-mail et mot de passe.

- `private/simulateur.html` : le simulateur (fichier autonome, données conservées dans le navigateur).
  Il n'est servi qu'aux personnes connectées (`src/app/route.ts`).
- `/connexion`, `/mot-de-passe-oublie`, `/nouveau-mot-de-passe` : connexion et changement de mot de passe (lien par e-mail, valable 24 h).
- `/comptes` : réservé aux administrateurs — créer, désactiver, supprimer des comptes. Pas d'inscription libre.
- `/installation` : création du premier administrateur, seulement tant que la base est vide et pour l'adresse `ADMIN_EMAIL`.

## Variables d'environnement (Vercel)

Voir `.env.example`. La base PostgreSQL est créée depuis l'onglet Storage du projet Vercel ;
les tables sont créées automatiquement au déploiement (`prisma migrate deploy`).

## Développement

```
npm install
npm run dev
```
