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

// ---- Mutuelle (contrat responsable): voorbeelden uit service-public F20314 en CMUNF Voorbeelden 2026
const mut = (step, state) => stap(step, state).cost_mutuelle;
{
  // F20314: huisarts 30 euro, in het parcours, mutuelle dekt het ticket modérateur (9 euro), Sécu 19, rest 2 euro participation
  const huis = { type: "consult", role: "Huisarts", brss: 30, cost: 30 };
  const r = stap(huis, { mutuelle: 1 });
  gelijk("F20314 huisarts: Sécu 19", r.cost_ameli, 19); gelijk("F20314 huisarts: mutuelle 9", r.cost_mutuelle, 9); gelijk("F20314 huisarts: eigen 2", r.cost_user, 2);
  // Buiten parcours: Sécu 30 procent min 2 = 7, mutuelle alleen gewoon ticket modérateur 9 (niet de majoration), eigen 14; ook bij 300 procent
  for (const n of [1, 2, 3]) { const b = stap(huis, { mutuelle: n, traitant: false }); gelijk(`buiten parcours, niveau ${n}: Sécu 7`, b.cost_ameli, 7); gelijk(`buiten parcours, niveau ${n}: mutuelle 9`, b.cost_mutuelle, 9); gelijk(`buiten parcours, niveau ${n}: eigen 14`, b.cost_user, 14); }
  gelijk("buiten parcours zonder mutuelle: eigen 23", stap(huis, { mutuelle: 0, traitant: false }).cost_user, 23);
  // CMUNF p.17: specialist OPTAM, kosten 53, BR 40 -> 12 / 25 / 25 bij 100 / 150 / 300
  const spec = { type: "consult", role: "Specialist", brss: 40, cost: 53 };
  gelijk("CMUNF specialist OPTAM 100: 12", mut(spec, { mutuelle: 1 }), 12);
  gelijk("CMUNF specialist OPTAM 150: 25", mut(spec, { mutuelle: 1.5 }), 25);
  gelijk("CMUNF specialist OPTAM 300: 25", mut(spec, { mutuelle: 3 }), 25);
  // CMUNF p.16: chirurg niet-OPTAM, kosten 486, BR 271,70, Sécu 100 procent (zware handeling, hier als ALD-consult om het forfait buiten beeld te houden): 150 wordt 130, 300 wordt 200
  const chir = { type: "consult", role: "Chirurg", brss: 271.70, cost: 486, ald: true };
  gelijk("CMUNF chirurg niet-OPTAM 150 (wordt 130): 81,51", mut(chir, { mutuelle: 1.5, optam: "nee" }), 81.51);
  gelijk("CMUNF chirurg niet-OPTAM 300 (wordt 200): 214,30", mut(chir, { mutuelle: 3, optam: "nee" }), 214.30);
  // Harmonie PSI421: niet-OPTAM, kosten 66, BR 23, Sécu 70 procent: garantie 200 geeft 180 = (1,8 - 0,7) x 23 = 25,30
  gelijk("Harmonie PSI421 niet-OPTAM (200 wordt 180): 25,30", mut({ type: "consult", role: "Specialist", brss: 23, cost: 66 }, { mutuelle: 2, optam: "nee" }), 25.30);
  // Niet-OPTAM-niveaus: 150 wordt 130, 200 wordt 180, 300 wordt 200, 100 blijft 100
  const E = Z.zkNonOptamNiveau;
  gelijk("niet-OPTAM niveau 100", E(1), 1); gelijk("niet-OPTAM niveau 150", E(1.5), 1.3); gelijk("niet-OPTAM niveau 200", E(2), 1.8); gelijk("niet-OPTAM niveau 300", E(3), 2);
  // "Weet ik niet" rekent als OPTAM
  gelijk("optam onbekend = OPTAM", mut(spec, { mutuelle: 2, optam: "onbekend" }), mut(spec, { mutuelle: 2, optam: "ja" }));
}
// Kine en medicijnen: alleen ticket modérateur, niet het gekozen niveau (kine 16,58: TM 40 procent = 6,63)
gelijk("kine, niveau 300: alleen ticket modérateur", mut({ type: "kine", sessions: 1, brss: C.kine_per_sessie.waarde, cost: C.kine_per_sessie.waarde }, { mutuelle: 3 }), 6.63);
gelijk("medicijnen van 20 euro, niveau 300: ticket modérateur 7", mut({ type: "medicatie", items: [{ name: "x", brss: 20, cost: 20 }] }, { mutuelle: 3 }), 7);
// Ziekenhuis: liggeld wordt volledig gedekt door elke mutuelle; zonder mutuelle niet. Forfait 32 euro bij zware handelingen.
{
  const hern = (st) => Z.zkRunScenario("hernia", { ald: false, traitant: true, private: false, optam: "onbekend", ...st }).steps[2];
  gelijk("operatie met mutuelle 100: liggeld 69 en forfait 32 gedekt, eigen 0", hern({ mutuelle: 1 }).cost_user, 0);
  gelijk("operatie zonder mutuelle: Sécu BR min forfait 32", hern({ mutuelle: 0 }).cost_ameli, 650 - C.forfait_actes_lourds.bedrag);
  gelijk("operatie zonder mutuelle: eigen 32 + liggeld 69", hern({ mutuelle: 0 }).cost_user, 32 + 69);
  gelijk("operatie privé, mutuelle 100: supplement 400 blijft eigen", hern({ mutuelle: 1, private: true }).cost_user, 400);
  gelijk("operatie privé, mutuelle 300, OPTAM: alles gedekt", hern({ mutuelle: 3, private: true, optam: "ja" }).cost_user, 0);
  gelijk("operatie privé, mutuelle 150, niet-OPTAM: dépassement tot 30 procent BR gedekt", hern({ mutuelle: 1.5, private: true, optam: "nee" }).cost_mutuelle, 69 + 32 + 0.3 * 650);
  const ssr = Z.zkRunScenario("oncologie", { ald: false, traitant: true, private: false, mutuelle: 1, optam: "onbekend" }).steps[4];
  gelijk("revalidatie (30 dagen liggeld) met mutuelle 100: gedekt", ssr.cost_user, 0);
  gelijk("revalidatie zonder mutuelle: 690 eigen", Z.zkRunScenario("oncologie", { ald: false, traitant: true, private: false, mutuelle: 0 }).steps[4].cost_user, 690);
}
// Totalen met en zonder mutuelle; griep zonder médecin traitant, mutuelle 200
{
  const r = Z.zkRunScenario("griep", { ald: false, traitant: false, private: false, mutuelle: 2, optam: "onbekend" });
  gelijk("griep zonder traitant, mutuelle 200: totaal met mutuelle", r.totals.user, 16);
  gelijk("griep zonder traitant: totaal zonder mutuelle", r.totals.user_zonder_mutuelle, 27.45);
}
if (/operatie_volledig_boven/.test(Z.ZK_CONFIG ? JSON.stringify(Z.ZK_CONFIG) : "")) fouten.push("operatie_volledig_boven bestaat nog in ZK_CONFIG.");
if (Z.ZK_CONFIG.forfait_actes_lourds.bedrag !== 32 || Z.ZK_CONFIG.forfait_actes_lourds.drempel !== 120 || Z.ZK_CONFIG.forfait_actes_lourds.peil !== null) fouten.push("forfait_actes_lourds moet 32 euro, drempel 120 en peil null zijn.");
// Uitleg bij de dagbijdrage noemt beide bedragen en de uitzonderingen
const u = Z.ZK_FORFAIT_UITLEG;
for (const t of ["€23", "€17", "HAD", "AME", "arbeidsongeval", "Ehpad", "USLD"]) if (!u.includes(t)) fouten.push(`Uitleg dagbijdrage mist '${t}'.`);
if (!hernia.steps[2].notes.some((n) => n.includes("HAD") && n.includes("€17"))) fouten.push("De operatiestap toont de dagbijdrage-uitleg niet.");
if (!onco.steps[4].notes.some((n) => n.includes("HAD") && n.includes("€17"))) fouten.push("De revalidatiestap toont de dagbijdrage-uitleg niet.");

if (fouten.length) { console.log(`\n${fouten.length} fout(en):`); fouten.forEach((f) => console.log("FOUT " + f)); process.exit(1); }
console.log("\nAlle rekentests geslaagd.");
