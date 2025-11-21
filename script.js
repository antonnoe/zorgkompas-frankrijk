/* ============================================================
   NLFR Zorgkompas – COMPLETE ENGINE (v1.0 Final)
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {

    const totalValue = document.getElementById("zk-total-value");
    const warningsBox = document.getElementById("zk-total-warnings");
    const detailContainer = document.getElementById("zk-detail-container");

    /* ==========================
       INSTELLINGEN
       ========================== */
    function S() {
        return {
            profiel: document.getElementById("zk-profiel").value,
            mutuelle: parseFloat(document.getElementById("zk-mutuelle").value),
            ald: document.getElementById("zk-ald").checked,
            traitant: document.getElementById("zk-traitant").checked
        };
    }

    /* ==========================
       CONSTANTEN (OFFICIEEL)
       ========================== */
    const FRANCHISE = 1.00;           // €1 niet vergoedbaar
    const FORFAIT_JOUR = 20.00;       // ziekenhuisbed per dag

    const BR = {
        GP: 26.50,         // huisarts S1
        SPEC: 23.00,       // specialist BRSS
        KINE: 16.13,       // per sessie
        XRAY: 25.00,
        ECHO: 56.00,
        MRI: 90.00,
        BIOPSY: 95.00,
        CT: 150.00
    };

    const COST = {
        GP_S1: 26.50,
        GP_S2: 35.00,
        SPEC_S1: 50.00,
        SPEC_S2: 80.00,
        SPEC_OUT: 50.00,
        XRAY: 40.00,
        ECHO: 70.00,
        MRI: 300.00,
        BIOPSY: 150.00,
        CT: 450.00,
        ONCO_DIAG: 900.00,
        HIP: 2300.00,
        HERNIA: 1500.00,
        ONCO_OP: 6300.00
    };

    /* ============================================================
       UNIVERSAL FORMULA
       ============================================================ */
    function calc(brss, cost, ro, mutFactor, franchiseApplies = true) {

        // 1) Ameli BEFORE franchise
        let ameliGross = brss * ro;

        // 2) Franchise: gaat ALTIJD van AMELI → min 0
        let franchise = franchiseApplies ? FRANCHISE : 0;
        let ameliNet = Math.max(0, ameliGross - franchise);
        let franchiseUsed = Math.min(franchise, ameliGross);

        // 3) Ticket modérateur (rest van BRSS)
        const TICKET = Math.max(0, brss - ameliGross);

        // 4) Mutuelle dekt alleen ticket modérateur
        let mut = mutFactor > 0 ? TICKET : 0;

        // 5) Supplementen (kosten - BRSS) → patiënt of mutuelle
        let supplement = Math.max(0, cost - brss);
        let mutSupp = 0;

        if (mutFactor > 0) {
            const limit = brss * mutFactor - ameliGross;
            mutSupp = Math.min(supplement, Math.max(limit, 0));
        }

        let user = 
            cost               // totale kostprijs
            - ameliNet         // ameli netto
            - mut              // mutuelle ticket
            - mutSupp;         // mutuelle supplement

        return {
            ameli: ameliNet,
            mut: mut + mutSupp,
            user,
            franchiseUsed
        };
    }

    /* ============================================================
       SCENARIO’S
       ============================================================ */
    const SC = {

        /* ----------- CONSULTEN ------------- */

        gp_s1: () => {
            const s = S();
            let ro = s.ald ? 1 : (s.traitant ? 0.7 : 0.3);

            const r = calc(BR.GP, COST.GP_S1, ro, s.mutuelle);
            return out("Huisarts S1", BR.GP, COST.GP_S1, r, 
                "Franchise €1 is verplicht, nooit gedekt.");
        },

        gp_s2: () => {
            const s = S();
            let ro = s.ald ? 1 : (s.traitant ? 0.7 : 0.3);

            const r = calc(BR.GP, COST.GP_S2, ro, s.mutuelle);
            return out("Huisarts S2 (met supplement)", BR.GP, COST.GP_S2, r,
                "Secteur 2 supplementen vallen buiten BRSS.");
        },

        spec_s1: () => {
            const s = S();
            let ro = s.ald ? 1 : (s.traitant ? 0.7 : 0.3);

            const r = calc(BR.SPEC, COST.SPEC_S1, ro, s.mutuelle);
            return out("Specialist S1", BR.SPEC, COST.SPEC_S1, r);
        },

        spec_s2: () => {
            const s = S();
            let ro = s.ald ? 1 : (s.traitant ? 0.7 : 0.3);

            const r = calc(BR.SPEC, COST.SPEC_S2, ro, s.mutuelle);
            return out("Specialist S2 (supplementen)", BR.SPEC, COST.SPEC_S2, r,
                "Secteur 2 supplementen kunnen sterk oplopen.");
        },

        spec_out: () => {
            const s = S();
            const r = calc(BR.SPEC, COST.SPEC_OUT, 0.30, s.mutuelle);
            return out("Specialist (Buiten Parcours)", BR.SPEC, COST.SPEC_OUT, r,
                "Geen traitant → Ameli vergoedt 30% BRSS.");
        },


        /* ----------- PARAMEDISCH ------------- */

        kine_20: () => {
            const s = S();
            const totalBRSS = BR.KINE * 20;
            const totalCost = 16.13 * 20;

            let ro = s.ald ? 1 : 0.6;

            const r = calc(totalBRSS, totalCost, ro, s.mutuelle, false);

            // Franchise is 20 × €1
            const user = r.user + 20;

            return out("Kiné – 20 sessies", totalBRSS, totalCost,
                { ameli: r.ameli, mut: r.mut, user },
                "Franchise €20 nooit gedekt.");
        },


        /* ----------- DIAGNOSTIEK ------------- */
        diag_xray: () => diag("Röntgen", BR.XRAY, COST.XRAY),
        diag_echo: () => diag("Echo", BR.ECHO, COST.ECHO),
        diag_mri: () => diag("MRI", BR.MRI, COST.MRI),
        diag_biopsy: () => diag("Biopsie", BR.BIOPSY, COST.BIOPSY),
        diag_ctpet: () => diag("CT/PET", BR.CT, COST.CT),
        diag_onco: () => diag("Oncologie Diagnostiek", 200, COST.ONCO_DIAG),


        /* ----------- ZIEKENHUIS ------------- */

        hosp_public: () => {
            const s = S();
            const base = COST.HIP;
            const days = 5;
            const forfait = days * FORFAIT_JOUR;

            const ameli = base; // zware ingreep → 100%

            let mut = s.mutuelle > 0 ? forfait : 0;
            let userSupp = 0;  

            return out("Publiek Ziekenhuis", base, base + forfait,
                { ameli, mut, user: userSupp }, "");
        },

        hosp_private: () => {
            const s = S();
            const base = COST.HIP;
            const supp = 1200;
            const days = 5;
            const forfait = days * FORFAIT_JOUR;

            const ameli = base;
            let mut = s.mutuelle > 0 ? forfait : 0;

            let limit = base * s.mutuelle - ameli;
            let covered = Math.min(supp, Math.max(limit, 0));
            mut += covered;
            let user = supp - covered;

            return out("Privékliniek Secteur 2", base, base + supp + forfait,
                { ameli, mut, user },
                "Supplementen vaak hoog.");
        },

        hosp_hip: () => operation("Heupoperatie", COST.HIP, 1200),
        hosp_hernia: () => operation("Hernia-operatie", COST.HERNIA, 600),
        hosp_onco_op: () => operation("Onco-operatie", COST.ONCO_OP, 1800),


        /* ----------- SSR ------------- */

        ssr_21: () => ssr("SSR 21 dagen", 21),
        ssr_30: () => ssr("SSR 30 dagen", 30)
    };


    /* ============================================================
       HELPERFUNCTIES
       ============================================================ */

    function out(title, brss, cost, r, note = "") {
        return {
            title, brss, cost,
            ameli: r.ameli,
            mut: r.mut,
            user: r.user,
            note
        };
    }

    function diag(title, brss, cost) {
        const s = S();
        const ro = s.ald ? 1 : (s.traitant ? 0.7 : 0.3);
        const r = calc(brss, cost, ro, s.mutuelle, false);
        return out(title, brss, cost, r);
    }

    function operation(title, base, supp) {
        const s = S();
        const days = 5;
        const forfait = days * FORFAIT_JOUR;

        const ameli = base;
        let mut = s.mutuelle > 0 ? forfait : 0;

        let limit = base * s.mutuelle - ameli;
        let covered = Math.min(supp, Math.max(limit, 0));
        mut += covered;

        return out(title, base, base + supp + forfait,
            { ameli, mut, user: supp - covered });
    }

    function ssr(title, days) {
        const s = S();
        const cost = days * FORFAIT_JOUR;
        const mut = s.mutuelle > 0 ? cost : 0;
        const user = s.mutuelle > 0 ? 0 : cost;
        return out(title, 0, cost, { ameli: 0, mut, user });
    }

    /* ============================================================
       RENDER
       ============================================================ */

    document.querySelectorAll(".zk-card").forEach(card => {
        card.addEventListener("click", () => {
            const sc = card.dataset.scenario;
            const r = SC[sc]();

            totalValue.textContent = "€ " + r.user.toFixed(2);
            warningsBox.textContent = r.note;

            detailContainer.innerHTML = `
                <div class="zk-detail-box">
                    <div class="zk-detail-title">${r.title}</div>
                    <div class="zk-detail-line"><span>BRSS:</span><span>€ ${r.brss.toFixed(2)}</span></div>
                    <div class="zk-detail-line"><span>Kostprijs:</span><span>€ ${r.cost.toFixed(2)}</span></div>
                    <div class="zk-detail-line"><span>Ameli:</span><span>€ ${r.ameli.toFixed(2)}</span></div>
                    <div class="zk-detail-line"><span>Mutuelle:</span><span>€ ${r.mut.toFixed(2)}</span></div>
                    <div class="zk-detail-line"><span><strong>U betaalt:</strong></span><span><strong>€ ${r.user.toFixed(2)}</strong></span></div>
                    <div class="zk-detail-warning">${r.note}</div>
                </div>
            `;
        });
    });

});
