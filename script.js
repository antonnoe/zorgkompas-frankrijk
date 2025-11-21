/* ============================================================
   NLFR ZORGKOMPAS – ENGINE
   ============================================================ */

/* ------------------------------
   CONSTANTEN
--------------------------------*/
const BRSS_SPEC = 23.00;           // Specialist S2
const BRSS_GP = 26.50;             // Huisarts
const BRSS_HIP = 2300.00;          // Heupoperatie basis
const FORFAIT_CONSULT = 2.00;      // Forfait per consult
const FORFAIT_JOUR = 20.00;        // Dagforfait hospitalisatie
const FRANCHISE_MED = 1.00;        // Per doosje/handeling
const FYSIO_TARIEF = 16.13;        // Per sessie

/* ------------------------------
   STATE
--------------------------------*/
let state = {
    profile: "worker",
    mutuelle: 2.0,
    ald: false,
    traitant: true,
    hospitalType: "pub",   // pub = publiek, priv = privésecteur 2
    specCost: 50           // default specialist
};

/* ============================================================
   HULPFUNCTIES
   ============================================================ */

function toggleDetails(id) {
    document.getElementById(id).classList.toggle("open");
}

function setHospital(type) {
    state.hospitalType = type;

    const pub = document.getElementById("btn-hosp-pub");
    const priv = document.getElementById("btn-hosp-priv");

    if (type === "pub") {
        pub.classList.add("active");
        priv.classList.remove("active");
    } else {
        priv.classList.add("active");
        pub.classList.remove("active");
    }

    updateSystem();
}

/* ============================================================
   UPDATE SYSTEM (CENTRALE FUNCTIE)
   ============================================================ */

function updateSystem() {
    // 1. Lees inputs
    state.profile = document.getElementById("profile-status").value;
    state.mutuelle = parseFloat(document.getElementById("profile-mutuelle").value);
    state.ald = document.getElementById("profile-ald").checked;
    state.traitant = document.getElementById("setting-traitant").checked;
    state.specCost = parseFloat(document.getElementById("input-f2-cost").value);

    // 2. Update instroom-tekst
    updateEntryText();

    // 3. Specialist
    calcSpecialist();

    // 4. Fysio
    calcPhysio();

    // 5. Ziekenhuis
    calcHospital();

    // 6. Revalidatie
    calcRehab();
}

/* ============================================================
   TEKST FASE 1
   ============================================================ */

function updateEntryText() {
    const title = document.getElementById("txt-entry-title");
    const desc = document.getElementById("txt-entry-desc");

    if (state.profile === "worker") {
        title.textContent = "Profiel: Werkende of Zelfstandige (URSSAF)";
        desc.textContent = "U valt onder PUMa via uw premies (URSSAF/loon). U hebt recht op een Carte Vitale. De inschrijvingsprocedure duurt soms lang.";
    } else if (state.profile === "pensioner") {
        title.textContent = "Profiel: Verdragsgerechtigd (S1)";
        desc.textContent = "Frankrijk betaalt uw zorg, Nederland verrekent dit via de CAK-bijdrage. U betaalt géén CSG/CRDS over uw pensioen.";
    } else {
        title.textContent = "Profiel: Inwoner (Niet-actief / PUMa)";
        desc.textContent = "U valt onder PUMa op basis van uw woonplaats. Bij hoger vermogen kan de CSM-heffing (Cotisation Subsidiaire Maladie) gelden.";
    }
}

/* ============================================================
   FASE 2 – SPECIALIST
   ============================================================ */

function calcSpecialist() {
    const fee = state.specCost;

    const brss = (fee === 30) ? BRSS_GP : BRSS_SPEC;

    // Ameli-percentage (parcours de soins)
    let ro_rate = state.ald ? 1.0 : 0.70;
    if (!state.traitant && !state.ald) ro_rate = 0.30;

    let ameli_bruto = brss * ro_rate;

    // Forfait €2 die van Ameli-deel wordt afgetrokken
    let ameli_net = ameli_bruto - FORFAIT_CONSULT;
    if (ameli_net < 0) ameli_net = 0;

    // Mutuelle-limiet op basis van BRSS × percentage
    let mut_limit = brss * state.mutuelle;

    let mut_pay = 0;
    if (state.mutuelle > 0) {
        let gap = fee - ameli_bruto;
        let max_mut = mut_limit - ameli_bruto;
        mut_pay = Math.max(0, Math.min(gap, max_mut));
    }

    // Eigen deel
    let user = fee - ameli_net - mut_pay;
    if (user < 0) user = 0;

    // Output
    document.getElementById("res-f2-ameli").textContent = "€ " + ameli_net.toFixed(2);
    document.getElementById("res-f2-mut").textContent = "€ " + mut_pay.toFixed(2);
    document.getElementById("res-f2-user").textContent = "€ " + user.toFixed(2);

    // Details
    let html = `
        <div class="fz-detail-row"><span>BRSS (officieel tarief):</span><span>€ ${brss.toFixed(2)}</span></div>
        <div class="fz-detail-row"><span>Ameli percentage:</span><span>${(ro_rate * 100).toFixed(0)}%</span></div>
    `;

    if (!state.traitant && !state.ald)
        html += `<div class="fz-detail-row" style="color:red;">Zonder huisarts: 30% van BRSS</div>`;

    if (state.ald)
        html += `<div class="fz-detail-row" style="color:green;">ALD: 100% BRSS voor relevante zorg</div>`;

    document.getElementById("det-f2").innerHTML = html;
}

