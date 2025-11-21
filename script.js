/* ============================================================
   ZORGKOMPAS CONTROLLER - VOLLEDIGE VERSIE
   ============================================================ */

import { ZK_SCENARIOS } from "./scenarios.js";
import { zkRunScenario } from "./scenarioEngine.js";

// ------------------------------------------------------------
// 1. LEXICON DATABASE (De tekst voor de pop-ups)
// ------------------------------------------------------------
const LEXICON_DB = {
    "BRSS": "Basis de Remboursement: Het wettelijk vastgestelde basistarief. De Sécu vergoedt een % van DIT bedrag, niet van de werkelijke kosten.",
    "Secteur 1": "Arts houdt zich strikt aan de overheidstarieven. Geen supplementen.",
    "Secteur 2": "Arts mag zelf tarieven bepalen (Vrije prijzen). U betaalt het supplement zelf (of uw mutuelle).",
    "OPTAM": "Arts met gematigde tarieven. Betere vergoeding dan 'puur' Secteur 2.",
    "ALD": "Affection Longue Durée: Chronische ziekte (o.a. kanker, diabetes). 100% vergoeding van de basis (BRSS).",
    "Franchise": "Eigen risico per handeling (bijv. €2 per artsbezoek). Dit wordt NOOIT vergoed, ook niet door de mutuelle.",
    "Vignette": "Kleurcode op medicijnverpakking die bepaalt hoeveel de Sécu vergoedt (65%, 30%, 15%).",
    "Forfait Journalier": "Verplichte dagbijdrage voor kost & inwoning bij opname (€20/dag).",
    "Parcours de soins": "Zorgtraject. Altijd eerst naar huisarts voor verwijzing, anders krijgt u minder vergoed.",
    "Dépassements": "Ereloonsupplementen: Het bedrag dat de arts vraagt bovenop het officiële tarief.",
    "Auxiliaire médical": "Paramedici zoals fysiotherapeuten en verpleegkundigen.",
    "SSR": "Revalidatiekliniek. Verblijfskosten zijn vaak voor eigen rekening als u geen goede mutuelle heeft.",
    "Derde betaler": "Tiers Payant: U hoeft het bedrag niet voor te schieten, de verzekering betaalt direct aan de zorgverlener.",
    "Forfait Technique": "Vast bedrag voor het gebruik van zware apparatuur (zoals MRI), direct betaald door de Sécu."
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
// 3. INITIALISATIE
// ------------------------------------------------------------
function initApp() {
    const select = document.getElementById("zk-scenario-select");
    
    // Vul de dropdown met scenario's
    ZK_SCENARIOS.forEach(s => {
        const opt = document.createElement("option");
        opt.value = s.id;
        opt.textContent = s.label;
        select.appendChild(opt);
    });

    attachListeners();
}

function attachListeners() {
    // Luister naar wijzigingen in de inputs
    const ids = ["zk-status", "zk-mutuelle", "zk-opt-ald", "zk-opt-traitant", "zk-opt-private"];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.addEventListener("change", updateState);
    });

    // Luister naar scenario keuze
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
    // Haal 'zk-' en 'opt-' weg om de key te vinden (bv zk-opt-ald -> ald)
    const key = e.target.id.replace("zk-opt-", "").replace("zk-", "");
    
    if(key === "status") ZK_STATE.status = val;
    else if(key === "mutuelle") ZK_STATE.mutuelle = Number(val);
    else ZK_STATE[key] = val;

    updateCalculation();
}

// ------------------------------------------------------------
// 4. BEREKENING & UPDATE
// ------------------------------------------------------------
function updateCalculation() {
    if (!ZK_STATE.scenario) return;

    // Roep de Engine aan
    const result = zkRunScenario(ZK_STATE.scenario, ZK_STATE);
    if (!result) return;

    // Update het totaalbedrag rechtsboven
    document.getElementById("zk-total-value").textContent = formatMoney(result.totals.user);

    // Render de details
    renderOutput(result);
}

// ------------------------------------------------------------
// 5. RENDERING (HTML GENERATOR)
// ------------------------------------------------------------
function renderOutput(result) {
    const container = document.getElementById("zk-output");
    const s = result.scenario;

    // Bepaal kleur van de accuraatheid-balk
    let fillClass = "fill-mid";
    if (s.accuracy_pct >= 80) fillClass = "fill-high";
    if (s.accuracy_pct <= 40) fillClass = "fill-low";

    // --- DEEL 1: INTRO CARD ---
    let html = `
        <div class="zk-intro-card">
            
            <div class="zk-accuracy-container">
                <div class="zk-accuracy-header">
                    <span>Financiële voorspelbaarheid:</span>
                    <span>${s.accuracy_pct}%</span>
                </div>
                <div class="zk-accuracy-bar-bg">
                    <div class="zk-accuracy-bar-fill ${fillClass}" style="width: ${s.accuracy_pct}%"></div>
                </div>
                <div style="margin-top:5px; color:#666;">${s.accuracy_text}</div>
            </div>

            <h3>${s.label}</h3>
            <p>${s.description}</p>
            
            <div style="display:flex; justify-content:space-between; color:var(--brand); font-weight:bold; font-size:18px; margin-top:15px; border-top:1px solid #eee; padding-top:15px;">
                <span>Uw geschatte bijdrage:</span>
                <span>${formatMoney(result.totals.user)}</span>
            </div>
        </div>
    `;

    // --- DEEL 2: STAPPEN (LOOP) ---
    result.steps.forEach((step, index) => {
        
        // Icon logic: welk plaatje tonen we bij de titel?
        let icon = "";
        if (step.notes.some(n => n.includes("100%"))) {
            icon = `<img src="assets/check.svg" class="icon-img" alt="OK">`;
        } else if (step.cost_user > 50) {
            icon = `<img src="assets/alert.svg" class="icon-img" alt="Let op">`;
        } else if (step.label.toLowerCase().includes("operatie") || step.label.includes("SSR")) {
            icon = `<img src="assets/hospital.svg" class="icon-img" alt="Zorg">`;
        }

        // Tooltip injection: Zoek woorden en zet er een [i] achter
        let niceLabel = injectTooltips(step.label, step.lex);

        // Warning blocks genereren
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

// ------------------------------------------------------------
// 6. HELPER FUNCTIES
// ------------------------------------------------------------

// Zoekt termen in de tekst en voegt de [i] tooltip toe
function injectTooltips(text, terms = []) {
    if (!terms || terms.length === 0) return text;

    let newText = text;
    terms.forEach(term => {
        const definition = LEXICON_DB[term];
        if (definition) {
            // HTML voor de tooltip met het info.svg icoontje
            const replacement = `
                <span class="zk-tooltip-wrapper" data-tip="${definition}">
                    ${term}<img src="assets/info.svg" class="zk-info-icon" alt="[i]">
                </span>`;
            
            // Vervang de term in de tekst
            newText = newText.replace(term, replacement);
        }
    });
    return newText;
}

function formatMoney(amount) {
    return "€ " + amount.toFixed(2).replace(".", ",");
}

// ------------------------------------------------------------
// 7. START DE APP
// ------------------------------------------------------------
initApp();
