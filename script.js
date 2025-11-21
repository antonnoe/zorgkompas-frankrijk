/* ============================================================
   NLFR Zorgkompas – script.js
   UI-binding voor:
   - Floating bar (status verzekerde)
   - Scenario selector
   - ScenarioEngine.js (berekeningen)
   ============================================================ */

import { ZK_SCENARIOS } from "./scenarios.js";
import { zkRunScenario } from "./scenarioEngine.js";

/* ------------------------------------------------------------
   UI-ELEMENTEN
------------------------------------------------------------ */
const elScenarioSelect = document.getElementById("zk-scenario-select");
const elDetail = document.getElementById("zk-detail-container");

const elStatus = document.getElementById("profile-status");
const elMutuelle = document.getElementById("profile-mutuelle");
const elAld = document.getElementById("profile-ald");
const elTraitant = document.getElementById("profile-traitant");
const elPrivate = document.getElementById("profile-private");

const elTotalLabel = document.getElementById("zk-total-value");
const elTotalWarnings = document.getElementById("zk-total-warnings");

/* ------------------------------------------------------------
   1. SCENARIO SELECTIE OPBOUWEN
------------------------------------------------------------ */
export function zkInitScenarioSelector() {
    ZK_SCENARIOS.forEach(s => {
        const opt = document.createElement("option");
        opt.value = s.id;
        opt.textContent = s.label;
        elScenarioSelect.appendChild(opt);
    });
}

/* ------------------------------------------------------------
   2. LEES FLOATING BAR STATUS
------------------------------------------------------------ */
export function zkGetUserState() {
    return {
        status: elStatus.value,
        mutuelle: parseFloat(elMutuelle.value),
        ald: elAld.checked,
        traitant: elTraitant.checked,
        isPrivate: elPrivate.checked
    };
}

/* ------------------------------------------------------------
   3. SCENARIO RENDEREN NA SELECTIE
------------------------------------------------------------ */
export function zkRunSelectedScenario() {
    const scenarioId = elScenarioSelect.value;
    if (!scenarioId) return;

    const state = zkGetUserState();
    const result = zkRunScenario(scenarioId, state);

    if (!result) {
        elDetail.innerHTML = "<p>Scenario niet gevonden.</p>";
        return;
    }

    renderScenario(result);
}

/* ------------------------------------------------------------
   4. DETAIL-RENDERING VAN EEN COMPLEET SCENARIO
------------------------------------------------------------ */
function renderScenario(res) {

    const s = res.scenario;
    const steps = res.steps;
    const totals = res.totals;

    let html = `
        <div class="zk-detail-box">
            <div class="zk-detail-title">${s.label}</div>
            <p>${s.description}</p>
            <hr>
    `;

    steps.forEach((step, i) => {

        html += `
            <div class="zk-detail-line">
                <strong>Stap ${i+1}: ${step.raw.type}</strong>
                <span><strong>U betaalt: € ${step.cost_user.toFixed(2)}</strong></span>
            </div>

            <div class="zk-detail-sub">
                <div class="zk-detail-line"><span>Ameli:</span> <span>€ ${step.cost_ameli.toFixed(2)}</span></div>
                <div class="zk-detail-line"><span>Mutuelle:</span> <span>€ ${step.cost_mutuelle.toFixed(2)}</span></div>
        `;

        if (step.notes.length > 0) {
            html += `<div class="zk-detail-warning">`;
            step.notes.forEach(n => html += `<div>${n}</div>`);
            html += `</div>`;
        }

        html += `<br>`;
    });

    html += `
        <hr>
        <div class="zk-detail-title">Totaalresultaat</div>
        <div class="zk-detail-line"><span>Ameli:</span> <span>€ ${totals.ameli.toFixed(2)}</span></div>
        <div class="zk-detail-line"><span>Mutuelle:</span> <span>€ ${totals.mutuelle.toFixed(2)}</span></div>

        <div class="zk-detail-line" style="font-size:18px; font-weight:bold;">
            <span>U betaalt totaal:</span> <span>€ ${totals.user.toFixed(2)}</span>
        </div>
    `;

    html += `</div>`;
    elDetail.innerHTML = html;

    elTotalLabel.textContent = `€ ${totals.user.toFixed(2)}`;

    // waarschuwingen tonen
    let warn = "";
    if (state.mutuelle === 0) warn += "Geen mutuelle → risico bij specialist / opname. ";
    if (!state.traitant) warn += "Geen médecin traitant → strafkorting 35%. ";
    elTotalWarnings.textContent = warn;
}

/* ------------------------------------------------------------
   5. EVENTS KOPPELEN
------------------------------------------------------------ */
elScenarioSelect.addEventListener("change", zkRunSelectedScenario);

elStatus.addEventListener("change", zkRunSelectedScenario);
elMutuelle.addEventListener("change", zkRunSelectedScenario);
elAld.addEventListener("change", zkRunSelectedScenario);
elTraitant.addEventListener("change", zkRunSelectedScenario);
elPrivate.addEventListener("change", zkRunSelectedScenario);

/* ------------------------------------------------------------
   6. INIT
------------------------------------------------------------ */
zkInitScenarioSelector();
