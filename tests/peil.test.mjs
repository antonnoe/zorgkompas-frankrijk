// Controle van ZK_CONFIG (scenarios.js) tegen peil/waarden.json, de kopie van de waarden uit Peil (het parameterregister van Communities Abroad).
// Na een update van waarden.json draait deze test en laat zien welke waarde in scenarios.js mee moet.
// Draaien: node tests/peil.test.mjs (geen netwerk, geen afhankelijkheden).
import { laad, lees } from "./laden.mjs";

const scenariosCode = lees("scenarios.js");
const engineCode = lees("scenarioEngine.js");
const indexHtml = lees("index.html");
const scriptCode = lees("script.js");
const css = lees("style.css");
const WAARDEN = JSON.parse(lees("peil/waarden.json"));
const UITLEG_URL = "https://infofrankrijk.com/ons-manifest-hoe-wij-werken/";
const Z = laad();
const C = Z.ZK_CONFIG;

const gelijk = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const fouten = [];
const fout = (m) => fouten.push(m);

// Koppeling Peil-id naar de waarde in ZK_CONFIG. "app" is de waarde in de tool, "peil" het veld "waarde" uit het register.
const KOPPELING = {
  "p.fr.secu.brss_consult_medecin_traitant": { constante: "ZK_CONFIG.consult_huisarts", vergelijk: (w) => [["tarief consult huisarts", C.consult_huisarts.waarde, w], ["scenario griep gebruikt dit tarief", C.consult_huisarts.waarde, Z.zkGetScenario("griep").steps[0].brss]] },
  "p.fr.secu.brss_kine_per_sessie": { constante: "ZK_CONFIG.kine_per_sessie", vergelijk: (w) => [["tarief kine per sessie", C.kine_per_sessie.waarde, w], ["scenario rugklachten gebruikt dit tarief", C.kine_per_sessie.waarde, Z.zkGetScenario("fysio_rug").steps[2].brss], ["scenario hernia gebruikt dit tarief", C.kine_per_sessie.waarde, Z.zkGetScenario("hernia").steps[3].brss]] },
  "p.fr.secu.brss_specialist_apc": { constante: "ZK_CONFIG.specialist_apc", vergelijk: (w) => [["tarief specialist APC", C.specialist_apc.waarde, w], ["scenario hernia gebruikt dit tarief", C.specialist_apc.waarde, Z.zkGetScenario("hernia").steps[0].brss]] },
  "p.fr.secu.forfait_journalier": { constante: "ZK_CONFIG.forfait_journalier", vergelijk: (w) => [["dagbijdrage ziekenhuis of kliniek", C.forfait_journalier.ziekenhuis, w && w.ziekenhuis], ["dagbijdrage psychiatrie", C.forfait_journalier.psychiatrie, w && w.psychiatrie], ["hernia gebruikt dagbijdrage ziekenhuis", C.forfait_journalier.ziekenhuis, Z.zkGetScenario("hernia").steps[2].forfait_jour], ["oncologie gebruikt dagbijdrage ziekenhuis", C.forfait_journalier.ziekenhuis, Z.zkGetScenario("oncologie").steps[4].forfait_jour]] },
  "p.fr.secu.vergoedingspercentage_standaard": { constante: "ZK_CONFIG.vergoeding.standaard", vergelijk: (w) => [["standaard vergoedingspercentage", C.vergoeding.standaard, w]] },
  "p.fr.secu.vergoeding_kine_en_medicatie": { constante: "ZK_CONFIG.vergoeding.kine en .medicatie", vergelijk: (w) => [["vergoeding kine", C.vergoeding.kine, w && w.kine], ["vergoeding medicijnen (SMR majeur of important)", C.vergoeding.medicatie, w && w.medicatie_smr_majeur_important]] },
  "p.fr.secu.franchises_en_participation": { constante: "ZK_CONFIG.franchises_en_participation", vergelijk: (w) => Object.keys(w || {}).map((k) => [`franchise-parameter ${k}`, C.franchises_en_participation[k], w[k]]).concat([["alle sleutels van Peil staan in ZK_CONFIG", true, !!w && Object.keys(w).every((k) => k in C.franchises_en_participation)]]) },
  "p.fr.secu.vergoeding_zonder_medecin_traitant": { constante: "ZK_CONFIG.vergoeding.buiten_parcours", vergelijk: (w) => [["vergoeding buiten parcours de soins", C.vergoeding.buiten_parcours, w]] },
};

