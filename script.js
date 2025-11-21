/* ================================================================
   NLFR Zorgkompas – Core JS (One-Page Dashboard)
   ================================================================ */

/* ---------------------- STATE ---------------------- */
const state = {
    profile: "worker",
    mutuelle: 2.0,
    ald: false,
    traitant: true,
    activeScenario: null
};


/* ---------------------- DASHBOARD INPUTS ---------------------- */

document.getElementById("zk-profiel").addEventListener("change", e => {
    state.profile = e.target.value;
    updateTotals();
});

document.getElementById("zk-mutuelle").addEventListener("change", e => {
    state.mutuelle = parseFloat(e.target.value);
    updateTotals();
});

document.getElementById("zk-ald").addEventListener("change", e => {
    state.ald = e.target.checked;
    updateTotals();
});

document.getElementById("zk-traitant").addEventListener("change", e => {
    state.traitant = e.target.checked;
    updateTotals();
});



/* ---------------------- CARD CLICK HANDLING ---------------------- */

document.querySelectorAll(".zk-card").forEach(card => {
    card.addEventListener("click", () => {
        const sc = card.dataset.scenario;
        state.activeScenario = sc;
        loadScenarioDetail(sc);
        const cost = runScenario(sc);
        updateTotals(cost);
    });
});



/* ---------------------- DETAIL PANEL TEMPLATE ---------------------- */

function loadScenarioDetail(sc) {
    const container = document.getElementById("zk-detail-container");

    const titles = {
        gp_s1: "Huisarts – Secteur 1",
        gp_s2: "Huisarts – Secteur 2",
        spec_s1: "Specialist – Secteur 1",
        spec_s2: "Specialist – Secteur 2",
        spec_out: "Specialist – Buiten Parcours",
        kine_20: "Fysiotherapie – 20 sessies",
        med_ald: "Medicijnen 100% (ALD)",
        med_65: "Medicijnen 65%",
        med_30: "Medicijnen 30%",
        med_15: "Medicijnen 15%",
        med_diab: "Diabetespakket",
        diag_xray: "Röntgen",
        diag_echo: "Echo",
        diag_mri: "MRI",
        diag_biopsy: "Biopsie",
        diag_ctpet: "CT / PET",
        diag_onco: "Oncologie Diagnostiek",
        hosp_public: "Ziekenhuis – Publiek",
        hosp_private: "Ziekenhuis – Privékliniek",
        hosp_hip: "Heupoperatie",
        hosp_hernia: "Hernia-operatie",
        hosp_onco_op: "Oncologische operatie",
        ssr_21: "Revalidatie – 21 dagen publiek",
        ssr_30: "Revalidatie – 30 dagen privé"
    };

    container.innerHTML = `
        <div class="zk-detail-box">
            <div class="zk-detail-title">${titles[sc]}</div>
            <div id="zk-detail-lines"></div>
            <div id="zk-detail-warning"></div>
        </div>
    `;
}



/* ---------------------- CALCULATORS ---------------------- */

function runScenario(sc) {

    switch(sc) {

        /* ===== CONSULTEN ===== */
        case "gp_s1": return calcConsult(26.5, 0);
        case "gp_s2": return calcConsult(26.5, 15);

        case "spec_s1": return calcConsult(50, 0, true);
        case "spec_s2": return calcConsult(80, 40, true);
        case "spec_out": return calcConsult(50, 0, true, true);


        /* ===== PARAMEDISCH ===== */
        case "kine_20": return calcKine(20);

        case "med_ald": return calcMedicine("ald");
        case "med_65": return calcMedicine("65");
        case "med_30": return calcMedicine("30");
        case "med_15": return calcMedicine("15");
        case "med_diab": return calcMedicine("diab");


        /* ===== DIAGNOSTIEK ===== */
        case "diag_xray": return calcDiag("xray");
        case "diag_echo": return calcDiag("echo");
        case "diag_mri": return calcDiag("mri");
        case "diag_biopsy": return calcDiag("biopsy");
        case "diag_ctpet": return calcDiag("ctpet");
        case "diag_onco": return calcDiag("onco");


        /* ===== ZIEKENHUIS ===== */
        case "hosp_public": return calcHosp("public");
        case "hosp_private": return calcHosp("private");
        case "hosp_hip": return calcHosp("hip");
        case "hosp_hernia": return calcHosp("hernia");
        case "hosp_onco_op": return calcHosp("onco_op");


        /* ===== REVALIDATIE ===== */
        case "ssr_21": return calcSSR(21, false);
        case "ssr_30": return calcSSR(30, true);

        default: return 0;
    }
}



