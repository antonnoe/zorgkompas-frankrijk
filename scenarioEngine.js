/* ============================================================
   ZORGKOMPAS REKEN ENGINE - FINAL
   Geschikt voor alle scenario's (Ambu, Chemo, Privé, etc.)
   ============================================================ */

import { ZK_SCENARIOS } from "./scenarios.js";

// ------------------------------------------------------------
// 1. SCENARIO OPHALEN
// ------------------------------------------------------------
export function zkGetScenario(id) {
    return ZK_SCENARIOS.find(s => s.id === id) || null;
}

// ------------------------------------------------------------
// 2. HOOFDBEREKENING (LOOP DOOR STAPPEN)
// ------------------------------------------------------------
export function zkRunScenario(scenarioId, state) {
    const scenario = zkGetScenario(scenarioId);
    if (!scenario) return null;

    let totalUser = 0;
    let totalAmeli = 0;
    let totalMutuelle = 0;
    
    const calculatedSteps = scenario.steps.map(step => {
        const result = calculateStep(step, state);
        
        totalUser += result.cost_user;
        totalAmeli += result.cost_ameli;
        totalMutuelle += result.cost_mutuelle;

        return result;
    });

    return {
        scenario: scenario,
        steps: calculatedSteps,
        totals: {
            user: round(totalUser),
            ameli: round(totalAmeli),
            mutuelle: round(totalMutuelle)
        }
    };
}

// ------------------------------------------------------------
// 3. BEREKENING PER STAP
// ------------------------------------------------------------
function calculateStep(step, state) {
    let cost = 0;
    let brss = step.brss || 0;
    let notes = step.notes ? (Array.isArray(step.notes) ? [...step.notes] : [step.notes]) : [];
    
    // A. KOSTEN BEPALEN (Publiek vs Privé logica)
    // --------------------------------------------------------
    if (step.type === "consult") {
        cost = step.cost;
    } 
    else if (step.type === "medicatie") {
        step.items.forEach(i => { cost += i.cost; });
        brss = step.items.reduce((sum, item) => sum + item.brss, 0);
    } 
    else if (step.type === "kine") {
        cost = step.cost * step.sessions;
        brss = step.brss * step.sessions;
    }
    else if (step.type === "diagnostiek" || step.type === "operation") {
        // HIER ZAT DE FOUT: we checken nu state.private (niet isPrivate)
        if (state.private && step.cost_private) {
            cost = step.cost_private.base + (step.cost_private.supplement || 0);
            notes.push("Privé tarief (incl. supplementen)");
        } else {
            cost = step.cost_public || step.cost; 
        }
        
        if (step.type === "operation") {
            const liggeld = (step.days || 0) * (step.forfait_jour || 0);
            cost += liggeld; 
        }
    }
    else if (step.type === "SSR") {
        cost = step.days * step.forfait_jour;
        brss = 0; 
    }
    else if (step.type === "ambulance") {
        cost = step.base + (step.distance_km * step.supplement_km);
        brss = cost; // Vaak basis voor vergoeding
    }
    else if (step.type === "treatment") { // Voor chemo/bestraling
        cost = step.cost;
        // Bij chemo is BRSS vaak gelijk aan kosten (gereguleerd)
        if(!brss) brss = cost; 
    }
    else if (step.type === "urgence") {
        cost = state.private ? (step.cost_private || 0) : (step.cost_public || 0);
    }

    // B. AMELI (SÉCU) DEKKING
    // --------------------------------------------------------
    let ameliRate = 0.70; // Standaard

    // Is er ALD? (Chronisch)
    // Check zowel de algemene state als de stap (sommige chemo is altijd ALD)
    const isAld = state.ald || step.ald;

    if (isAld) {
        ameliRate = 1.0;
        if (!notes.includes("ALD Dekking")) notes.push("ALD Dekking (100% basis)");
    } 
    else {
        // Specifieke rates als GEEN ALD
        if (step.type === "kine") ameliRate = 0.60;
        if (step.type === "medicatie") ameliRate = 0.65;
        if (step.type === "ambulance") ameliRate = 0.65;
        if (step.type === "operation" && step.brss > 120) ameliRate = 1.0; // Zware operaties
    }

    // Strafkorting (Geen huisarts)
    if (!state.traitant && !isAld && step.role !== 'huisarts' && step.type === 'consult') {
        ameliRate = 0.30;
        notes.push("Strafkorting (buiten parcours)");
    }

    let ameliPay = brss * ameliRate;

    // C. FRANCHISES (Eigen risico)
    // --------------------------------------------------------
    let franchise = 0;
    if (step.type === "consult") franchise = 1.00;
    if (step.type === "medicatie") franchise = (step.items || []).length * 0.50;
    if (step.type === "kine") franchise = step.sessions * 0.50;
    if (step.type === "ambulance") franchise = 2.00;
    
    // SSR Forfait wordt NOOIT vergoed door Ameli
    if (step.type === "SSR") ameliPay = 0;

    ameliPay = Math.max(0, ameliPay - franchise);

    // D. MUTUELLE DEKKING
    // --------------------------------------------------------
    let mutuellePay = 0;
    
    if (state.mutuelle > 0) {
        let mutuelleLimit = (brss * state.mutuelle); 
        
        // Bij SSR en Forfait Journalier dekt de mutuelle vaak de werkelijke kosten
        if (step.type === "SSR" || (step.type === "operation" && step.forfait_jour)) {
             mutuelleLimit = cost; 
        }

        let remainder = cost - ameliPay;
        mutuellePay = Math.min(remainder, mutuelleLimit - ameliPay);

        // Mutuelle mag franchise niet dekken (tenzij liggeld)
        if (step.type !== "SSR" && step.type !== "operation") {
            const maxLegalCover = cost - ameliPay - franchise;
            if (mutuellePay > maxLegalCover) mutuellePay = maxLegalCover;
        }
    }

    mutuellePay = Math.max(0, mutuellePay);

    // E. REST VOOR GEBRUIKER
    // --------------------------------------------------------
    let userPay = cost - ameliPay - mutuellePay;

    return {
        raw: step,
        label: step.label || formatLabel(step),
        cost_user: round(userPay),
        cost_ameli: round(ameliPay),
        cost_mutuelle: round(mutuellePay),
        notes: notes
    };
}

// ------------------------------------------------------------
// 4. HULPFUNCTIES
// ------------------------------------------------------------
function round(n) {
    return Math.round(n * 100) / 100;
}

function formatLabel(step) {
    if(step.type === "consult") return `Consult ${step.role || ''}`;
    if(step.type === "medicatie") return `Medicatie (${step.items?.length || 0} items)`;
    if(step.type === "kine") return `Fysiotherapie (${step.sessions} sessies)`;
    return step.type;
}
