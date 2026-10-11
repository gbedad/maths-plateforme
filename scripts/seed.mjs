// Convertit la banque Excel en SQL pour la base D1.
// Usage : node scripts/seed.mjs [data/banque-exercices.xlsx]  → écrit data/seed.sql
import * as XLSX from 'xlsx/xlsx.mjs';
import * as fs from 'node:fs';
import { lireBanque, lireParcours } from '../public/js/banque.js';
XLSX.set_fs(fs);
const fichier = process.argv[2] || 'data/banque-exercices.xlsx';
const wb = XLSX.readFile(fichier);
const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' });
const { exercices, avertissements } = lireBanque(rows);
avertissements.forEach((a) => console.warn('⚠ ' + a));
const q = (s) => "'" + String(s).replace(/'/g, "''") + "'";
const notions = [...new Set(exercices.map((e) => e.notion))];
let sql = notions.map((n) => `DELETE FROM exercices WHERE notion = ${q(n)};`).join('\n') + '\n';
const feuille = wb.SheetNames.find((n) => n.trim().toLowerCase() === 'parcours');
const config = feuille ? lireParcours(XLSX.utils.sheet_to_json(wb.Sheets[feuille], { header: 1, defval: '' })) : {};
for (const [n, c] of Object.entries(config)) sql += `INSERT INTO notions_config (notion, donnees) VALUES (${q(n)}, ${q(JSON.stringify(c))}) ON CONFLICT(notion) DO UPDATE SET donnees = excluded.donnees;\n`;
for (const e of exercices) sql += `INSERT INTO exercices (notion, numero, donnees) VALUES (${q(e.notion)}, ${e.numero}, ${q(JSON.stringify(e))});\n`;
fs.writeFileSync('data/seed.sql', sql);
console.log(`${exercices.length} exercice(s) écrits dans data/seed.sql : ${exercices.map((e) => `${e.notion} n°${e.numero} (${e.variantes.length} variantes)`).join(', ')}`);