/* ---------------------- CONSULT CALC ---------------------- */

function calcConsult(brss, supplement, isSpec = false, out = false) {
    let fee = isSpec ? brss : brss;
    let total = fee + supplement;

    let ro = out ? 0.3 : (state.traitant ? 0.7 : 0.3);
    if (state.ald) ro = 1.0;

    let ameli = brss * ro;
    let mutLimit = brss * state.mutuelle;
    let mutuelle = Math.max(0, mutLimit - ameli);

    let user = total - (ameli + mutuelle);

    renderDetail([
        ["BRSS", euro(brss)],
        ["Supplementen", euro(supplement)],
        ["Ameli", euro(ameli)],
        ["Mutuelle", euro(mutuelle)],
        ["Totale Eigen Bijdrage", euro(user)]
    ]);

    return user;
}



/* ---------------------- KINÉ ---------------------- */

function calcKine(n) {
    const brss = 16.13;
    const total = n * brss;
    const franchise = n * 1;

    let ro = state.ald ? 1.0 : 0.6;
    let ameli = total * ro;
    let mutuelle = total - ameli;
    let user = franchise;

    renderDetail([
        ["Aantal Sessies", n],
        ["Totale BRSS", euro(total)],
        ["Franchise (nooit gedekt)", euro(franchise)],
        ["Ameli", euro(ameli)],
        ["Mutuelle", euro(mutuelle)],
        ["U betaalt", euro(user)]
    ]);

    return user;
}



/* ---------------------- MEDICIJNEN ---------------------- */

function calcMedicine(type) {
    let user = {
        ald: 0,
        "65": 10,
        "30": 18,
        "15": 25,
        diab: 40
    }[type];

    renderDetail([
        ["Categorie", type],
        ["Uw bijdrage (indicatie)", euro(user)]
    ]);

    return user;
}



/* ---------------------- DIAGNOSTIEK ---------------------- */

function calcDiag(type) {

    const prices = {
        xray: 20,
        echo: 35,
        mri: 80,
        biopsy: 120,
        ctpet: 250,
        onco: 350
    };

    const user = prices[type];

    renderDetail([
        ["Type", type],
        ["Indicatieve Eigen Bijdrage", euro(user)]
    ]);

    return user;
}



/* ---------------------- ZIEKENHUIS ---------------------- */

function calcHosp(type) {
    const values = {
        public: 100,
        private: 350,
        hip: 850,
        hernia: 550,
        onco_op: 1200
    };

    const user = values[type];

    renderDetail([
        ["Ziekenhuis Scenario", type],
        ["Eigen bijdrage (indicatie)", euro(user)]
    ]);

    return user;
}



/* ---------------------- SSR ---------------------- */

function calcSSR(days, priv) {
    let raw = days * 20;
    let user = (state.mutuelle > 0) ? 0 : raw;

    renderDetail([
        ["Dagen", days],
        ["Forfait Journalier", euro(raw)],
        ["Mutuelle dekt forfait", state.mutuelle > 0 ? "Ja" : "Nee"],
        ["U betaalt", euro(user)]
    ]);

    return user;
}



/* ---------------------- DETAIL RENDER ---------------------- */

function renderDetail(lines) {
    const box = document.getElementById("zk-detail-lines");

    box.innerHTML = lines
        .map(row =>
            `<div class="zk-detail-line"><span>${row[0]}</span><span>${row[1]}</span></div>`
        )
        .join("");
}



/* ---------------------- TOTAL RENDER ---------------------- */

function updateTotals(cost = 0) {
    document.getElementById("zk-total-value").textContent = euro(cost);

    const warn = [];

    if (!state.traitant) warn.push("Geen médecin traitant → slechts 30% BRSS");
    if (state.mutuelle < 2.0) warn.push("Mutuelle <200% → risico op supplementen");
    if (state.profile === "resident") warn.push("PUMa → let op CSM-heffing");

    document.getElementById("zk-total-warnings").innerHTML =
        warn.join("<br>");
}



/* ---------------------- UTIL ---------------------- */

function euro(v) {
    return "€ " + parseFloat(v).toFixed(2).replace(".", ",");
}
