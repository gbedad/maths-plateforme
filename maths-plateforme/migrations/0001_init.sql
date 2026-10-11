-- Schéma de la plateforme Maths par l'exemple (Cloudflare D1 / SQLite)

CREATE TABLE IF NOT EXISTS classes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nom TEXT NOT NULL,
  niveau TEXT NOT NULL,              -- '4e', '2nde', ...
  code TEXT NOT NULL UNIQUE,         -- code donné aux élèves pour se connecter
  reglages TEXT NOT NULL DEFAULT '{}', -- JSON : onglets visibles, notions ouvertes...
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS eleves (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  classe_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  pseudo TEXT NOT NULL,
  pin_sel TEXT,
  pin_hash TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  derniere_activite TEXT,
  UNIQUE (classe_id, pseudo)
);

-- Banque d'exercices importée depuis Excel : une ligne par exercice, variantes en JSON
CREATE TABLE IF NOT EXISTS exercices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  notion TEXT NOT NULL,
  numero INTEGER NOT NULL,
  donnees TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (notion, numero)
);

-- Séries terminées ("archivage")
CREATE TABLE IF NOT EXISTS series (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  eleve_id INTEGER NOT NULL REFERENCES eleves(id) ON DELETE CASCADE,
  notion TEXT NOT NULL,
  exercice INTEGER NOT NULL DEFAULT 1,
  score INTEGER NOT NULL,
  max INTEGER NOT NULL,
  details TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_series_eleve ON series(eleve_id, notion);

CREATE TABLE IF NOT EXISTS jeux (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  eleve_id INTEGER NOT NULL REFERENCES eleves(id) ON DELETE CASCADE,
  notion TEXT NOT NULL,
  jeu TEXT NOT NULL,
  score INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_jeux_eleve ON jeux(eleve_id, notion, jeu);

-- Retours des testeurs ("Signaler un problème")
CREATE TABLE IF NOT EXISTS signalements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  eleve_id INTEGER REFERENCES eleves(id) ON DELETE SET NULL,
  notion TEXT,
  question TEXT,
  message TEXT NOT NULL,
  traite INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
