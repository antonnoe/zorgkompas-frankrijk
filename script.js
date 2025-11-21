/* =======================================================================
   ZORGKOMPAS FRANKRIJK — SCRIPT ARCHITECTUUR (MVP2)
   ======================================================================= */

/* ---------------- STATE ---------------- */

const state = {
    profile: "worker",
    mutuelle: 2.0,
    ald: false,
    traitant: true,
    activeScenario: null,
};


/* ---------------- DASHBOARD INPUTS ---------------- */

document.getElementById("profile-status").addEventListener("change", e => {
    state.profile = e.target.value;
    updateTotals();
});

document.getElementById("profile-mutuelle").addEventListener("change", e => {
    state.mutuelle = parseFloat(e.target.value);
    updateTotals();
});

document.getElementById("profile-ald").addEventListener("change", e => {
    state.ald = e.target.checked;
    updateTotals();
});

document.getElementById("profile-traitant").addEventListener("change", e => {
    state.traitant = e.target.checked;
    updateTotals();
});


/* ---------------- SCENARIO CLICK HANDLERS ---------------- */

document.querySelectorAll(".scenario").forEach(card => {
    card.addEventListener("click", () => {
        const sc = card.dataset.scenario;
        state.activeScenario = sc;
        runScenario(sc);
    });
});


/* ---------------- BEREKENINGEN PER SCENARIO ---------------- */

function runScenario(sc) {

    let userCost = 0;

    switch(sc) {

        case "gp_s1":
            userCost = calcGP(26.5, false);
            break;

        case "gp_s2":
            userCost = calcGP(40, true);
            break;

        case "spec_s1":
            userCost = calcSpecialist(50, false);
            break;

        case "spec_s2":
            userCost = calcSpecialist(80, true);
            break;

        case "spec_out":
            userCost = calcSpecialist(50, false, true);
            break;

        case "kine_20":
            userCost = calcKine(20);
            break;

        case "med_ald":
            userCost = calcMedicine("ald");
            break;

        case "med_65":
            userCost = calcMedicine("65");
            break;

        case "med_30":
            userCost = calcMedicine("30");
            break;

        case "med_15":
            userCost = calcMedicine("15");
            break;

        case "med_diab":
            userCost = calcMedicine("diab");
            break;

        case "diag_xray":
            userCost = calcDiag("xray");
            break;

        case "diag_echo":
            userCost = calcDiag("echo");
            break;

        case "diag_mri":
            userCost = calcDiag("mri");
            break;

        case "diag_onco":
            userCost = calcOnco();
            break;

        case "hosp_public":
            userCost = calcHosp("public");
            break;

        case "hosp_private":
            userCost = calcHosp("private");
            break;

        case "hosp_hip":
            userCost = calcHosp("hip");
            break;

        case "hosp_hernia":
            userCost = calcHosp("hernia");
            break;

        case "hosp_onco_op":
            userCost = calcHosp("onco_op");
            break;

        case "ssr_21":
            userCost = calcSSR(21, false);
            break;

        case "ssr_30_private":
            userCost = calcSSR(30, true);
            break;

        default:
            userCost = 0;
            break;
    }

    updateTotals(userCost);
}


/* ---------------- CALC PLACEHOLDERS (worden in update uitgebreid) ---------------- */

function calcGP(cost, supplement) {
    let brss = 26.5;
    let ro = state.traitant ? 0.7 : 0.3;
    let ameli = brss * ro;
    let mut = Math.max(0, (brss * state.mutuelle) - ameli);
    let supplementAmt = supplement ? 15 : 0;
    return cost + supplementAmt - ameli - mut;
}

function calcSpecialist(cost, supplement, out = false) {
    let brss = 23.0;
    let ro = out ? 0.3 : (state.traitant ? 0.7 : 0.3);
    let ameli = brss * ro;
    let mut = Math.max(0, (brss * state.mutuelle) - ameli);
    let supp = supplement ? 40 : 0;
    return cost + supp - ameli - mut;
}

function calcKine(n) {
    let brss = 16.13;
    let total = brss * n;
    let ro = state.ald ? 1.0 : 0.6;
    let ameli = total * ro;
    let mut = total - ameli;
    let franchise = n * 1;
    return total - ameli - mut + franchise;
}

function calcMedicine(type) {
    switch(type) {
        case "ald": return 0;
        case "65": return 15;
        case "30": return 20;
        case "15": return 25;
        case "diab": return 40;
    }
}

function calcDiag(type) {
    if (type === "xray") return 15;
    if (type === "echo") return 20;
    if (type === "mri") return 80;
    return 200;
}

function calcOnco() {
    return 350; /* placeholder */
}

function calcHosp(type) {
    if (type === "public") return 100;
    if (type === "private") return 400;
    if (type === "hip") return 850;
    if (type === "hernia") return 550;
    if (type === "onco_op") return 1200;
    return 0;
}

function calcSSR(days, priv) {
    let forfait = days * 20;
    if (state.mutuelle > 0) return 0;
    return forfait;
}


/* ---------------- UPDATE TOTALS ---------------- */

function updateTotals(userCost = 0) {

    document.getElementById("zk-total-cost").textContent =
        "€ " + userCost.toFixed(2);

    const alerts = [];
    if (!state.traitant) alerts.push("Geen traitant → slechts 30% BRSS");
    if (state.mutuelle < 2.0) alerts.push("Lage mutuelle → risico op supplementen");

    document.getElementById("zk-total-alerts").innerHTML =
        alerts.join("<br>");
}