/* ============================================================
   FASE 3 – FYSIO
   ============================================================ */

function calcPhysio() {
    const sessions = 20;
    const total = sessions * FYSIO_TARIEF;
    const franchise = sessions * FRANCHISE_MED;

    let ro_rate = state.ald ? 1.0 : 0.60;
    let ameli_bruto = total * ro_rate;

    let ameli_net = ameli_bruto - franchise;
    if (ameli_net < 0) ameli_net = 0;

    let mut_pay = 0;
    if (state.mutuelle >= 1.0) {
        mut_pay = total - ameli_bruto; // ticket modérateur
        if (mut_pay < 0) mut_pay = 0;
    }

    let user = total - ameli_net - mut_pay;
    if (user < 0) user = 0;

    document.getElementById("res-f3-ameli").textContent = "€ " + ameli_net.toFixed(2);
    document.getElementById("res-f3-mut").textContent = "€ " + mut_pay.toFixed(2);
    document.getElementById("res-f3-user").textContent = "€ " + user.toFixed(2);
}

/* ============================================================
   FASE 4 – ZIEKENHUIS
   ============================================================ */

function calcHospital() {
    const base = BRSS_HIP;
    const days = 5;
    const forfait = days * FORFAIT_JOUR;

    let supplements = (state.hospitalType === "priv") ? 1200 : 0;
    document.getElementById("row-supplements").style.display =
        (supplements > 0) ? "flex" : "none";

    // Ameli vergoedt 100% van BRSS bij zware ingreep
    const ameli = base;

    let mut_pay = 0;

    if (state.mutuelle > 0) {
        // Forfait journalier (wordt gedekt)
        mut_pay += forfait;

        // Ruimte voor supplementen: (BRSS × mutuelle%) – ameli
        let mut_limit = base * state.mutuelle;
        let available = mut_limit - ameli;

        let covered_supp = Math.min(supplements, available);
        if (covered_supp > 0) mut_pay += covered_supp;
    }

    const total = base + forfait + supplements;
    let user = total - ameli - mut_pay;
    if (user < 0) user = 0;

    document.getElementById("res-f4-ameli").textContent = "€ " + ameli.toFixed(2);
    document.getElementById("res-f4-mut").textContent = "€ " + mut_pay.toFixed(2);

    const userEl = document.getElementById("res-f4-user");
    userEl.textContent = "€ " + user.toFixed(2);
    userEl.style.color = (user > 100) ? "#c0392b" : "#27ae60";

    // Details
    let html = `
        <div class="fz-detail-row"><span>BRSS (basis):</span><span>€ ${base.toFixed(2)}</span></div>
        <div class="fz-detail-row"><span>Forfait journalier:</span><span>€ ${forfait.toFixed(2)}</span></div>
    `;

    if (supplements > 0) {
        html += `<div class="fz-detail-row"><span>Supplementen:</span><span>€ ${supplements.toFixed(2)}</span></div>`;
    }

    document.getElementById("det-f4").innerHTML = html;
}

/* ============================================================
   FASE 5 – REVALIDATIE
   ============================================================ */

function calcRehab() {
    const textEl = document.getElementById("res-f5-text");

    if (state.mutuelle > 0) {
        textEl.innerHTML = `<span style="color:green;">Volledig vergoed door uw Mutuelle. Uw kosten: €0</span>`;
    } else {
        textEl.innerHTML = `<span style="color:red;">Geen Mutuelle → €600 eigen bijdrage</span>`;
    }
}

/* ============================================================
   STARTUP
   ============================================================ */

updateSystem();

/* ============================================================
   API-PLUGINS (OPTIONEEL TOEKOMSTIG)
   ============================================================ */

// Voor toekomstige uitbreidingen:
async function fetchAmeliTariffs() {
    // Placeholder voor API koppeling
}

async function fetchMutuelleMatrix() {
    // Placeholder
}

async function fetchHospitalData() {
    // Placeholder
}
