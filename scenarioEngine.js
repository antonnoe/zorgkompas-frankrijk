/* ============================================================
   ZORGKOMPAS ENGINE (2025 LOGIC)
   ============================================================ */

import { ZK_SCENARIOS } from "./scenarios.js";

export function zkGetScenario(id) {
    return ZK_SCENARIOS.find(s => s.id === id);
}

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
        scenario,
        steps: calculatedSteps,
        totals: {
            user: round(totalUser),
            ameli: round(totalAmeli),
            mutuelle: round(totalMutuelle)
        }
    };
}

function calculateStep(step, state) {
    let cost = 0;
    let brss = step.brss || 0;
    let notes = step.notes ? [...step.notes] : [];
    let lex = step.lex || [];

    // 1. KOSTEN BEPALEN
    if (step.type === "consult") {
        cost = step.cost;
    } 
    else if (step.type === "medicatie") {
        step.items.forEach(i => cost += i.cost);
        brss = step.items.reduce((sum, i) => sum + i.brss, 0);
    } 
    else if (step.type === "kine") {
        cost = step.cost * step.sessions;
        brss = step.brss * step.sessions;
    }
    else if (step.type === "diagnostiek" || step.type === "operation") {
        if (state.private && step.cost_private) {
            cost = step.cost_private.base + (step.cost_private.supplement || 0);
            if(step.cost_private.supplement > 0) notes.push("Privé supplement");
        } else {
            cost = step.cost_public || step.cost; 
        }
        
        if (step.type === "operation" && step.days) {
            cost += (step.days * step.forfait_jour); 
        }
    }
    else if (step.type === "SSR") {
        cost = step.days * step.forfait_jour;
        brss = 0; // SSR verblijf valt niet onder BRSS
    }
    else if (step.type === "treatment") {
        cost = step.cost;
        brss = step.brss || cost;
    }

    // 2. AMELI (SÉCU)
    let ameliRate = 0.70; // Standaard 70%

    // ALD Check (State of Stap)
    const isAld = state.ald || step.ald;

    if (isAld) {
        ameliRate = 1.0;
        if (!notes.includes("ALD 100%")) notes.push("ALD 100% Dekking");
    } else {
        if (step.type === "kine") ameliRate = 0.60;
        if (step.type === "medicatie") ameliRate = 0.65; 
        if (step.type === "operation" && brss > 120) ameliRate = 1.0;
    }

    // Strafkorting (Geen traitant)
    if (!state.traitant && !isAld && step.role !== 'Huisarts' && step.type === 'consult') {
        ameliRate = 0.30;
        notes.push("Strafkorting (buiten parcours)");
    }

    let ameliPay = brss * ameliRate;

    // 3. FRANCHISES 2025
    let franchise = 0;
    // Consult: verhoogd naar €2
    if (step.type === "consult" || step.type === "diagnostiek") franchise = 2.00;
    // Medicatie: verhoogd naar €1 per doosje
    if (step.type === "medicatie") franchise = (step.items || []).length * 1.00;
    // Kine: €2 per sessie (limiet per jaar bestaat, maar hier per geval)
    if (step.type === "kine") franchise = step.sessions * 2.00;
    
    if (step.type === "SSR") ameliPay = 0; // Forfait journalier niet door Ameli

    ameliPay = Math.max(0, ameliPay - franchise);

    // 4. MUTUELLE
    let mutuellePay = 0;
    if (state.mutuelle > 0) {
        let limit = brss * state.mutuelle;
        
        // SSR & Operatie liggeld: Mutuelle dekt 'Frais Réels' (volledige kosten) vaak
        if (step.type === "SSR" || (step.type === "operation" && step.forfait_jour)) {
            limit = cost; 
        }

        let gap = cost - ameliPay;
        mutuellePay = Math.min(gap, limit - ameliPay);

        // Mutuelle mag franchise NIET dekken (behalve bij liggeld ziekenhuis)
        if (step.type !== "SSR" && !(step.type === "operation" && step.days)) {
            const maxLegal = cost - ameliPay - franchise;
            if (mutuellePay > maxLegal) mutuellePay = maxLegal;
        }
    }
    mutuellePay = Math.max(0, mutuellePay);

    // 5. USER
    let userPay = cost - ameliPay - mutuellePay;

    return {
        label: step.name || step.label || `${capitalize(step.type)} ${step.role || ''}`,
        cost_user: userPay,
        cost_ameli: ameliPay,
        cost_mutuelle: mutuellePay,
        cost_total: cost,
        notes: notes,
        lex: lex
    };
}

function round(n) { return Math.round(n * 100) / 100; }
function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
