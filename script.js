/* ============================================================
   ZORGKOMPAS SCRIPT.JS – FINAL INTEGRATED VERSION
   Koppelt de UI (index.html) aan de Logic (scenarioEngine.js)
   ============================================================ */

import { ZK_SCENARIOS } from "./scenarios.js";
import { zkRunScenario } from "./scenarioEngine.js"; 
// ^ BELANGRIJK: We gebruiken nu jouw slimme rekenmachine!

// ------------------------------------------------------------
// 1. STATE MANAGEMENT
// ------------------------------------------------------------
const ZK_STATE = {
    status: "worker",  // worker, pensioner, resident
    mutuelle: 2,       // 0, 1, 2, 3, 4 (factor)
    ald: false,
    traitant: true,
    private: false,
    scenario: null
};

// ------------------------------------------------------------
// 2. INITIALISATIE & DROPDOWN
// ------------------------------------------------------------
function initApp() {
    const select = document.getElementById("zk-scenario-select");
    
    // Vul de dropdown met scenario's uit scenarios.js
    ZK_SCENARIOS.forEach(s => {
        const opt = document.createElement("option");
        opt.value = s.id;
        opt.textContent = s.label;
        select.appendChild(opt);
    });

    // Koppel alle event listeners
    attachListeners();
}

function attachListeners() {
    // Koppel UI inputs aan State
    document.getElementById("zk-status").onchange = e => {
        ZK_STATE.status = e.target.value;
        updateCalculation();
    };

    document.getElementById("zk-mutuelle").onchange = e => {
        ZK_STATE.mutuelle = Number(e.target.value);
        updateCalculation();
    };

    document.getElementById("zk-opt-ald").onchange = e => {
        ZK_STATE.ald = e.target.checked;
        updateCalculation();
    };

    document.getElementById("zk-opt-traitant").onchange = e => {
        ZK_STATE.traitant = e.target.checked;
        updateCalculation();
    };

    document.getElementById("zk-opt-private").onchange = e => {
        ZK_STATE.private = e.target.checked;
        updateCalculation();
    };

    document.getElementById("zk-scenario-select").onchange = e => {
        ZK_STATE.scenario = e.target.value;
        updateCalculation();
    };
}

// ------------------------------------------------------------
// 3. CORE LOGIC: BEREKENEN & RENDEREN
// ------------------------------------------------------------
function updateCalculation() {
    const outputBox = document.getElementById("zk-output");
    const totalLabel = document.getElementById("zk-total-value");

    // Als er geen scenario is gekozen, maak scherm leeg
    if (!ZK_STATE.scenario) {
        outputBox.innerHTML = "";
        totalLabel.textContent = "€ 0,00";
        return;
    }

    // STAP A: Roep de engine aan (scenarioEngine.js)
    // Dit doet al het zware rekenwerk (Ameli, Mutuelle, ALD, etc.)
    const result = zkRunScenario(ZK_STATE.scenario, ZK_STATE);

    if (!result) return; // Veiligheid

    // STAP B: Update het totaalbedrag in de header
    totalLabel.textContent = formatMoney(result.totals.user);

    // STAP C: Render de details (HTML genereren)
    renderResults(result, outputBox);
}

// ------------------------------------------------------------
// 4. HTML GENERATOR (Gebruikt jouw CSS classes)
// ------------------------------------------------------------
function renderResults(result, container) {
    const { scenario, steps, totals } = result;

    let html = "";

    // 1. Intro blok
    html += `
        <div class="zk-block">
            <h4>${scenario.label}</h4>
            <p>${scenario.description}</p>
            <div class="zk-row" style="font-weight:bold; border-top:2px solid #eee; padding-top:10px;">
                <span>Totaal eigen bijdrage:</span>
                <span style="color:var(--red);">${formatMoney(totals.user)}</span>
            </div>
            <div class="zk-row" style="font-size:0.9em; color:#666;">
                <span>Vergoed door Sécu (Ameli):</span>
                <span>${formatMoney(totals.ameli)}</span>
            </div>
            <div class="zk-row" style="font-size:0.9em; color:#666;">
                <span>Vergoed door Mutuelle:</span>
                <span>${formatMoney(totals.mutuelle)}</span>
            </div>
        </div>
    `;

    // 2. Loop door alle stappen
    steps.forEach((step, index) => {
        
        // Check of er notities zijn (bijv: "Franchise €1")
        const notesHtml = step.notes.length > 0 
            ? `<div style="font-size:0.85em; color:#d32f2f; margin-top:4px;">Let op: ${step.notes.join(", ")}</div>` 
            : "";

        html += `
            <div class="zk-block" style="padding: 15px; margin-bottom: 15px;">
                <h4 style="font-size:16px; margin-bottom:5px;">Stap ${index + 1}: ${capitalize(step.label)}</h4>
                
                <div class="zk-row">
                    <span>Kosten (Bruto):</span>
                    <span>${formatMoney(step.raw.cost || step.raw.brss)}</span> 
                    </div>

                <div class="zk-row" style="color:#666; font-size:0.9em;">
                    <span>- Ameli (Basis):</span>
                    <span>${formatMoney(step.cost_ameli)}</span>
                </div>

                <div class="zk-row" style="color:#666; font-size:0.9em;">
                    <span>- Mutuelle:</span>
                    <span>${formatMoney(step.cost_mutuelle)}</span>
                </div>

                <div class="zk-row" style="font-weight:bold; color:var(--red);">
                    <span>Jij betaalt:</span>
                    <span>${formatMoney(step.cost_user)}</span>
                </div>

                ${notesHtml}
            </div>
        `;
    });

    container.innerHTML = html;
}

// ------------------------------------------------------------
// 5. HELPERS
// ------------------------------------------------------------
function formatMoney(amount) {
    // Zorgt voor nette euro notatie: € 25,50
    return "€ " + amount.toFixed(2).replace(".", ",");
}

function capitalize(s) {
    if(!s) return "";
    return s.charAt(0).toUpperCase() + s.slice(1);
}

// Start de app
initApp();
