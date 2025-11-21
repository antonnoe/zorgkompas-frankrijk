/* ============================================================
   ZORGKOMPAS SCRIPT.JS – DEBUG VERSION
   ============================================================ */

import { ZK_SCENARIOS } from "./scenarios.js";
import { zkRunScenario } from "./scenarioEngine.js";

console.log("Script gestart..."); // Debug log

// 1. STATE
const ZK_STATE = {
    status: "worker",
    mutuelle: 2,
    ald: false,
    traitant: true,
    private: false,
    scenario: null
};

// 2. INIT
function initApp() {
    console.log("Init app gestart..."); // Debug log
    
    const select = document.getElementById("zk-scenario-select");
    
    if (!select) {
        console.error("FOUT: Kan dropdown element 'zk-scenario-select' niet vinden in HTML!");
        return;
    }

    if (!ZK_SCENARIOS || ZK_SCENARIOS.length === 0) {
        console.error("FOUT: Geen scenario's gevonden in import!");
        return;
    }

    // Reset dropdown
    select.innerHTML = '<option value="">-- Kies een scenario --</option>';

    // Vul dropdown
    ZK_SCENARIOS.forEach(s => {
        const opt = document.createElement("option");
        opt.value = s.id;
        opt.textContent = s.label;
        select.appendChild(opt);
    });

    console.log(`Succes: ${ZK_SCENARIOS.length} scenario's ingeladen.`);

    attachListeners();
}

function attachListeners() {
    // Koppel inputs veilig (check of ze bestaan)
    safeListen("zk-status", "change", (e) => { ZK_STATE.status = e.target.value; updateCalculation(); });
    safeListen("zk-mutuelle", "change", (e) => { ZK_STATE.mutuelle = Number(e.target.value); updateCalculation(); });
    safeListen("zk-opt-ald", "change", (e) => { ZK_STATE.ald = e.target.checked; updateCalculation(); });
    safeListen("zk-opt-traitant", "change", (e) => { ZK_STATE.traitant = e.target.checked; updateCalculation(); });
    safeListen("zk-opt-private", "change", (e) => { ZK_STATE.private = e.target.checked; updateCalculation(); });
    
    safeListen("zk-scenario-select", "change", (e) => {
        ZK_STATE.scenario = e.target.value;
        updateCalculation();
    });
}

// Hulpfunctie om crashes te voorkomen als ID niet bestaat
function safeListen(id, event, handler) {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener(event, handler);
    } else {
        console.warn(`Waarschuwing: Element ${id} niet gevonden.`);
    }
}

// 3. UPDATE & RENDER
function updateCalculation() {
    const outputBox = document.getElementById("zk-output");
    const totalLabel = document.getElementById("zk-total-value");

    if (!ZK_STATE.scenario || ZK_STATE.scenario === "") {
        if(outputBox) outputBox.innerHTML = "";
        if(totalLabel) totalLabel.textContent = "€ 0,00";
        return;
    }

    console.log(`Berekening starten voor: ${ZK_STATE.scenario}`);
    const result = zkRunScenario(ZK_STATE.scenario, ZK_STATE);

    if (!result) return;

    if (totalLabel) totalLabel.textContent = formatMoney(result.totals.user);
    if (outputBox) renderResults(result, outputBox);
}

function renderResults(result, container) {
    const { scenario, steps, totals } = result;

    let html = `
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

    steps.forEach((step, index) => {
        const notesHtml = step.notes.length > 0 
            ? `<div style="font-size:0.85em; color:#d32f2f; margin-top:4px;">Let op: ${step.notes.join(", ")}</div>` 
            : "";

        html += `
            <div class="zk-block" style="padding: 15px; margin-bottom: 15px;">
                <h4 style="font-size:16px; margin-bottom:5px;">Stap ${index + 1}: ${step.label}</h4>
                
                <div class="zk-row">
                    <span>Kosten (Bruto):</span>
                    <span>${formatMoney(step.cost_user + step.cost_ameli + step.cost_mutuelle)}</span> 
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

function formatMoney(amount) {
    return "€ " + amount.toFixed(2).replace(".", ",");
}

// Start app direct
initApp();
