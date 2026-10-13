# Maths par l'exemple

Plateforme pour comprendre les notions de maths par l'exemple. Pour chaque notion, l'élève suit un **parcours en 7 étapes** ; chaque étape ouvre la suivante :

1. **Explorer** : ranger des nombres dans deux familles, sans note, puis écrire la règle avec ses mots. Le nombre de bonnes réponses qui ouvre l'étape suivante se règle dans la feuille « Parcours » de l'Excel.
2. **Comprendre** : la définition officielle à côté de la règle de l'élève, le testeur, les pièges.
3. **En savoir plus** : d'où vient la notion et à quoi elle sert.
4. **Jouer** : deux mini-jeux, sans score.
5. **S'entraîner** : questions oui/non + pourquoi. Jusqu'à 3 étoiles.
6. **Retenir** : la fiche mémo construite à partir du parcours de l'élève, et des révisions espacées. Jusqu'à 3 étoiles.
7. **Aller plus loin** : la suite de la notion et deux défis. Jusqu'à 3 étoiles.

Pas de note : chaque type de question est une **compétence** (Découverte → En cours → Maîtrisée → Ancrée). Il y a aussi des badges, les jours actifs de la semaine et un objectif de classe coopératif. La notion suivante s'ouvre à la fin du parcours.

- **Élèves** : page d'accueil `/`. Connexion avec le code de la classe, un pseudo et un code secret à 4 chiffres. Aucune adresse e-mail n'est demandée.
- **Enseignant (administrateur)** : `/prof.html`. Il crée les classes, règle les onglets visibles et les notions ouvertes, voit les résultats, importe la banque Excel et lit les signalements.

Notions disponibles :

| Notion | Niveau |
|---|---|
| Les entiers naturels ℕ | 2nde |
| L'écriture scientifique a × 10ⁿ | 4e |
| Les tables de multiplication (révision ×) | 6e |
| La table de 2, 3, … 9 (une notion par table, `public/js/notions/table.js`) | 6e |

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

Il faut un compte Cloudflare et Node.js 22 ou plus.

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

Wrangler affiche ensuite l'adresse du site, du type `https://maths-plateforme.<ton-compte>.workers.dev`. Tu peux lui associer un nom de domaine dans le tableau de bord Cloudflare : Workers → le Worker → Settings → Domains & Routes.

**Déploiement automatique (facultatif).** Mets le dossier sur GitHub. Dans le tableau de bord Cloudflare, relie le dépôt au Worker : Workers & Pages → le Worker → Settings → Builds. Commande de déploiement : `npx wrangler deploy`. Chaque `git push` met alors le site à jour.

## Comptes enseignants

- **Premier démarrage** : sur `/prof.html`, laisse l'adresse e-mail vide et entre `ADMIN_PASSWORD`. Un écran te fait créer ton compte **superadmin** (prénom, nom, e-mail, mot de passe). Les classes existantes te sont rattachées.
- **Inscrire un enseignant** : menu Administration → Enseignants → Inscrire. La plateforme affiche un **lien d'activation** (valable 7 jours, à usage unique) à lui transmettre ; il y choisit son mot de passe.
- Chaque enseignant ne voit que **ses** classes et ses élèves ; le superadmin voit tout. La banque d'exercices est **commune** et seul le superadmin peut l'importer.
- Mot de passe oublié : bouton « Lien nouveau mot de passe ». Un compte peut être désactivé / réactivé.
- **Accès de secours** : identifiant `admin` + `ADMIN_PASSWORD` ouvre le compte superadmin.
- Sécurité : mots de passe hachés (PBKDF2-SHA256 salé), blocage 5 minutes après 5 essais ratés, cloisonnement vérifié côté serveur.

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

## Mettre à jour une installation existante

Après avoir récupéré une nouvelle version du code :

```bash
npm install
npm run db:migrate:remote   # ajoute les nouvelles tables si besoin (sans toucher aux données)
npm run seed:remote         # recharge la banque et la feuille « Parcours »
git push                    # déploie
```

## Mettre à jour les exercices

Deux façons :

- **Depuis le site** : Espace enseignant → Banque d'exercices → Importer un fichier Excel. Un aperçu s'affiche, avec les avertissements (doublons, réponse juste introuvable…), avant l'enregistrement.
- **En ligne de commande** : `npm run seed:remote`, qui lit `data/banque-exercices.xlsx`.

Importer un fichier remplace les exercices des notions qu'il contient.

**Créer un exercice sans toucher au code** : dans la colonne « Générateur », utilise les générateurs génériques (paramètres séparés par « ; ») :
`liste(12; 18; 2,5; -3; 7/2)`, `entier(1; 100)`, `entier(1; 100; pair)`, `entier(1; 100; multiple de 6)`, `entier(1; 100; pas multiple de 6)`, `decimal(0; 10; 2)`, `fraction(1; 40)`, `fraction(1; 40; entière)`.
Leurs repères (`{m}`, `{q}`, `{bas}`, `{haut}`, `{num}`…) sont listés dans l'onglet « Générateurs » de l'Excel. Les autres notions ne changent pas.

**Questions des tables de multiplication** : la séquence 1 d'Explorer (« 8 × k = ? » puis « Pourquoi ? ») se règle dans une feuille « Tables ». Modèle : `data/table-8-questions.xlsx` (une ligne = un choix de réponse ; repères `{calc}`, `{autre}`, `{×10}` ; mode d'emploi dans le fichier). On peut importer ce fichier seul : la banque n'est pas touchée. Sans import, la plateforme utilise ses questions par défaut.

## Ajouter une notion

1. Ajoute ses générateurs de nombres dans `public/js/moteur.js`.
2. Crée `public/js/notions/ma-notion.js`, sur le modèle des deux notions existantes : définition, testeur, pièges, aller plus loin et jeux.
3. Déclare-la dans `CATALOGUE`, dans `public/js/eleve.js` et `public/js/prof.js`. Ajoute aussi son niveau par défaut dans `src/index.js` (`NOTIONS_PAR_NIVEAU`).
4. Ajoute ses lignes dans le fichier Excel, avec la colonne `Notion`, puis importe le fichier.

## Données personnelles

- Les élèves se connectent avec un pseudo. À la création du compte, ils indiquent leur prénom et l'initiale de leur nom (« Léa M. ») : seul l'enseignant les voit, et il peut les corriger. Aucune adresse e-mail, aucun nom complet.
- Prévenir l'établissement (référent RGPD) que la plateforme conserve ces données d'élèves mineurs ; elles sont hébergées en Europe (base D1, région weur).
- Le code secret est stocké haché. La session est un cookie `HttpOnly` signé, valable 30 jours.
- Supprimer une classe supprime ses élèves et tous leurs résultats.
