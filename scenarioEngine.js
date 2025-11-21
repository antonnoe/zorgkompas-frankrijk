/* ============================================================
   NLFR Zorgkompas — ScenarioEngine V2.0
   Koppelt scenario’s aan de bestaande rekencore.
   ============================================================ */

import { ZK_SCENARIOS } from "./scenarios.js";

/* ------------------------------------------------------------
   1. SCENARIO VINDEN OP BASIS VAN ID
------------------------------------------------------------ */
export function zkGetScenario(id) {
    return ZK_SCENARIOS.find(s => s.id === id) || null;
}

/* ------------------------------------------------------------
   2. BASIS-BEREKENING PER STAP (consult, diagnostiek, SSR, …)
------------------------------------------------------------ */
export function zkCalcStep(step, userState) {

    const result = {
        label: step.type,
        cost_user: 0,
        cost_ameli: 0,
        cost_mutuelle: 0,
        notes: [],
        raw: step
    };

    /* -------------------------
       CONSULT (huisarts/spec)
    ------------------------- */
    if (step.type === "consult") {

        const brss = step.brss;
        const fee = step.cost;
        const has_traitant = userState.traitant;
        const ald = userState.ald;

        // AMELI-percentage
        let rate = ald ? 1.0 : 0.70;
        if (!has_traitant && !ald) rate = 0.30;

        const ameli_bruto = brss * rate;
        const ameli_net = Math.max(0, ameli_bruto - 2.00); // Forfait consult €2

        // Mutuelle
        const mut_limit = brss * userState.mutuelle;
        let mut_pay = 0;

        if (userState.mutuelle > 0) {
            const max_mut = mut_limit - ameli_bruto;
            const gap = fee - ameli_bruto;
            mut_pay = Math.min(gap, max_mut);
            mut_pay = Math.max(mut_pay, 0);
        }

        const user = fee - ameli_net - mut_pay;

        result.cost_user = round(user);
        result.cost_ameli = round(ameli_net);
        result.cost_mutuelle = round(mut_pay);

        if (!has_traitant) result.notes.push("35% strafkorting (buiten parcours).");
        if (ald) result.notes.push("ALD: 100% BRSS.");
    }

    /* -------------------------
       MEDICATIE
    ------------------------- */
    if (step.type === "medicatie") {
        let total_user = 0;
        let total_ameli = 0;
        let total_mut = 0;

        for (let item of step.items) {
            const brss = item.brss;
            const cost = item.cost;

            // AMELI — afhankelijk van ALD
            let rate = userState.ald ? 1.0 : 0.65;
            let ameli_bruto = brss * rate;
            let ameli_net = Math.max(0, ameli_bruto - 1.00); // franchise €1 doos

            // Mutuelle mag *NOOIT* franchise vergoeden
            let mut_pay = 0;
            if (userState.mutuelle > 0) {
                const mut_limit = brss * userState.mutuelle;
                mut_pay = Math.min(cost - ameli_bruto, mut_limit - ameli_bruto);
                mut_pay = Math.max(mut_pay, 0);
            }

            const user = cost - ameli_net - mut_pay;

            total_user += user;
            total_ameli += ameli_net;
            total_mut += mut_pay;
        }

        result.cost_user = round(total_user);
        result.cost_ameli = round(total_ameli);
        result.cost_mutuelle = round(total_mut);

        result.notes.push("Franchise €1 per verpakking, nooit door Mutuelle gedekt.");
    }

    /* -------------------------
       KINÉ
    ------------------------- */
    if (step.type === "kine") {
        const sess = step.sessions;
        const brss = step.brss;
        const cost = step.cost;

        // AMELI
        let rate = userState.ald ? 1.0 : 0.60;
        const ameli_bruto = sess * brss * rate;
        const franchise = sess * 1.00; // €1 per sessie
        const ameli_net = Math.max(0, ameli_bruto - franchise);

        // Mutuelle
        let mut = 0;
        if (userState.mutuelle >= 1.0) {
            mut = (sess * brss) - ameli_bruto; // ticket moderateur
        }

        const user = (sess * cost) - ameli_net - mut;

        result.cost_user = round(user);
        result.cost_ameli = round(ameli_net);
        result.cost_mutuelle = round(mut);

        result.notes.push(`Franchise: €${franchise.toFixed(2)} (nooit gedekt).`);
    }

    /* -------------------------
       DIAGNOSTIEK (röntgen, echo, MRI)
    ------------------------- */
    if (step.type === "diagnostiek") {

        const brss = step.brss;

        const cost_public = step.cost_public;
        const cost_private = step.cost_private.base + (step.cost_private.supplement || 0);

        const fee = (userState.isPrivate ? cost_private : cost_public);

        // AMELI: 70%
        let rate = 0.70;
        if (userState.ald) rate = 1.0;

        const ameli_bruto = brss * rate;
        const ameli_net = ameli_bruto; // diagnostiek heeft geen forfait

        // Mutuelle
        let mut_limit = brss * userState.mutuelle;
        let mut_pay = Math.min(fee - ameli_bruto, mut_limit - ameli_bruto);
        mut_pay = Math.max(mut_pay, 0);

        const user = fee - ameli_net - mut_pay;

        result.cost_user = round(user);
        result.cost_ameli = round(ameli_net);
        result.cost_mutuelle = round(mut_pay);

        if (userState.isPrivate) result.notes.push("Privé: supplementen mogelijk.");
        if (userState.ald) result.notes.push("ALD: 100% BRSS.");
    }

    /* -------------------------
       OPERATIE + opname
    ------------------------- */
    if (step.type === "operation") {

        const days = step.days;
        const forfait = days * step.forfait_jour;

        const cost_public = step.cost_public;
        const cost_private = step.cost_private.base + (step.cost_private.supplement || 0);

        const fee = userState.isPrivate ? cost_private : cost_public;

        const brss = step.brss;

        // AMELI — zware operatie => 100%
        const ameli_pay = brss;

        // Mutuelle
        let mut = 0;

        // forfait journalier **wel** door mutuelle
        mut += forfait;

        if (userState.mutuelle > 0) {
            const mut_limit = brss * userState.mutuelle;
            const max_mut_supp = mut_limit - ameli_pay;
            const supp = userState.isPrivate ? step.cost_private.supplement : 0;

            mut += Math.min(supp, max_mut_supp);
        }

        const user = fee + forfait - ameli_pay - mut;

        result.cost_user = round(user);
        result.cost_ameli = round(ameli_pay);
        result.cost_mutuelle = round(mut);

        if (userState.isPrivate) result.notes.push("Privékliniek: hoge supplementen.");
    }

    /* -------------------------
       SSR
    ------------------------- */
    if (step.type === "SSR") {
        const days = step.days;
        const forfait = days * step.forfait_jour; // €20 per dag

        // Ameli: SSR = 100% medische zorg, maar forfait NIET
        const ameli = 0;

        // Mutuelle: dekt forfait volledig
        const mut = userState.mutuelle > 0 ? forfait : 0;

        const user = forfait - mut;

        result.cost_user = round(user);
        result.cost_ameli = ameli;
        result.cost_mutuelle = mut;

        if (user > 0) result.notes.push("Geen mutuelle → €20 per dag zelf betalen.");
    }

    return result;
}

/* ------------------------------------------------------------
   3. TOTAALSCENARIO BEREKENEN
------------------------------------------------------------ */
export function zkRunScenario(id, userState) {
    const scenario = zkGetScenario(id);
    if (!scenario) return null;

    const results = [];

    let total_user = 0;
    let total_ameli = 0;
    let total_mutuelle = 0;

    for (const step of scenario.steps) {
        const r = zkCalcStep(step, userState);
        results.push(r);

        total_user += r.cost_user;
        total_ameli += r.cost_ameli;
        total_mutuelle += r.cost_mutuelle;
    }

    return {
        scenario,
        steps: results,
        totals: {
            user: round(total_user),
            ameli: round(total_ameli),
            mutuelle: round(total_mutuelle)
        }
    };
}

/* ------------------------------------------------------------
   HULPFUNCTIE
------------------------------------------------------------ */
function round(n) {
    return Math.round(n * 100) / 100;
}
