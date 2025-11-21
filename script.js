/* ============================================================
   ZORGKOMPAS SCRIPT.JS – V2.0
   ============================================================ */

import { ZK_SCENARIOS } from "./scenarios.js";

// ------------------------------------------------------------
// STATE
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
// HELPERS
// ------------------------------------------------------------
const € = (v) => "€ " + v.toFixed(2).replace(".", ",");

// ------------------------------------------------------------
// INIT SCENARIO DROPDOWN
// ------------------------------------------------------------
function initScenarioDropdown() {
    const select = document.getElementById("zk-scenario-select");
    ZK_SCENARIOS.forEach(s => {
        const opt = document.createElement("option");
        opt.value = s.id;
        opt.textContent = s.label;
        select.appendChild(opt);
    });
}

// ------------------------------------------------------------
// CALCULATION ENGINE (super-compact & stable)
// ------------------------------------------------------------
function calcScenario(scenario) {
    let totalUser = 0;

    scenario.steps.forEach(step => {

        switch (step.type) {

            case "consult":
                totalUser += calcConsult(step);
                break;

            case "medicatie":
                totalUser += calcMedication(step);
                break;

            case "kine":
                totalUser += calcKine(step);
                break;

            case "diagnostiek":
                totalUser += calcDiagnostic(step);
                break;

            case "operation":
                totalUser += calcOperation(step);
                break;

            case "SSR":
                totalUser += step.days * step.forfait_jour;
                break;

            case "ambulance":
                totalUser += calcAmbulance(step);
                break;

            case "urgence":
                // Spoed kost user niets (ticket modérateur afhankelijk)
                break;

            case "traitement":
                totalUser += step.cost;
                break;
        }

    });

    return totalUser;
}

// ------------------------------------------------------------
// SUBCALC ENGINES
// ------------------------------------------------------------

function calcConsult(step) {
    const brss = step.brss || 25;
    let ameliRate = ZK_STATE.ald ? 1 : 0.70;

    if (!ZK_STATE.traitant && step.role !== "huisarts" && !ZK_STATE.ald) {
        ameliRate = 0.30;
    }

    const ameli = brss * ameliRate;
    const mutLimit = brss * ZK_STATE.mutuelle;

    let mutuelle = 0;
    let user = step.cost - ameli;

    if (ZK_STATE.mutuelle > 0) {
        mutuelle = Math.min(user, mutLimit - ameli);
        user = Math.max(0, user - mutuelle);
    }

    return user + 2; // forfait
}

function calcMedication(step) {
    // franchise 1€/doosje
    const count = step.items.length;
    return count * 1.00;
}

function calcKine(step) {
    return step.sessions * step.franchise;
}

function calcDiagnostic(step) {
    const cost = ZK_STATE.private ? (step.cost_private.base + (step.cost_private.supplement || 0)) : step.cost_public;
    const brss = step.brss;

    const ameli = brss * (ZK_STATE.ald ? 1 : 0.70);
    const mutLimit = brss * ZK_STATE.mutuelle;

    let mutuelle = Math.min(cost - ameli, mutLimit - ameli);
    if (ZK_STATE.mutuelle === 0) mutuelle = 0;

    const user = Math.max(0, cost - ameli - mutuelle);
    return user;
}

function calcOperation(step) {
    const base = ZK_STATE.private ? (step.cost_private.base + step.cost_private.supplement) : step.cost_public;
    let user = base - step.brss;

    user += step.days * step.forfait_jour;
    return Math.max(0, user);
}

function calcAmbulance(step) {
    return step.base + step.distance_km * step.supplement_km;
}

// ------------------------------------------------------------
// RENDER SCENARIO OUTPUT
// ------------------------------------------------------------
function renderScenario(s) {
    const box = document.getElementById("zk-output");
    box.innerHTML = `
        <div class="zk-detail-box">
            <h2>${s.label}</h2>
            <p>${s.description}</p>
        </div>
    `;
}

// ------------------------------------------------------------
// UPDATE TOTAL
// ------------------------------------------------------------
function updateTotal() {
    if (!ZK_STATE.scenario) return;

    const scenario = ZK_SCENARIOS.find(s => s.id === ZK_STATE.scenario);
    const total = calcScenario(scenario);

    document.getElementById("zk-total-value").textContent = €(total);
    renderScenario(scenario);
}

// ------------------------------------------------------------
// EVENT LISTENERS
// ------------------------------------------------------------
document.getElementById("zk-status").onchange = e => {
    ZK_STATE.status = e.target.value;
    updateTotal();
};

document.getElementById("zk-mutuelle").onchange = e => {
    ZK_STATE.mutuelle = Number(e.target.value);
    updateTotal();
};

document.getElementById("zk-opt-ald").onchange = e => {
    ZK_STATE.ald = e.target.checked;
    updateTotal();
};

document.getElementById("zk-opt-traitant").onchange = e => {
    ZK_STATE.traitant = e.target.checked;
    updateTotal();
};

document.getElementById("zk-opt-private").onchange = e => {
    ZK_STATE.private = e.target.checked;
    updateTotal();
};

document.getElementById("zk-scenario-select").onchange = e => {
    ZK_STATE.scenario = e.target.value;
    updateTotal();
};

// ------------------------------------------------------------
// INITIALIZE
// ------------------------------------------------------------
initScenarioDropdown();
