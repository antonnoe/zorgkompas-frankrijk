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

    let totalUser = 0;
    let totalAmeli = 0;
    let totalMutuelle = 0;
    
    const calculatedSteps = scenario.steps.map(step => {
        const result = calculateStep(step, state);
        
        totalUser += result.cost_user;
        totalAmeli += result.cost_ameli;
        totalMutuelle += result.cost_mutuelle;

        return result;
    });

    return {
        scenario,
        steps: calculatedSteps,
        totals: {
            user: round(totalUser),
            ameli: round(totalAmeli),
            mutuelle: round(totalMutuelle)
        }
    };
}

function calculateStep(step, state) {
    let cost = 0;
    let brss = step.brss || 0;
    let notes = step.notes ? [...step.notes] : [];
    let lex = step.lex || [];

    // 1. KOSTEN BEPALEN
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
            if(step.cost_private.supplement > 0) notes.push("Privé supplement");
        } else {
            cost = step.cost_public || step.cost; 
        }
        
        if (step.type === "operation" && step.days) {
            cost += (step.days * step.forfait_jour); 
        }
    }
    else if (step.type === "SSR") {
        cost = step.days * step.forfait_jour;
        brss = 0; // SSR verblijf valt niet onder BRSS
    }
    else if (step.type === "treatment") {
        cost = step.cost;
        brss = step.brss || cost;
    }

    // 2. AMELI (SÉCU)
    let ameliRate = ZK_CONFIG.vergoeding.standaard; // Standaard 70%

    // ALD Check (State of Stap)
    const isAld = state.ald || step.ald;

    if (isAld) {
        ameliRate = 1.0;
        if (!notes.includes("ALD 100%")) notes.push("ALD 100% Dekking");
    } else {
        if (step.type === "kine") ameliRate = ZK_CONFIG.vergoeding.kine;
        if (step.type === "medicatie") ameliRate = ZK_CONFIG.vergoeding.medicatie;
        if (step.type === "operation" && brss > ZK_CONFIG.operatie_volledig_boven) ameliRate = 1.0;
    }

    // Strafkorting (geen aangemelde médecin traitant): geldt voor elk artsenconsult, ook bij een huisarts die niet uw médecin traitant is.
    // Uitzonderingen (onder de 16 jaar, spoed, buiten de eigen woonplaats) worden niet doorgerekend.
    if (!state.traitant && !isAld && step.type === 'consult') {
        ameliRate = ZK_CONFIG.vergoeding.buiten_parcours;
        notes.push("Strafkorting (buiten parcours)");
    }

    let ameliPay = brss * ameliRate;

    // 3. FRANCHISES
    let franchise = 0;
    // Consult of diagnostische handeling: participation forfaitaire
    if (step.type === "consult" || step.type === "diagnostiek") franchise = ZK_CONFIG.franchises_en_participation.participation_forfaitaire;
    // Medicatie: franchise per verpakking
    if (step.type === "medicatie") franchise = (step.items || []).length * ZK_CONFIG.franchises_en_participation.franchise_geneesmiddel_per_verpakking;
    // Kine: €1 per handeling (dag- en jaarplafonds worden hier niet toegepast)
    if (step.type === "kine") franchise = step.sessions * ZK_CONFIG.franchises_en_participation.franchise_paramedisch_per_handeling;
    
    if (step.type === "SSR") ameliPay = 0; // Forfait journalier niet door Ameli

    ameliPay = Math.max(0, ameliPay - franchise);

    // 4. MUTUELLE
    let mutuellePay = 0;
    if (state.mutuelle > 0) {
        let limit = brss * state.mutuelle;
        
        // SSR & Operatie liggeld: Mutuelle dekt 'Frais Réels' (volledige kosten) vaak
        if (step.type === "SSR" || (step.type === "operation" && step.forfait_jour)) {
            limit = cost; 
        }

        let gap = cost - ameliPay;
        mutuellePay = Math.min(gap, limit - ameliPay);

        // Mutuelle mag franchise NIET dekken (behalve bij liggeld ziekenhuis)
        if (step.type !== "SSR" && !(step.type === "operation" && step.days)) {
            const maxLegal = cost - ameliPay - franchise;
            if (mutuellePay > maxLegal) mutuellePay = maxLegal;
        }
    }
    mutuellePay = Math.max(0, mutuellePay);

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
    const aria = `Bedragen gecontroleerd tegen Peil, stand ${peilStandNl()}, lees hoe wij werken`;
    return `<div class="peil-stempel-rij"><a class="peil-stempel" href="${PEIL_UITLEG_URL}" target="_blank" rel="noopener" aria-label="${escapeHtml(aria)}"><svg viewBox="0 0 40 40" aria-hidden="true" focusable="false"><circle cx="20" cy="20" r="18.5" fill="#fff" stroke="#800000" stroke-width="1.6"/><circle cx="20" cy="20" r="14.5" fill="none" stroke="#800000" stroke-width="1"/><path d="M13.5 20.5 L18 25 L26.5 15.5" fill="none" stroke="#800000" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="peil-stempel__tk" aria-hidden="true"><span class="peil-stempel__t1">Gecontroleerd tegen Peil</span><span class="peil-stempel__t2">stand ${escapeHtml(peilStandKort())}<span class="peil-pijl" aria-hidden="true">&#8599;</span></span></span></a></div>`;
}
export function peilRegelMd() {
    if (!PEIL_LABEL_AAN) return "";
    return `[Bedragen gecontroleerd tegen Peil, stand ${peilStandNl()}](${PEIL_UITLEG_URL})`;
}
export function peilVoetHtml() {
    if (!PEIL_LABEL_AAN) return "";
    return `${PEIL_MERK}<strong>Over de bedragen in deze tool.</strong> Alle wettelijke tarieven, bedragen en grenzen komen uit Peil, het register waarin wij deze gegevens bijhouden. Elk daarvan is gecontroleerd bij de officiële bron, de laatste controle was op ${escapeHtml(peilStandNl())}. Waar de tool met een aanname of schatting rekent, staat dat bij de uitkomst. <a href="${PEIL_UITLEG_URL}" target="_blank" rel="noopener">Lees in ons manifest hoe wij werken</a>`;
}
