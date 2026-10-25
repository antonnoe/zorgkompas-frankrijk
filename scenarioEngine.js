/* ============================================================
   ZORGKOMPAS ENGINE
   ============================================================ */

import { ZK_SCENARIOS, ZK_CONFIG } from "./scenarios.js";

export function zkGetScenario(id) {
    return ZK_SCENARIOS.find(s => s.id === id);
}

export function zkRunScenario(scenarioId, state) {
    const scenario = zkGetScenario(scenarioId);
    if (!scenario) return null;

    const run = (st) => {
        let user = 0, ameli = 0, mutuelle = 0;
        const steps = scenario.steps.map(step => {
            const result = calculateStep(step, st);
            user += result.cost_user;
            ameli += result.cost_ameli;
            mutuelle += result.cost_mutuelle;
            return result;
        });
        return { steps, user, ameli, mutuelle };
    };

    const met = run(state);
    // Dezelfde situatie zonder mutuelle (alleen Sécu), voor de vergelijking bij de uitkomst
    const zonder = run({ ...state, mutuelle: 0 });

    return {
        scenario,
        steps: met.steps,
        totals: {
            user: round(met.user),
            ameli: round(met.ameli),
            mutuelle: round(met.mutuelle),
            user_zonder_mutuelle: round(zonder.user)
        }
    };
}

// Bij "weet ik niet" rekenen we als OPTAM; alleen "nee" geeft de lagere vergoeding van een niet-OPTAM-arts.
export function zkIsNonOptam(state) {
    return state.optam === "nee";
}

// Maximale dekking (als veelvoud van de BR, Sécu inbegrepen) voor een arts die niet OPTAM is:
// ten hoogste 100 procent BR dépassement (dus 200) en ten hoogste de OPTAM-dekking min 20 procent BR (R871-2 2°).
// Het ticket modérateur zelf blijft altijd volledig gedekt (minimaal 100).
export function zkNonOptamNiveau(n) {
    const c = ZK_CONFIG.mutuelle;
    return Math.max(1, Math.min(n - c.niet_optam_min, 1 + c.niet_optam_max_depassement));
}

