-- Parcours en 7 étapes, maîtrise par compétence, fiche mémo

-- Chaque réponse donnée (S'entraîner, Retenir, Explorer) : base du calcul de maîtrise et de la fiche
CREATE TABLE IF NOT EXISTS reponses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  eleve_id INTEGER NOT NULL REFERENCES eleves(id) ON DELETE CASCADE,
  notion TEXT NOT NULL,
  source TEXT NOT NULL,             -- 'entrainer' | 'retenir' | 'explorer'
  variante TEXT NOT NULL,           -- compétence (ligne de la banque)
  libelle TEXT,
  question TEXT,                    -- texte brut de la question posée
  ok1 INTEGER NOT NULL,             -- oui/non juste
  ok2 INTEGER,                      -- pourquoi juste (NULL si pas de pourquoi)
  choix TEXT,                       -- réponse donnée (texte brut)
  juste TEXT,                       -- bonne justification (texte brut)
  corrige TEXT,                     -- corrigé (texte brut)
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_reponses_eleve ON reponses(eleve_id, notion, variante, created_at);

-- Avancement dans les étapes : état, étoiles, données propres à l'étape (règle en mes mots, exemples testés…)
CREATE TABLE IF NOT EXISTS progression (
  eleve_id INTEGER NOT NULL REFERENCES eleves(id) ON DELETE CASCADE,
  notion TEXT NOT NULL,
  etape TEXT NOT NULL,
  fait INTEGER NOT NULL DEFAULT 0,
  etoiles INTEGER NOT NULL DEFAULT 0,
  donnees TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (eleve_id, notion, etape)
);

-- Réglages par notion venant de l'Excel (feuille « Parcours ») : seuil d'Explorer…
CREATE TABLE IF NOT EXISTS notions_config (
  notion TEXT PRIMARY KEY,
  donnees TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
