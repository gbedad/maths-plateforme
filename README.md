# Maths par l'exemple

Plateforme pour comprendre les notions de maths par l'exemple. Pour chaque notion, l'élève a cinq onglets :

- **Comprendre** : la définition, un testeur et des exemples.
- **S'entraîner** : des questions oui/non, suivies d'un « pourquoi ».
- **Jouer** : deux mini-jeux.
- **Aller plus loin** : du contexte sur la notion.
- **Mon suivi** : l'historique de ses séries.

- **Élèves** : page d'accueil `/`. Connexion avec le code de la classe, un pseudo et un code secret à 4 chiffres. Aucune adresse e-mail n'est demandée.
- **Enseignant (administrateur)** : `/prof.html`. Il crée les classes, règle les onglets visibles et les notions ouvertes, voit les résultats, importe la banque Excel et lit les signalements.

Notions disponibles :

| Notion | Niveau |
|---|---|
| Les entiers naturels ℕ | 2nde |
| L'écriture scientifique a × 10ⁿ | 4e |

## Architecture

Tout tourne chez Cloudflare :

- **Un Worker** (`src/index.js`). Il sert les pages du dossier `public/` et répond à l'API `/api/*`.
- **Une base D1** (SQLite). Elle contient les classes, les élèves, la banque d'exercices, les séries, les scores des jeux et les signalements. Le schéma est dans `migrations/`.
- **La banque d'exercices reste un fichier Excel.** Exemple : `data/banque-exercices.xlsx`. L'enseignant l'importe depuis son espace. L'onglet « Générateurs » du fichier explique comment les nombres sont tirés au hasard.

```
public/            pages élève (index.html) et enseignant (prof.html), CSS, JS
public/js/moteur.js      générateurs de nombres + tirage d'une série
public/js/banque.js      lecture du fichier Excel
public/js/notions/       une notion = un fichier (Comprendre, Aller plus loin, jeux)
src/index.js       API (sessions, classes, résultats, banque)
migrations/        schéma de la base
scripts/seed.mjs   Excel → SQL pour remplir la base en ligne de commande
```

## Mise en ligne (une seule fois)

Il faut un compte Cloudflare et Node.js 20 ou plus.

```bash
npm install
npx wrangler login

# 1. Créer la base, stockée en Europe de l'Ouest
npx wrangler d1 create maths-par-l-exemple --location weur
#    → copier le "database_id" affiché dans wrangler.jsonc

# 2. Créer les tables et charger la banque d'exercices
npm run db:migrate:remote
npm run seed:remote

# 3. Définir les deux secrets
npx wrangler secret put ADMIN_PASSWORD     # mot de passe de l'espace enseignant
npx wrangler secret put SESSION_SECRET     # longue chaîne aléatoire, ex. : openssl rand -hex 32

# 4. Publier
npm run deploy
```

Wrangler affiche ensuite l'adresse du site, du type `https://maths-par-l-exemple.<ton-compte>.workers.dev`. Tu peux lui associer un nom de domaine dans le tableau de bord Cloudflare : Workers → le Worker → Settings → Domains & Routes.

**Déploiement automatique (facultatif).** Mets le dossier sur GitHub. Dans le tableau de bord Cloudflare, relie le dépôt au Worker : Workers & Pages → le Worker → Settings → Builds. Commande de déploiement : `npx wrangler deploy`. Chaque `git push` met alors le site à jour.

## Premier test en classe

1. Ouvre `/prof.html` et connecte-toi avec `ADMIN_PASSWORD`.
2. Crée les classes, par exemple « 4e B » (niveau 4e) et « 2nde A » (niveau 2nde). Le niveau ouvre la bonne notion par défaut. Tu peux changer ce choix dans « Notions ouvertes ».
3. Donne à chaque classe son **code** (6 caractères) et l'adresse du site.
4. Les élèves choisissent un pseudo et un code secret à la première connexion. Si l'un d'eux oublie son code, utilise « Réinitialiser le code » dans la fiche de la classe.
5. Les retours des élèves arrivent dans « Signalements ».

## Travailler en local

```bash
cp .dev.vars.example .dev.vars          # mot de passe et secret de test
npm run db:migrate:local
npm run seed:local
npm run dev                              # http://localhost:8787 et /prof.html
```

## Mettre à jour les exercices

Deux façons :

- **Depuis le site** : Espace enseignant → Banque d'exercices → Importer un fichier Excel. Un aperçu s'affiche, avec les avertissements (doublons, réponse juste introuvable…), avant l'enregistrement.
- **En ligne de commande** : `npm run seed:remote`, qui lit `data/banque-exercices.xlsx`.

Importer un fichier remplace les exercices des notions qu'il contient. Les autres notions ne changent pas.

## Ajouter une notion

1. Ajoute ses générateurs de nombres dans `public/js/moteur.js`.
2. Crée `public/js/notions/ma-notion.js`, sur le modèle des deux notions existantes : définition, testeur, pièges, aller plus loin et jeux.
3. Déclare-la dans `CATALOGUE`, dans `public/js/eleve.js` et `public/js/prof.js`. Ajoute aussi son niveau par défaut dans `src/index.js` (`NOTIONS_PAR_NIVEAU`).
4. Ajoute ses lignes dans le fichier Excel, avec la colonne `Notion`, puis importe le fichier.

## Données personnelles

- Les élèves sont identifiés par un pseudo. Aucun nom, aucune adresse e-mail.
- Le code secret est stocké haché. La session est un cookie `HttpOnly` signé, valable 30 jours.
- Supprimer une classe supprime ses élèves et tous leurs résultats.