// Geen vaste bedragen of percentages meer buiten ZK_CONFIG
{
  const kaal = (code) => code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  const eng = kaal(engineCode);
  if (/ameliRate\s*=\s*[01]\.\d+/.test(eng.replace(/ameliRate = 1\.0/g, ""))) fout("scenarioEngine.js bevat een vast vergoedingspercentage; zet het in ZK_CONFIG.");
  const sc = kaal(scenariosCode.slice(scenariosCode.indexOf("export const ZK_SCENARIOS")));
  if (/forfait_jour:\s*\d/.test(sc)) fout("scenarios.js bevat een vast bedrag voor forfait_jour; gebruik ZK_CONFIG.");
  if (/\b(16\.13|16\.58|55\.00|20\.00)\b/.test(sc)) fout("scenarios.js bevat een vast tarief buiten ZK_CONFIG.");
  const oud = /tarief 2024|2024\/2025|2024-2025|2025 editie|tarieven 2025|€\s?20\/dag/i;
  for (const [naam, code] of [["scenarios.js", scenariosCode], ["scenarioEngine.js", engineCode], ["script.js", scriptCode], ["index.html", indexHtml]]) if (oud.test(code)) fout(`${naam} noemt nog een oud jaartal of oud bedrag (${code.match(oud)[0]}).`);
}

// Bronnen en data in de configuratie
for (const k of ["consult_huisarts", "kine_per_sessie", "specialist_apc", "forfait_journalier"]) if (!C[k].bron || !/^\d{4}-\d{2}-\d{2}$/.test(C[k].datum)) fout(`ZK_CONFIG.${k} mist bron of datum.`);
if (!C.vergoeding.bron || !C.vergoeding.datum) fout("ZK_CONFIG.vergoeding mist bron of datum.");

