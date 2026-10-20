// Rekentest ZorgKompas: de rekenvoorbeelden uit Peil (veld testvoorbeeld) en een paar vaste scenario's.
// Draaien: node tests/zorgkompas.test.mjs (geen netwerk, geen afhankelijkheden).
import { laad } from "./laden.mjs";
const Z = laad();
const fouten = [];
const gelijk = (wat, ruw, verwacht) => {
  const waarde = Math.round(ruw * 100) / 100;
  if (waarde !== verwacht) fouten.push(`${wat}: berekend ${waarde}, verwacht ${verwacht}`);
  else console.log(`ok   ${wat} = ${verwacht}`);
};
const stap = (step, state = {}) => {
  const id = "_test";
  Z.ZK_SCENARIOS.push({ id, label: "test", steps: [step] });
  const r = Z.zkRunScenario(id, { mutuelle: 0, ald: false, traitant: true, private: false, ...state });
  Z.ZK_SCENARIOS.pop();
  return r.steps[0];
};
const C = Z.ZK_CONFIG;

// Consult huisarts: 30 x 70% = 21, min 2 franchise = 19 (Peil: brss_consult_medecin_traitant)
gelijk("consult huisarts, vergoed Ameli", stap({ type: "consult", role: "Huisarts", brss: C.consult_huisarts.waarde, cost: C.consult_huisarts.waarde }).cost_ameli, 19);
// Buiten parcours: 30 x 30% = 9 vóór franchise (Peil: vergoeding_zonder_medecin_traitant)
gelijk("consult buiten parcours, vergoed vóór franchise", stap({ type: "consult", role: "Specialist", brss: 30, cost: 30 }, { traitant: false }).cost_ameli + C.franchises_en_participation.participation_forfaitaire, 9);
// Medicijnen: 20 x 65% = 13, min 1 franchise = 12 (Peil: vergoeding_kine_en_medicatie)
gelijk("doosje medicijnen van 20 euro, vergoed", stap({ type: "medicatie", items: [{ name: "x", brss: 20, cost: 20 }] }).cost_ameli, 12);
// Kine: 16,58 x 60% = 9,95 vóór franchise (Peil: brss_kine_per_sessie)
gelijk("kine-séance, vergoed vóór franchise", stap({ type: "kine", sessions: 1, brss: C.kine_per_sessie.waarde, cost: C.kine_per_sessie.waarde }).cost_ameli + C.franchises_en_participation.franchise_paramedisch_per_handeling, 9.95);
// Kine netto: 16,58 x 60% = 9,95 vergoed, na 1 euro franchise 8,95 per séance (Peil-testvoorbeeld)
gelijk("kine-séance, netto vergoed na 1 euro franchise", stap({ type: "kine", sessions: 1, brss: C.kine_per_sessie.waarde, cost: C.kine_per_sessie.waarde }).cost_ameli, 8.95);
gelijk("kine, 20 sessies: franchise 20 x 1 euro", stap({ type: "kine", sessions: 20, brss: C.kine_per_sessie.waarde, cost: C.kine_per_sessie.waarde }).cost_ameli, Math.round((20 * C.kine_per_sessie.waarde * 0.6 - 20) * 100) / 100);
// Vinkje médecin traitant: aan = 70 procent, uit = 30 procent, ook bij een huisarts (rol "Huisarts")
{
  const huisarts = { type: "consult", role: "Huisarts", brss: C.consult_huisarts.waarde, cost: C.consult_huisarts.waarde };
  gelijk("huisarts, médecin traitant aan: 70 procent min 2 euro", stap(huisarts, { traitant: true }).cost_ameli, 19);
  gelijk("huisarts, médecin traitant uit: 30 procent min 2 euro", stap(huisarts, { traitant: false }).cost_ameli, 7);
  const griep = (traitant) => Z.zkRunScenario("griep", { mutuelle: 0, ald: false, traitant, private: false }).steps[0].cost_ameli;
  gelijk("scenario griep, huisartsconsult met vinkje aan", griep(true), 19);
  gelijk("scenario griep, huisartsconsult met vinkje uit", griep(false), 7);
  const onco = Z.zkRunScenario("oncologie", { mutuelle: 0, ald: false, traitant: false, private: false }).steps[0];
  gelijk("oncologie (ALD): geen korting, 100 procent min 2 euro", onco.cost_ameli, 28);
}
// Specialist APC: 60 x 70% = 42, min 2 = 40
gelijk("consult specialist (APC), vergoed", stap({ type: "consult", role: "Neurochirurg", brss: C.specialist_apc.waarde, cost: C.specialist_apc.waarde }).cost_ameli, 40);
// Dagbijdrage: 3 dagen x 23 euro in het scenario hernia, 30 dagen x 23 euro in de revalidatiekliniek
const hernia = Z.zkRunScenario("hernia", { mutuelle: 0, ald: false, traitant: true, private: false });
gelijk("hernia: liggeld in operatiestap (3 x 23), totaal kosten", hernia.steps[2].cost_total, 650 + 3 * 23);
const onco = Z.zkRunScenario("oncologie", { mutuelle: 0, ald: false, traitant: true, private: false });
gelijk("oncologie: revalidatie (30 x 23), totaal kosten", onco.steps[4].cost_total, 30 * 23);
// Uitleg bij de dagbijdrage noemt beide bedragen en de uitzonderingen
const u = Z.ZK_FORFAIT_UITLEG;
for (const t of ["€23", "€17", "HAD", "AME", "arbeidsongeval", "Ehpad", "USLD"]) if (!u.includes(t)) fouten.push(`Uitleg dagbijdrage mist '${t}'.`);
if (!hernia.steps[2].notes.some((n) => n.includes("HAD") && n.includes("€17"))) fouten.push("De operatiestap toont de dagbijdrage-uitleg niet.");
if (!onco.steps[4].notes.some((n) => n.includes("HAD") && n.includes("€17"))) fouten.push("De revalidatiestap toont de dagbijdrage-uitleg niet.");

if (fouten.length) { console.log(`\n${fouten.length} fout(en):`); fouten.forEach((f) => console.log("FOUT " + f)); process.exit(1); }
console.log("\nAlle rekentests geslaagd.");