function calculateStep(step, state) {
    let cost = 0;
    let brss = step.brss || 0;
    let notes = step.notes ? [...step.notes] : [];
    let lex = step.lex || [];
    const N = Number(state.mutuelle) || 0;          // garantie als veelvoud van de BR, Sécu inbegrepen
    const heeftMutuelle = N > 0;
    const F = ZK_CONFIG.franchises_en_participation;
    const AL = ZK_CONFIG.forfait_actes_lourds;

    // 1. KOSTEN BEPALEN
    let liggeld = 0; // forfait journalier in deze stap
    if (step.type === "consult") {
        cost = step.cost;
    }
    else if (step.type === "medicatie") {
        step.items.forEach(i => cost += i.cost);
        brss = step.items.reduce((sum, i) => sum + i.brss, 0);
    }
    else if (step.type === "kine") {
        cost = step.cost * step.sessions;
        brss = step.brss * step.sessions;
    }
    else if (step.type === "diagnostiek" || step.type === "operation") {
        if (state.private && step.cost_private) {
            cost = step.cost_private.base + (step.cost_private.supplement || 0);
            if (step.cost_private.supplement > 0) notes.push("Privé supplement");
        } else {
            cost = step.cost_public || step.cost;
        }

        if (step.type === "operation" && step.days) {
            liggeld = step.days * step.forfait_jour;
            cost += liggeld;
        }
    }
    else if (step.type === "SSR") {
        liggeld = step.days * step.forfait_jour;
        cost = liggeld;
        brss = 0; // SSR verblijf valt niet onder BRSS
    }
    else if (step.type === "treatment") {
        cost = step.cost;
        brss = step.brss || cost;
    }

    // Honoraria van de arts (zonder liggeld)
    const honoraria = cost - liggeld;

    // 2. AMELI (SÉCU), bruto vergoeding vóór participation en franchises
    let ameliRate = ZK_CONFIG.vergoeding.standaard; // Standaard 70%
    const isAld = state.ald || step.ald;
    const acteLourd = !isAld && (step.type === "operation" || step.type === "diagnostiek") && brss >= AL.drempel;
    let buitenParcours = false;

    if (isAld) {
        ameliRate = 1.0;
        if (!notes.includes("ALD 100%")) notes.push("ALD 100% Dekking");
    } else {
        if (step.type === "kine") ameliRate = ZK_CONFIG.vergoeding.kine;
        if (step.type === "medicatie") ameliRate = ZK_CONFIG.vergoeding.medicatie;
        if (acteLourd) ameliRate = 1.0;
    }

    // Korting zonder aangemelde médecin traitant: geldt voor elk artsenconsult, ook bij een huisarts die niet uw médecin traitant is.
    // Uitzonderingen (onder de 16 jaar, spoed, buiten de eigen woonplaats) worden niet doorgerekend.
    if (!state.traitant && !isAld && step.type === 'consult') {
        ameliRate = ZK_CONFIG.vergoeding.buiten_parcours;
        buitenParcours = true;
        notes.push("Strafkorting (buiten parcours)");
    }

    let ameliBruto = brss * ameliRate;
    if (acteLourd) {
        // Bij handelingen vanaf de drempel komt een forfait in plaats van het ticket modérateur
        ameliBruto = Math.max(0, ameliBruto - AL.bedrag);
        notes.push(`Forfait ${AL.bedrag} euro bij zware handelingen (in plaats van ticket modérateur)`);
    }

    // 3. PARTICIPATION FORFAITAIRE EN FRANCHISES (blijven altijd voor eigen rekening, ook met mutuelle)
    let franchise = 0;
    if (step.type === "consult" || step.type === "diagnostiek") franchise = F.participation_forfaitaire;
    if (step.type === "medicatie") franchise = (step.items || []).length * F.franchise_geneesmiddel_per_verpakking;
    if (step.type === "kine") franchise = step.sessions * F.franchise_paramedisch_per_handeling;

    let ameliPay = ameliBruto;
    if (step.type === "SSR") { ameliPay = 0; ameliBruto = 0; } // Forfait journalier niet door Ameli
    ameliPay = Math.max(0, ameliPay - franchise);

    // 4. MUTUELLE (contrat responsable)
    let mutuellePay = 0;
    if (heeftMutuelle) {
        const nonOptam = zkIsNonOptam(state);
        const depassement = Math.max(0, honoraria - brss) > 0;
        const rest = Math.max(0, honoraria - ameliBruto); // wat na de bruto Sécu-vergoeding overblijft (honoraria)
        let honorariaDekking;

        if (step.type === "SSR") {
            honorariaDekking = 0;
        } else if (buitenParcours) {
            // Alleen het gewone ticket modérateur, nooit de majoration
            honorariaDekking = Math.min(rest, brss * (1 - ZK_CONFIG.vergoeding.standaard));
        } else if (step.type === "kine" || step.type === "medicatie") {
            // Alleen het ticket modérateur (tot 100 procent BR), niet het gekozen niveau
            honorariaDekking = Math.min(rest, brss - ameliBruto);
        } else if (step.type === "treatment") {
            honorariaDekking = 0;
        } else {
            // Artsenhonoraria: tot N x BR in totaal (Sécu inbegrepen), nooit meer dan de werkelijke kosten
            const niveau = nonOptam && depassement ? zkNonOptamNiveau(N) : N;
            honorariaDekking = Math.min(rest, Math.max(0, niveau * brss - ameliBruto));
            if (nonOptam && depassement) notes.push("Arts niet OPTAM: dépassement minder vergoed");
        }

        // Het forfait voor zware handelingen mag de mutuelle vergoeden, afhankelijk van het contract (aangenomen)
        // (het forfait zit al in "rest", want ameliBruto is verlaagd met het forfait)
        // Forfait journalier: elke contrat responsable dekt het volledig, zonder tijdslimiet
        mutuellePay = honorariaDekking + liggeld;
        if (liggeld > 0) notes.push("Liggeld volledig gedekt door een contrat responsable");
        if (acteLourd) notes.push(`Of de mutuelle het forfait van ${AL.bedrag} euro vergoedt, hangt van uw contract af (hier aangenomen: ja)`);
        if (buitenParcours) notes.push("Mutuelle vergoedt de korting buiten het parcours niet");
    }
    mutuellePay = Math.max(0, mutuellePay);
    // Nooit meer dan wat na Sécu overblijft, en de franchise blijft voor de gebruiker
    mutuellePay = Math.min(mutuellePay, Math.max(0, cost - ameliPay - franchise));

    // 5. USER
    let userPay = cost - ameliPay - mutuellePay;

    return {
        label: step.name || step.label || `${capitalize(step.type)} ${step.role || ''}`,
        cost_user: userPay,
        cost_ameli: ameliPay,
        cost_mutuelle: mutuellePay,
        cost_total: cost,
        notes: notes,
        lex: lex
    };
}