// Peil-label: teksten, plaatsing en schakelaar (datum alleen uit PEIL_STAND)
{
  const nl = Z.peilStandNl();
  const kort = Z.peilStandKort();
  if (Z.PEIL_STAND === "2026-10-20" && (nl !== "20 oktober 2026" || kort !== "20 okt 2026")) fout(`Datumweergave klopt niet: '${nl}' en '${kort}'.`);
  if (Z.PEIL_LABEL_AAN !== true) fout("PEIL_LABEL_AAN moet true zijn.");
  if (Z.PEIL_UITLEG_URL !== UITLEG_URL) fout(`PEIL_UITLEG_URL is ${Z.PEIL_UITLEG_URL}, verwacht ${UITLEG_URL}.`);
  if (Z.peilRegelMd() !== `[Bedragen gecontroleerd tegen Peil, stand ${nl}](${UITLEG_URL})`) fout("Markdownregel klopt niet.");
  const h = Z.peilRegelHtml();
  if (!h.includes(`href="${UITLEG_URL}"`) || !h.includes('target="_blank"') || !h.includes('rel="noopener"')) fout("Stempel linkt niet naar het manifest met target _blank en rel noopener.");
  if (!h.includes(`aria-label="Bedragen gecontroleerd tegen Peil, stand ${nl}, lees hoe wij werken"`)) fout("Stempel mist de aria-label met volledige datum.");
  if (!h.includes("Gecontroleerd tegen Peil</span>") || !h.includes(`stand ${kort}<span class="peil-pijl" aria-hidden="true">&#8599;</span></span>`)) fout("Stempel mist de twee korte regels of het pijltje.");
  if ((h.match(/<a /g) || []).length !== 1 || !h.includes("<svg") || !h.includes("#800000")) fout("Stempel moet één link met inline svg in #800000 zijn.");
  const v = Z.peilVoetHtml();
  if (!v.startsWith('<span class="peil-merk"') || !v.includes("<strong>Over de bedragen in deze tool.</strong> Alle bedragen, tarieven en grenzen komen uit Peil, het register waarin wij deze gegevens bijhouden. Elk bedrag is gecontroleerd bij de officiële bron, de laatste controle was op " + nl + `. <a href="${UITLEG_URL}" target="_blank" rel="noopener">Lees in ons manifest hoe wij werken</a>`)) fout("Voettekstalinea klopt niet.");
  if (!/html \+= voorbehoudHtml\(\) \+ peilRegelHtml\(\);/.test(scriptCode)) fout("Het voorbehoud moet direct voor de stempel staan bij de uitkomst.");
  if (!/id="peilVoet"/.test(indexHtml)) fout("index.html mist het element peilVoet.");
  if (/(19|20) oktober 2026/.test(engineCode.replace(/\/\/.*$/gm, "")) || /(19|20) oktober 2026/.test(indexHtml)) fout("Er staat een vaste peildatum in de code; de datum mag alleen uit PEIL_STAND komen.");
  if (/antonnoe\.github\.io\/peil-nl-fr/.test(scenariosCode + engineCode + scriptCode + indexHtml)) fout("De tool verwijst naar de openbare Peil-site.");
  if (!/\.peil-pijl\s*\{/.test(css) || !/\.peil-stempel\s*\{/.test(css)) fout("style.css mist de opmaak van de stempel.");
  // Schakelaar uit: alles weg
  const uit = laad(scenariosCode, engineCode.replace("PEIL_LABEL_AAN = true;", "PEIL_LABEL_AAN = false;"));
  if (uit.peilRegelHtml() !== "" || uit.peilRegelMd() !== "" || uit.peilVoetHtml() !== "") fout("Met PEIL_LABEL_AAN = false moet het label volledig verdwijnen.");
}

if (WAARDEN.stand !== Z.PEIL_STAND) fout(`stand in peil/waarden.json is ${WAARDEN.stand}, maar PEIL_STAND is ${Z.PEIL_STAND}.`);
const lijst = WAARDEN.parameters || [];
if (!lijst.length) fout("peil/waarden.json bevat geen parameters.");
const perId = new Map(lijst.map((p) => [p.id, p]));
for (const [id, koppeling] of Object.entries(KOPPELING)) {
  const kop = perId.get(id);
  if (!kop) { fout(`${id}: staat niet in peil/waarden.json, maar de tool gebruikt hem (${koppeling.constante}).`); continue; }
  if (kop.waarde === null || kop.status === "te_verifieren") { fout(`${id}: status te verifiëren in Peil, de tool gebruikt hem wel.`); continue; }
  for (const [wat, app, peil] of koppeling.vergelijk(kop.waarde)) {
    if (!gelijk(app, peil)) fout(`${id} (${kop.naam}), ${wat}: tool heeft ${JSON.stringify(app)}, peil/waarden.json heeft ${JSON.stringify(peil)}. Constante: ${koppeling.constante}.`);
  }
  if (C[koppeling.constante.split(".")[1]]?.peil && C[koppeling.constante.split(".")[1]].peil !== id) fout(`${id}: ZK_CONFIG verwijst naar een ander Peil-id (${C[koppeling.constante.split(".")[1]].peil}).`);
  console.log(`ok   ${id} <-> ${koppeling.constante}`);
}
const ongebruikt = lijst.filter((p) => !KOPPELING[p.id]).map((p) => p.id);
if (ongebruikt.length) console.log(`info parameters in waarden.json die de tool niet gebruikt (niet vergeleken): ${ongebruikt.join(", ")}`);

if (fouten.length) {
  console.log(`\n${fouten.length} afwijking(en) tussen de tool en peil/waarden.json:`);
  fouten.forEach((m) => console.log(`FOUT ${m}`));
  process.exit(1);
}
console.log(`\nAlle ${Object.keys(KOPPELING).length} gebruikte parameters komen overeen met peil/waarden.json (stand ${Z.PEIL_STAND}).`);
