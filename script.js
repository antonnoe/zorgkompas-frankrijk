/* ============================================================
   ZORGKOMPAS CONTROLLER
   ============================================================ */

import { ZK_SCENARIOS } from "./scenarios.js";
import { zkRunScenario } from "./scenarioEngine.js";

// LEXICON DATABASE (Voor tooltips)
const LEXICON_DB = {
    "BRSS": "Basis de Remboursement: Het wettelijk vastgestelde basistarief waarop de Sécu vergoedt.",
    "Secteur 1": "Arts houdt zich strikt aan de overheidstarieven. Geen supplementen.",
    "Secteur 2": "Arts mag zelf tarieven bepalen. Het meerdere (supplement) betaalt u zelf of de mutuelle.",
    "OPTAM": "Arts met gematigde tarieven. Betere vergoeding dan 'puur' Secteur 2.",
    "ALD": "Affection Longue Durée: Chronische ziekte waarbij basiszorg 100% vergoed wordt.",
    "Franchise": "Eigen risico per handeling (bijv. €2 per artsbezoek). Niet vergoed door mutuelle.",
    "Forfait Journalier": "Dagbedrag voor kost & inwoning in ziekenhuis/kliniek (€20/dag).",
    "Parcours de soins": "Zorgtraject via de huisarts. Direct naar specialist gaan = minder vergoeding.",
    "Dépassements": "Ereloonsupplementen bovenop het basistarief.",
    "SSR": "Soins de Suite et de Réadaptation: Revalidatiezorg na ziekenhuisopname."
};

const ZK_STATE = {
    status: "worker",
    mutuelle: 2,
    ald: false,
    traitant: true,
    private: false,
    scenario: null
};

// INIT
function initApp() {
    const select = document.getElementById("zk-scenario-select");
    
    // Vul dropdown
    ZK_SCENARIOS.forEach(s => {
        const opt = document.createElement("option");
        opt.value = s.id;
        opt.textContent = s.label;
        select.appendChild(opt);
    });

    attachListeners();
}

function attachListeners() {
    const ids = ["zk-status", "zk-mutuelle", "zk-opt-ald", "zk-opt-traitant", "zk-opt-private"];
    ids.forEach(id => {
        document.getElementById(id).addEventListener("change", updateState);
    });

    document.getElementById("zk-scenario-select").addEventListener("change", (e) => {
        ZK_STATE.scenario = e.target.value;
        updateCalculation();
    });
}

function updateState(e) {
    const val = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    const key = e.target.id.replace("zk-opt-", "").replace("zk-", "");
    
    // Mapping fixes
    if(key === "status") ZK_STATE.status = val;
    else if(key === "mutuelle") ZK_STATE.mutuelle = Number(val);
    else ZK_STATE[key] = val;

    updateCalculation();
}

function updateCalculation() {
    if (!ZK_STATE.scenario) return;

    const result = zkRunScenario(ZK_STATE.scenario, ZK_STATE);
    if (!result) return;

    // Update Totaal Header
    document.getElementById("zk-total-value").textContent = formatMoney(result.totals.user);

    renderOutput(result);
}

function renderOutput(result) {
    const container = document.getElementById("zk-output");
    const s = result.scenario;

    // Bepaal Accuraatheid Class
    const accClass = s.accuracy === "high" ? "acc-high" : "acc-low";

    // 1. Intro kaart
    let html = `
        <div class="zk-intro-card">
            <span class="zk-accuracy-badge ${accClass}">Betrouwbaarheid: ${s.accuracy_text}</span>
            <h3>${s.label}</h3>
            <p>${s.description}</p>
            
            <div style="margin-top:15px; display:flex; justify-content:space-between; font-size:14px; border-top:1px solid #eee; padding-top:10px;">
                <span>Totale zorgkosten:</span>
                <strong>${formatMoney(result.totals.user + result.totals.ameli + result.totals.mutuelle)}</strong>
            </div>
            <div style="display:flex; justify-content:space-between; color:var(--green); font-size:14px;">
                <span>Vergoed (Ameli + Mutuelle):</span>
                <strong>- ${formatMoney(result.totals.ameli + result.totals.mutuelle)}</strong>
            </div>
            <div style="display:flex; justify-content:space-between; color:var(--red); font-weight:bold; font-size:18px; margin-top:5px;">
                <span>Uw bijdrage:</span>
                <span>${formatMoney(result.totals.user)}</span>
            </div>
        </div>
    `;

    // 2. Stappen (Accordion)
    result.steps.forEach((step, index) => {
        // Icon logic
        let icon = "";
        if (step.notes.some(n => n.includes("100%"))) icon = `<img src="assets/check.svg" class="icon-img">`;
        else if (step.cost_user > 50) icon = `<img src="assets/alert.svg" class="icon-img">`;
        else if (step.label.toLowerCase().includes("operatie") || step.label.includes("SSR")) icon = `<img src="assets/hospital.svg" class="icon-img">`;

        // Notes styling
        const alerts = step.notes.map(n => `<div class="zk-warning"><img src="assets/alert.svg" style="width:16px"> ${n}</div>`).join("");
        
        // Tooltip injection
        let niceLabel = injectTooltips(step.label, step.lex);

        html += `
        <div class="zk-step" onclick="this.classList.toggle('open')">
            <div class="zk-step-header">
                <div class="zk-step-title">
                    <span style="color:#9ca3af; font-size:12px;">${index+1}.</span>
                    ${icon} ${niceLabel}
                </div>
                <div class="zk-step-cost">${formatMoney(step.cost_user)}</div>
            </div>
            
            <div class="zk-step-body">
                <div class="zk-row"><span>Totale kosten:</span> <strong>${formatMoney(step.cost_total)}</strong></div>
                <div class="zk-row zk-subtext"><span>Vergoed Ameli:</span> <span>${formatMoney(step.cost_ameli)}</span></div>
                <div class="zk-row zk-subtext"><span>Vergoed Mutuelle:</span> <span>${formatMoney(step.cost_mutuelle)}</span></div>
                <hr style="border:0; border-top:1px dashed #eee; margin:10px 0;">
                <div class="zk-row" style="color:var(--red); font-weight:bold;">
                    <span>Zelf betalen:</span> <span>${formatMoney(step.cost_user)}</span>
                </div>
                ${alerts}
            </div>
        </div>`;
    });

    container.innerHTML = html;
}

// Helper: Zoek woorden uit lexicon en wrap ze in spans
function injectTooltips(text, terms = []) {
    if (!terms || terms.length === 0) return text;

    let newText = text;
    terms.forEach(term => {
        const definition = LEXICON_DB[term];
        if (definition) {
            // Vervang alleen het woord als het bestaat
            newText = newText.replace(term, `<span class="zk-term" data-tip="${definition}">${term}</span>`);
        }
    });
    return newText;
}

function formatMoney(amount) {
    return "€ " + amount.toFixed(2).replace(".", ",");
}

initApp();
