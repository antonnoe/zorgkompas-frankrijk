/* ============================================================
   ZORGKOMPAS CONTROLLER
   ============================================================ */

import { ZK_SCENARIOS } from "./scenarios.js";
import { zkRunScenario } from "./scenarioEngine.js";

// ------------------------------------------------------------
// 1. LEXICON DATABASE
// ------------------------------------------------------------
const LEXICON_DB = {
    "BRSS": "Basis de Remboursement: Het wettelijk basistarief. De Sécu vergoedt een % van dit bedrag.",
    "Secteur 1": "Arts houdt zich strikt aan de overheidstarieven. Geen supplementen.",
    "Secteur 2": "Arts mag zelf tarieven bepalen. U betaalt het supplement zelf.",
    "OPTAM": "Arts met gematigde tarieven. Betere vergoeding dan 'puur' Secteur 2.",
    "ALD": "Affection Longue Durée: Chronische ziekte. 100% vergoeding van de basis.",
    "Franchise": "Eigen risico per handeling (bijv. €2). Wordt nooit vergoed.",
    "Vignette": "Kleurcode op medicijnen die vergoeding bepaalt (65%, 30%, 15%).",
    "Forfait Journalier": "Verplichte dagbijdrage bij opname (€20/dag).",
    "Parcours de soins": "Zorgtraject. Altijd eerst naar huisarts voor verwijzing.",
    "Dépassements": "Ereloonsupplementen bovenop het basistarief.",
    "Auxiliaire médical": "Paramedici zoals fysiotherapeuten.",
    "SSR": "Revalidatiekliniek (Soins de Suite et de Réadaptation).",
    "Derde betaler": "Tiers Payant: Verzekering betaalt direct aan zorgverlener.",
    "Forfait Technique": "Vast bedrag voor zware apparatuur (MRI/CT), betaald door Sécu."
};

// ------------------------------------------------------------
// 2. STATE MANAGEMENT
// ------------------------------------------------------------
const ZK_STATE = {
    status: "worker",
    mutuelle: 2,
    ald: false,
    traitant: true,
    private: false,
    scenario: null
};

// ------------------------------------------------------------
// 3. INIT
// ------------------------------------------------------------
function initApp() {
    const select = document.getElementById("zk-scenario-select");
    
    ZK_SCENARIOS.forEach(s => {
        const opt = document.createElement("option");
        opt.value = s.id;
        opt.textContent = s.label;
        select.appendChild(opt);
    });

    attachListeners();
}

function attachListeners() {
    const ids = ["zk-mutuelle", "zk-opt-ald", "zk-opt-traitant", "zk-opt-private"];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.addEventListener("change", updateState);
    });

    const select = document.getElementById("zk-scenario-select");
    if(select) {
        select.addEventListener("change", (e) => {
            ZK_STATE.scenario = e.target.value;
            updateCalculation();
        });
    }
}

function updateState(e) {
    const val = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    const key = e.target.id.replace("zk-opt-", "").replace("zk-", "");
    
    if(key === "mutuelle") ZK_STATE.mutuelle = Number(val);
    else ZK_STATE[key] = val;

    updateCalculation();
}

// ------------------------------------------------------------
// 4. BEREKENING & RENDER
// ------------------------------------------------------------
function updateCalculation() {
    if (!ZK_STATE.scenario) return;

    const result = zkRunScenario(ZK_STATE.scenario, ZK_STATE);
    if (!result) return;

    document.getElementById("zk-total-value").textContent = formatMoney(result.totals.user);
    renderOutput(result);
}

function renderOutput(result) {
    const container = document.getElementById("zk-output");
    const s = result.scenario;

    let html = `
        <div class="zk-intro-card">
            <div style="background:#f3f4f6; padding:8px 12px; border-radius:6px; font-size:13px; font-weight:600; color:#555; margin-bottom:15px; border-left:4px solid #999;">
                ${s.accuracy_text}
            </div>

            <h3>${s.label}</h3>
            <p>${s.description}</p>
            
            <div style="display:flex; justify-content:space-between; color:var(--brand); font-weight:bold; font-size:18px; margin-top:15px; border-top:1px solid #eee; padding-top:15px;">
                <span>Uw geschatte bijdrage:</span>
                <span>${formatMoney(result.totals.user)}</span>
            </div>
        </div>
    `;

    result.steps.forEach((step, index) => {
        let icon = "";
        if (step.notes.some(n => n.includes("100%"))) {
            icon = `<img src="assets/check.svg" class="icon-img" alt="OK">`;
        } else if (step.cost_user > 50) {
            icon = `<img src="assets/alert.svg" class="icon-img" alt="Let op">`;
        } else if (step.label.toLowerCase().includes("operatie") || step.label.includes("SSR")) {
            icon = `<img src="assets/hospital.svg" class="icon-img" alt="Zorg">`;
        }

        let niceLabel = injectTooltips(step.label, step.lex);

        const warnings = step.notes.map(n => 
            `<div class="zk-warning"><img src="assets/alert.svg" style="width:16px"> ${n}</div>`
        ).join("");

        html += `
        <div class="zk-step" onclick="this.classList.toggle('open')">
            <div class="zk-step-header">
                <div class="zk-step-title">
                    <span style="color:#999; font-size:12px;">${index+1}.</span>
                    ${icon} ${niceLabel}
                </div>
                <div class="zk-step-cost">${formatMoney(step.cost_user)}</div>
            </div>
            
            <div class="zk-step-body">
                <div class="zk-row"><span>Totale kosten:</span> <strong>${formatMoney(step.cost_total)}</strong></div>
                <div class="zk-row zk-subtext"><span>Vergoed Ameli:</span> <span>${formatMoney(step.cost_ameli)}</span></div>
                <div class="zk-row zk-subtext"><span>Vergoed Mutuelle:</span> <span>${formatMoney(step.cost_mutuelle)}</span></div>
                
                <div class="zk-row" style="color:var(--brand); font-weight:bold; margin-top:10px; border-top:1px dashed #ddd; padding-top:5px;">
                    <span>Zelf betalen:</span> <span>${formatMoney(step.cost_user)}</span>
                </div>
                
                ${warnings}
            </div>
        </div>`;
    });

    container.innerHTML = html;
}

function injectTooltips(text, terms = []) {
    if (!terms || terms.length === 0) return text;

    let newText = text;
    terms.forEach(term => {
        const definition = LEXICON_DB[term];
        if (definition && newText.includes(term)) {
            const replacement = `
                <span class="zk-tooltip-wrapper" data-tip="${definition}">
                    ${term}<img src="assets/info.svg" class="zk-info-icon" alt="[i]">
                </span>`;
            newText = newText.replace(term, replacement);
        }
    });
    return newText;
}

function formatMoney(amount) {
    return "€ " + amount.toFixed(2).replace(".", ",");
}

initApp();