function round(n) { return Math.round(n * 100) / 100; }
function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

/* ============================================================
   PEIL-LABEL: stand, stempel, markdownregel en voettekstalinea
   ============================================================ */

// Peil: het parameterregister van Communities Abroad (privé). De waarden staan als kopie in peil/waarden.json; tests/peil.test.mjs bewaakt dat ZK_CONFIG daarmee overeenkomt.
// Bij elke controle alleen PEIL_STAND aanpassen (en peil/waarden.json).
export const PEIL_STAND = "2026-10-20";
// Schakelaar voor het Peil-label (stempel, markdown-regel en voettekstalinea). Zolang false toont de tool niets over Peil.
export const PEIL_LABEL_AAN = true;
export const PEIL_UITLEG_URL = "https://infofrankrijk.com/ons-manifest-hoe-wij-werken/";
// Toolkaart van deze tool; de Peil-stempel linkt hiernaartoe (het manifest blijft de link in de voettekstalinea).
export const PEIL_KAART_URL = "https://communitiesabroad.com/manifest/tool/zorgkompas-frankrijk";
const MAANDEN_NL = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];
const MAANDEN_KORT = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

function escapeHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
export function peilStandNl() {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(PEIL_STAND);
    return m ? `${parseInt(m[3], 10)} ${MAANDEN_NL[parseInt(m[2], 10) - 1]} ${m[1]}` : PEIL_STAND;
}
export function peilStandKort() {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(PEIL_STAND);
    return m ? `${parseInt(m[3], 10)} ${MAANDEN_KORT[parseInt(m[2], 10) - 1]} ${m[1]}` : PEIL_STAND;
}
export const PEIL_MERK = `<span class="peil-merk" aria-hidden="true">&#10003;</span>`;
// Voorbehoud (disclaimer) direct onder de uitkomst; de stempel komt daarna.
export const VOORBEHOUD_TEKST = "dit is een educatieve tool. Bedragen zijn indicatief en kunnen afwijken van uw persoonlijke situatie. Tarieven en vergoedingen van de Assurance Maladie komen uit Peil; prijzen van geneesmiddelen, privétarieven, ziekenhuis- en behandelkosten en de aanvulling door een mutuelle zijn schattingen.";
export function voorbehoudHtml() {
    return `<p class="voorbehoud"><strong>Let op:</strong> ${VOORBEHOUD_TEKST}</p>`;
}
// Compacte stempelknop: merkteken met dubbele ring en vinkje, twee korte regels, het geheel is één link naar het manifest.
export function peilRegelHtml() {
    if (!PEIL_LABEL_AAN) return "";
    const aria = `Bedragen gecontroleerd tegen Peil, stand ${peilStandNl()}, bekijk wat er gecontroleerd is`;
    return `<div class="peil-stempel-rij"><a class="peil-stempel" href="${PEIL_KAART_URL}" target="_blank" rel="noopener" aria-label="${escapeHtml(aria)}"><svg viewBox="0 0 40 40" aria-hidden="true" focusable="false"><circle cx="20" cy="20" r="18.5" fill="#fff" stroke="#800000" stroke-width="1.6"/><circle cx="20" cy="20" r="14.5" fill="none" stroke="#800000" stroke-width="1"/><path d="M13.5 20.5 L18 25 L26.5 15.5" fill="none" stroke="#800000" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="peil-stempel__tk" aria-hidden="true"><span class="peil-stempel__t1">Gecontroleerd tegen Peil</span><span class="peil-stempel__t2">stand ${escapeHtml(peilStandKort())}<span class="peil-pijl" aria-hidden="true">&#8599;</span></span></span></a></div>`;
}
export function peilRegelMd() {
    if (!PEIL_LABEL_AAN) return "";
    return `[Bedragen gecontroleerd tegen Peil, stand ${peilStandNl()}](${PEIL_UITLEG_URL})`;
}
export function peilVoetHtml() {
    if (!PEIL_LABEL_AAN) return "";
    return `${PEIL_MERK}<strong>Over de bedragen in deze tool.</strong> Alle wettelijke tarieven, bedragen en grenzen komen uit Peil, het register waarin wij deze gegevens bijhouden. Elk daarvan is gecontroleerd bij de officiële bron, de laatste controle was op ${escapeHtml(peilStandNl())}. Waar de tool met een aanname of schatting rekent, staat dat bij de uitkomst. <a href="${PEIL_UITLEG_URL}" target="_blank" rel="noopener">Lees in ons manifest hoe wij werken</a>`;
}
