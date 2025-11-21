/* ============================================================
   NLFR ZORGKOMPAS – COMPLETE ENGINE (FINAL)
   Werkt met jouw nieuwe tegel-UI
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
    const totalValue = document.getElementById("zk-total-value");
    const warningsBox = document.getElementById("zk-total-warnings");
    const detailContainer = document.getElementById("zk-detail-container");

    /* ======================================
       PROFIELINSTELLINGEN (DASHBOARD)
       ====================================== */
    function settings() {
        return {
            profiel: document.getElementById("zk-profiel").value,
            mutuelle: parseFloat(document.getElementById("zk-mutuelle").value),
            ald: document.getElementById("zk-ald").checked,
            traitant: document.getElementById("zk-traitant").checked,
        };
    }

    /* ======================================
       ALGEMENE CONSTANTEN
       ====================================== */
    const FRANCHISE = 1.00;          // consult / fysio / medicijn
    const FORFAIT_JOUR = 20.00;      // ziekenhuis per dag

    const BRSS = {
        GP: 26.50,
        SPECIALIST: 23.00,
        KINE: 16.13,
        XRAY: 25.00,
        ECHO: 56.00,
        MRI: 90.00,
        BIOPSY: 95.00,
        CT_PET: 150.00
    };

    const REAL_COST = {
        GP_S1: 26.50,
        GP_S2: 35.00,
        SPEC_S1: 50.00,
        SPEC_S2: 80.00,
        SPEC_OUT: 50.00, // buiten parcours
        XRAY: 40.00,
        ECHO: 70.00,
        MRI: 300.00,
        BIOPSY: 150.00,
        CT_PET: 450.00,
        ONCO_DIAG: 900.00,
        HIP: 2300.00,
        HERNIA: 1500.00,
        ONCO_OP: 6300.00
    };

    /* ======================================
       HOOFDFORMULE
       ====================================== */
    function calcBase(brss, cost, ro, mutuelleFactor) {
        const ameli = brss * ro;
        const ticket = cost - ameli;

        let mutCover = 0;
        if (mutuelleFactor > 0) {
            const mutLimit = brss * mutuelleFactor - ameli;
            mutCover = Math.min(ticket, Math.max(mutLimit, 0));
        }

        const user = cost - ameli - mutCover;
        return { ameli, mutCover, user };
    }

    /* ======================================
       SCENARIO DEFINITIES
       ====================================== */
    const scenarios = {
        gp_s1: () => {
            const s = settings();
            const brss = BRSS.GP;
            const cost = REAL_COST.GP_S1;

            let ro = s.ald ? 1.0 : (s.traitant ? 0.7 : 0.3);

            const base = calcBase(brss, cost, ro, s.mutuelle);
            const franchise = FRANCHISE;

            return {
                title: "Huisarts S1",
                brss,
                cost,
                ameli: base.ameli - franchise,
                mut: base.mutCover,
                user: base.user + franchise,
                note: "Franchise is wettelijk verplicht, mutuelle mag niet vergoeden."
            };
        },

        gp_s2: () => {
            const s = settings();
            const brss = BRSS.GP;
            const cost = REAL_COST.GP_S2;
            let ro = s.ald ? 1.0 : (s.traitant ? 0.7 : 0.3);
            const base = calcBase(brss, cost, ro, s.mutuelle);

            return {
                title: "Huisarts S2 (met supplement)",
                brss,
                cost,
                ameli: base.ameli - FRANCHISE,
                mut: base.mutCover,
                user: base.user + FRANCHISE,
                note: "Supplementen vallen buiten BRSS: mutuelle dekt slechts deel."
            };
        },

        spec_s1: () => {
            const s = settings();
            const brss = BRSS.SPECIALIST;
            const cost = REAL_COST.SPEC_S1;
            let ro = s.ald ? 1.0 : (s.traitant ? 0.7 : 0.3);
            const base = calcBase(brss, cost, ro, s.mutuelle);

            return {
                title: "Specialist S1",
                brss,
                cost,
                ameli: base.ameli - FRANCHISE,
                mut: base.mutCover,
                user: base.user + FRANCHISE,
                note: ""
            };
        },

        spec_s2: () => {
            const s = settings();
            const brss = BRSS.SPECIALIST;
            const cost = REAL_COST.SPEC_S2;
            let ro = s.ald ? 1.0 : (s.traitant ? 0.7 : 0.3);
            const base = calcBase(brss, cost, ro, s.mutuelle);

            return {
                title: "Specialist S2 (met supplementen)",
                brss,
                cost,
                ameli: base.ameli - FRANCHISE,
                mut: base.mutCover,
                user: base.user + FRANCHISE,
                note: "Let op: Secteur 2 supplementen kunnen hoog oplopen."
            };
        },

        spec_out: () => {
            const s = settings();
            const brss = BRSS.SPECIALIST;
            const cost = REAL_COST.SPEC_OUT;
            let ro = 0.30; // altijd 30% BRSS buiten parcours

            const base = calcBase(brss, cost, ro, s.mutuelle);

            return {
                title: "Specialist (Buiten Parcours)",
                brss,
                cost,
                ameli: base.ameli - FRANCHISE,
                mut: base.mutCover,
                user: base.user + FRANCHISE,
                note: "Geen verwijzing → Ameli vergoedt slechts 30% BRSS."
            };
        },

        kine_20: () => {
            const s = settings();
            const brss = BRSS.KINE * 20;
            const cost = REAL_COST.KINE ? REAL_COST.KINE : 322.60;

            const ro = s.ald ? 1.0 : 0.6;
            let ameli = brss * ro;

            const mut = s.mutuelle > 0 ? brss - ameli : 0;
            const user = 20 * FRANCHISE;

            return {
                title: "Kiné (20 sessies)",
                brss,
                cost,
                ameli,
                mut,
                user,
                note: "Franchise (€20 totaal) nooit vergoed."
            };
        },

        // =============================
        // Diagnostiek
        // =============================
        diag_xray: () => basicDiag("Röntgen", BRSS.XRAY, REAL_COST.XRAY),
        diag_echo: () => basicDiag("Echo", BRSS.ECHO, REAL_COST.ECHO),
        diag_mri: () => basicDiag("MRI", BRSS.MRI, REAL_COST.MRI),
        diag_biopsy: () => basicDiag("Biopsie", BRSS.BIOPSY, REAL_COST.BIOPSY),
        diag_ctpet: () => basicDiag("CT / PET", BRSS.CT_PET, REAL_COST.CT_PET),

        diag_onco: () => {
            return basicDiag("Oncologische Diagnostiek", 200.00, REAL_COST.ONCO_DIAG);
        },

        // =============================
        // Ziekenhuis & Operaties
        // =============================
        hosp_public: () => hospitalCalc("Publiek ziekenhuis", 0),
        hosp_private: () => hospitalCalc("Privékliniek (Secteur 2)", 1200),
        hosp_hip: () => hospitalOp("Heupoperatie", REAL_COST.HIP, 1200),
        hosp_hernia: () => hospitalOp("Hernia Operatie", REAL_COST.HERNIA, 600),
        hosp_onco_op: () => hospitalOp("Oncologische operatie", REAL_COST.ONCO_OP, 1800),

        // =============================
        // Revalidatie
        // =============================
        ssr_21: () => {
            const s = settings();
            return {
                title: "SSR — 21 dagen",
                brss: 0,
                cost: 21 * FORFAIT_JOUR,
                ameli: 0,
                mut: s.mutuelle > 0 ? 21 * FORFAIT_JOUR : 0,
                user: s.mutuelle > 0 ? 0 : 21 * FORFAIT_JOUR,
                note: ""
            };
        },

        ssr_30: () => {
            const s = settings();
            return {
                title: "SSR — 30 dagen",
                brss: 0,
                cost: 30 * FORFAIT_JOUR,
                ameli: 0,
                mut: s.mutuelle > 0 ? 30 * FORFAIT_JOUR : 0,
                user: s.mutuelle > 0 ? 0 : 30 * FORFAIT_JOUR,
                note: ""
            };
        }
    };

    /* ======================================
       HELPER: BASIC DIAGNOSTIEK
       ====================================== */
    function basicDiag(title, brss, cost) {
        const s = settings();
        const ro = s.ald ? 1.0 : (s.traitant ? 0.7 : 0.3);
        const base = calcBase(brss, cost, ro, s.mutuelle);

        return {
            title,
            brss,
            cost,
            ameli: base.ameli,
            mut: base.mutCover,
            user: base.user,
            note: ""
        };
    }

    /* ======================================
       HELPER: ZIEKENHUIS BASIS
       ====================================== */
    function hospitalCalc(title, supplements) {
        const s = settings();
        const base = REAL_COST.HIP;
        const ameli = base; // zware ingrepen → 100% BRSS

        let mut = 0;
        let userSupp = supplements;

        if (s.mutuelle > 0) {
            mut += 5 * FORFAIT_JOUR;
            const limit = base * s.mutuelle - ameli;
            const suppCovered = Math.min(supplements, Math.max(limit, 0));
            mut += suppCovered;
            userSupp -= suppCovered;
        }

        const user = 5 * FORFAIT_JOUR + userSupp;

        return {
            title,
            brss: base,
            cost: base + supplements + 5 * FORFAIT_JOUR,
            ameli,
            mut,
            user,
            note: ""
        };
    }

    /* ======================================
       HELPER: OPERATIES
       ====================================== */
    function hospitalOp(title, baseCost, supplements) {
        const s = settings();
        const ameli = baseCost; // zware ingreep
        let mut = 5 * FORFAIT_JOUR;
        let userSupp = supplements;

        if (s.mutuelle > 0) {
            const limit = baseCost * s.mutuelle - ameli;
            const suppCovered = Math.min(supplements, Math.max(limit, 0));
            mut += suppCovered;
            userSupp -= suppCovered;
        }

        return {
            title,
            brss: baseCost,
            cost: baseCost + supplements + 5 * FORFAIT_JOUR,
            ameli,
            mut,
            user: userSupp,
            note: ""
        };
    }

    /* ======================================
       CLICK EVENTS
       ====================================== */
    document.querySelectorAll(".zk-card").forEach(card => {
        card.addEventListener("click", () => {
            const key = card.dataset.scenario;
            const r = scenarios[key]();

            totalValue.textContent = "€ " + r.user.toFixed(2);
            warningsBox.textContent = r.note || "";

            detailContainer.innerHTML = `
                <div class="zk-detail-box">
                    <div class="zk-detail-title">${r.title}</div>
                    <div class="zk-detail-line"><span>BRSS:</span><span>€ ${r.brss.toFixed(2)}</span></div>
                    <div class="zk-detail-line"><span>Kostprijs:</span><span>€ ${r.cost.toFixed(2)}</span></div>
                    <div class="zk-detail-line"><span>Ameli:</span><span>€ ${r.ameli.toFixed(2)}</span></div>
                    <div class="zk-detail-line"><span>Mutuelle:</span><span>€ ${r.mut.toFixed(2)}</span></div>
                    <div class="zk-detail-line"><span>U betaalt:</span><span><strong>€ ${r.user.toFixed(2)}</strong></span></div>
                    <div class="zk-detail-warning">${r.note}</div>
                </div>
            `;
        });
    });
});
