// Herstel rekenfouten (keuring 26-10-2026): elk voorbeeld met de wettelijke uitkomst.
// Draaien: node tests/herstel.test.mjs (geen netwerk, geen afhankelijkheden).
import { laad } from "./laden.mjs";
const Z = laad();
const fouten = [];
const gelijk = (wat, ruw, verwacht) => {
  const waarde = Math.round(ruw * 100) / 100;
  if (waarde !== verwacht) fouten.push(`${wat}: berekend ${waarde}, verwacht ${verwacht}`);
  else console.log(`ok   ${wat} = ${verwacht}`);
};
const basis = { mutuelle: 0, ald: false, traitant: true, private: false, optam: "onbekend" };
const stap = (step, state = {}) => {
  Z.ZK_SCENARIOS.push({ id: "_t", label: "t", steps: [step] });
  const r = Z.zkRunScenario("_t", { ...basis, ...state });
  Z.ZK_SCENARIOS.pop();
  return { ...r.steps[0], aldZonderEffect: r.aldZonderEffect };
};

// 1. ALD-vinkje alleen voor zorg binnen het protocol: griep met vinkje, eigen deel volgens de wet 15,45 (was 4,00)
{
  const r = Z.zkRunScenario("griep", { ...basis, ald: true });
  gelijk("1: griep met ALD-vinkje, eigen deel", r.totals.user, 15.45);
  gelijk("1: griep met ALD-vinkje, vinkje zonder effect gemeld", r.aldZonderEffect ? 1 : 0, 1);
  const rug = Z.zkRunScenario("fysio_rug", { ...basis, ald: true });
  gelijk("1: rugklachten met ALD-vinkje blijft gewoon: consult Sécu 19", rug.steps[0].cost_ameli, 19);
  gelijk("1: oncologie (protocolzorg) blijft 100 procent: consult Sécu 28", Z.zkRunScenario("oncologie", { ...basis }).steps[0].cost_ameli, 28);
  gelijk("1: oncologie meldt geen vinkje zonder effect", Z.zkRunScenario("oncologie", { ...basis, ald: true }).aldZonderEffect ? 1 : 0, 0);
  // protocolzorg via aldMogelijk: met vinkje 100 procent, zonder vinkje gewoon
  const prot = { type: "consult", role: "Huisarts", brss: 30, cost: 30, aldMogelijk: true };
  gelijk("1: aldMogelijk met vinkje: Sécu 28", stap(prot, { ald: true }).cost_ameli, 28);
  gelijk("1: aldMogelijk zonder vinkje: Sécu 19", stap(prot, { ald: false }).cost_ameli, 19);
}
// 1a. Toeslag buiten het parcours ook met ALD-vinkje voor zorg buiten het protocol: Sécu 7 (was 28)
{
  const r = Z.zkRunScenario("griep", { ...basis, ald: true, traitant: false });
  gelijk("1a: griep, ALD-vinkje, geen médecin traitant: consult Sécu", r.steps[0].cost_ameli, 7);
  gelijk("1a: consult eigen deel", r.steps[0].cost_user, 23);
  gelijk("1a: protocolzorg (oncologie) blijft zonder toeslag", Z.zkRunScenario("oncologie", { ...basis, traitant: false }).steps[0].cost_ameli, 28);
}
// 2. Zware beeldvorming zonder forfait (R160-16 II 1): scanner 250 euro, Sécu 248, eigen deel 2 (was 216 en 34)
{
  const scan = stap({ type: "diagnostiek", name: "Scanner", soort: "beeldvorming", brss: 250, cost_public: 250 });
  gelijk("2: scanner 250, Sécu", scan.cost_ameli, 248);
  gelijk("2: scanner 250, eigen deel", scan.cost_user, 2);
  // pathologie (IV): geen forfait, gewone eigen bijdrage 30 procent
  const patho = stap({ type: "diagnostiek", name: "Pathologie", soort: "pathologie", brss: 250, cost_public: 250 });
  gelijk("2: pathologie 250, Sécu 70 procent min 2", patho.cost_ameli, 173);
  // onbekende soort vanaf 120 euro houdt het forfait: eigen bijdrage 32 + 2
  gelijk("2: andere diagnostiek 250 met forfait, eigen deel", stap({ type: "diagnostiek", name: "Onderzoek", brss: 250, cost_public: 250 }).cost_user, 34);
}
// 3. Opname onder 120 euro: 80 procent, verrekend met de dagbijdrage: operatie 100 euro met 3 dagen, eigen deel 69 (was 99)
{
  const op = { type: "operation", name: "Kleine ingreep", brss: 100, cost_public: 100, days: 3, forfait_jour: 23 };
  const r = stap(op);
  gelijk("3: operatie 100 euro + 3 dagen, eigen deel", r.cost_user, 69);
  gelijk("3: operatie 100 euro + 3 dagen, Sécu", r.cost_ameli, 100);
  // eigen bijdrage hoger dan de dagbijdrage: u betaalt de eigen bijdrage, niet beide (BR 119, 1 dag: 23,80 tegen 23)
  const een = stap({ ...op, brss: 119, cost_public: 119, days: 1 });
  gelijk("3: eigen bijdrage hoger dan dagbijdrage: eigen deel", een.cost_user, 23.8);
  // met mutuelle volledig gedekt
  gelijk("3: operatie 100 euro, mutuelle 100: eigen deel 0", stap(op, { mutuelle: 1 }).cost_user, 0);
}
// 5a. Tekst: vergoeding van het forfait is verplicht voor een contrat responsable
{
  const r = Z.zkRunScenario("hernia", { ...basis, mutuelle: 1 }).steps[2];
  if (r.notes.some((n) => /hangt van uw contract af/.test(n))) fouten.push("5a: de tekst 'hangt van uw contract af' staat er nog.");
  else if (!r.notes.some((n) => /contrat responsable moet het forfait van 32 euro vergoeden \(art\. R871-2 1°/.test(n))) fouten.push("5a: de verplichte vergoeding (R871-2 1°) staat niet bij het forfait.");
  else console.log("ok   5a: tekst forfait verplicht vergoed");
}
// 5. Aanname zichtbaar: buiten het parcours geen dépassement door de mutuelle
{
  const r = Z.zkRunScenario("hernia", { ...basis, mutuelle: 2, traitant: false }).steps[0];
  if (!r.notes.some((n) => /Aanname van deze tool: buiten het parcours/.test(n))) fouten.push("5: de aanname over het dépassement buiten het parcours is niet zichtbaar.");
  else console.log("ok   5: aanname dépassement buiten parcours zichtbaar");
  gelijk("5: neurochirurg 90 euro buiten parcours, mutuelle 200: eigen deel ongewijzigd", r.cost_user, 56);
}
// 6. Franchise per verpakking begrensd op de vergoeding: BR 1,20 en 20 euro, Sécu 12,00 (was 11,78)
gelijk("6: verpakkingen 1,20 en 20, Sécu", stap({ type: "medicatie", items: [{ name: "a", brss: 1.2, cost: 1.2 }, { name: "b", brss: 20, cost: 20 }] }).cost_ameli, 12);
gelijk("6: kine met BR 1 euro: franchise begrensd op 0,60", stap({ type: "kine", sessions: 1, brss: 1, cost: 1 }).cost_ameli, 0);
// 7. Mutuelle vergoedt bij een behandelstap de verplichte eigen bijdrage: BR 200, mutuelle 100, eigen deel 0 (was 60)
{
  const r = stap({ type: "treatment", name: "Behandeling", brss: 200, cost: 200 }, { mutuelle: 1 });
  gelijk("7: behandeling 200, Sécu", r.cost_ameli, 140);
  gelijk("7: behandeling 200, mutuelle", r.cost_mutuelle, 60);
  gelijk("7: behandeling 200, eigen deel", r.cost_user, 0);
  gelijk("7: behandeling 200 zonder mutuelle, eigen deel", stap({ type: "treatment", name: "Behandeling", brss: 200, cost: 200 }).cost_user, 60);
}
// 8. Opname 120 tot 160 euro: laagste van de gewone eigen bijdrage en 32 euro: BR 140, eigen deel 28 (was 32)
{
  const op = { type: "operation", name: "Ingreep", brss: 140, cost_public: 140 };
  gelijk("8: opname BR 140, eigen deel", stap(op).cost_user, 28);
  gelijk("8: opname BR 160, eigen deel (20 procent = 32)", stap({ ...op, brss: 160, cost_public: 160 }).cost_user, 32);
  gelijk("8: opname BR 650, eigen deel 32", stap({ ...op, brss: 650, cost_public: 650 }).cost_user, 32);
}

if (fouten.length) { console.log(`\n${fouten.length} fout(en):`); fouten.forEach((f) => console.log("FOUT " + f)); process.exit(1); }
console.log("\nAlle herstel-tests geslaagd.");
