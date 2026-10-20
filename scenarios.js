/* ============================================================
   ZORGKOMPAS SCENARIO DATABASE
   Alle bedragen en percentages staan in ZK_CONFIG hieronder.
   De bron is Peil, het parameterregister van Communities Abroad;
   peil/waarden.json is de kopie, tests/peil.test.mjs bewaakt dat
   dit blok daarmee overeenkomt. Pas bedragen alleen hier aan.
   Stand van de controle: zie PEIL_STAND in scenarioEngine.js.
   ============================================================ */

export const ZK_CONFIG = {
    jaar: 2026,

    // Basis van vergoeding (BRSS), in euro
    consult_huisarts:   { waarde: 30.00, peil: "p.fr.secu.brss_consult_medecin_traitant", bron: "ameli.fr, tarifs conventionnels médecins, acte G, secteur 1", datum: "2026-10-19" },
    kine_per_sessie:    { waarde: 16.58, peil: "p.fr.secu.brss_kine_per_sessie", bron: "ameli.fr, AMK 7,5 x 2,21 euro", datum: "2026-10-19" },
    specialist_apc:     { waarde: 60.00, peil: "p.fr.secu.brss_specialist_apc", bron: "ameli.fr, tarifs conventionnels médecins, acte APC (buiten psychiater en neuroloog)", datum: "2026-10-19" },

    // Dagbijdrage bij opname, euro per dag, sinds 1 maart 2026
    forfait_journalier: { ziekenhuis: 23, psychiatrie: 17, peil: "p.fr.secu.forfait_journalier", bron: "ameli.fr, forfait hospitalier, arrêté du 27 februari 2026", datum: "2026-10-19" },

    // Vergoedingspercentages van de Sécurité sociale
    vergoeding: {
        standaard:       0.70,  // p.fr.secu.vergoedingspercentage_standaard
        kine:            0.60,  // p.fr.secu.vergoeding_kine_en_medicatie
        medicatie:       0.65,  // p.fr.secu.vergoeding_kine_en_medicatie (SMR majeur of important)
        buiten_parcours: 0.30,  // p.fr.secu.vergoeding_zonder_medecin_traitant
        bron: "service-public.fr F165 en F1069, ameli.fr tableau récapitulatif des taux de remboursement",
        datum: "2026-10-19"
    },

    // Eigen risico per handeling (nog niet in Peil opgenomen)
    franchise: { consult: 2.00, medicatie_per_doosje: 1.00, kine_per_sessie: 2.00 },

    // Operatie met BRSS boven deze grens wordt volledig vergoed (nog niet in Peil opgenomen)
    operatie_volledig_boven: 120
};

const EUR = n => "€" + String(n).replace(".", ",");

// Korte uitleg bij de dagbijdrage, gebruikt bij de scenario's en in de woordenlijst
export const ZK_FORFAIT_UITLEG =
    `Verplichte dagbijdrage bij opname: ${EUR(ZK_CONFIG.forfait_journalier.ziekenhuis)} per dag in ziekenhuis of kliniek, ` +
    `${EUR(ZK_CONFIG.forfait_journalier.psychiatrie)} per dag in de psychiatrie (sinds 1 maart 2026). ` +
    `Geen dagbijdrage bij thuishospitalisatie (HAD), complémentaire santé solidaire en AME, arbeidsongeval en in een Ehpad of USLD.`;

const FORFAIT_NOTE =
    `Liggeld ${EUR(ZK_CONFIG.forfait_journalier.ziekenhuis)} per dag (psychiatrie ${EUR(ZK_CONFIG.forfait_journalier.psychiatrie)}). ` +
    `Geen liggeld bij thuishospitalisatie (HAD), complémentaire santé solidaire en AME, arbeidsongeval en in een Ehpad of USLD.`;

export const ZK_SCENARIOS = [

    /* --- LICHT --- */
    {
        id: "griep",
        label: "Griep / Luchtweginfectie",
        description: "Standaard traject: Bezoek huisarts + antibiotica + pijnstillers.",
        accuracy: "high", // Voorspelbaarheid
        accuracy_text: "Zeer nauwkeurig (Vaste tarieven)",
        steps: [
            {
                type: "consult",
                role: "Huisarts",
                brss: ZK_CONFIG.consult_huisarts.waarde,
                cost: ZK_CONFIG.consult_huisarts.waarde,
                notes: [`Standaard consult ${EUR(ZK_CONFIG.consult_huisarts.waarde)}`],
                lex: ["BRSS", "Secteur 1"]
            },
            {
                type: "medicatie",
                category: "Antibiotica & Paracetamol",
                items: [
                    { name: "Amoxicilline", brss: 4.90, cost: 4.90 },
                    { name: "Doliprane", brss: 2.10, cost: 2.10 }
                ],
                lex: ["Franchise", "Vignette"]
            }
        ]
    },

    /* --- MIDDEL --- */
    {
        id: "fysio_rug",
        label: "Rugklachten (20x fysio)",
        description: "Langdurig traject met huisarts, röntgenfoto en reeks behandelingen.",
        accuracy: "high",
        accuracy_text: "Nauwkeurig",
        steps: [
            {
                type: "consult",
                role: "Huisarts",
                brss: ZK_CONFIG.consult_huisarts.waarde,
                cost: ZK_CONFIG.consult_huisarts.waarde,
                lex: ["Parcours de soins"]
            },
            {
                type: "diagnostiek",
                name: "Röntgenfoto wervelkolom",
                brss: 45.00,
                cost_public: 45.00,
                cost_private: { base: 45.00, supplement: 25.00 },
                lex: ["Secteur 2", "Dépassements"]
            },
            {
                type: "kine",
                sessions: 20,
                brss: ZK_CONFIG.kine_per_sessie.waarde, // Tarief per sessie
                cost: ZK_CONFIG.kine_per_sessie.waarde,
                notes: ["Franchise stapelt op (€2 per sessie)"],
                lex: ["Auxiliaire médical"]
            }
        ]
    },

    /* --- ZWAAR / COMPLEX --- */
    {
        id: "hernia",
        label: "Hernia Operatie",
        description: "Specialist, MRI, Operatie (3 dagen) en revalidatie.",
        accuracy: "medium",
        accuracy_text: "Gemiddeld (Afhankelijk van chirurg)",
        steps: [
            {
                type: "consult",
                role: "Neurochirurg",
                brss: ZK_CONFIG.specialist_apc.waarde, // Basis specialist (APC)
                cost: 90.00, // Veel voorkomend tarief
                lex: ["OPTAM", "Secteur 2"]
            },
            {
                type: "diagnostiek",
                name: "MRI Scan",
                brss: 69.00,
                cost_public: 69.00,
                cost_private: { base: 69.00, supplement: 40.00 },
                lex: ["Forfait Technique"]
            },
            {
                type: "operation",
                name: "Operatie + 3 dagen ziekenhuis",
                brss: 650.00,
                cost_public: 650.00,
                cost_private: { base: 650.00, supplement: 400.00 }, // Ereloonchirurg
                days: 3,
                forfait_jour: ZK_CONFIG.forfait_journalier.ziekenhuis,
                notes: [FORFAIT_NOTE],
                lex: ["Forfait Journalier", "Honoraires"]
            },
            {
                type: "kine",
                sessions: 10,
                brss: ZK_CONFIG.kine_per_sessie.waarde,
                cost: ZK_CONFIG.kine_per_sessie.waarde
            }
        ]
    },

    /* --- COMPLEX / ONCOLOGIE --- */
    {
        id: "oncologie",
        label: "Oncologisch Traject (6 mnd)",
        description: "Complexe casus met chemo, radiotherapie en opnames. Hoge impact ALD.",
        accuracy: "low",
        accuracy_text: "Laag (Enorm afhankelijk van specifiek behandelplan)",
        steps: [
            {
                type: "consult",
                role: "Huisarts (Diagnose)",
                brss: ZK_CONFIG.consult_huisarts.waarde,
                cost: ZK_CONFIG.consult_huisarts.waarde,
                ald: true // Start ALD aanvraag
            },
            {
                type: "diagnostiek",
                name: "Biopsie + Scans",
                brss: 250.00,
                cost_public: 250.00,
                cost_private: { base: 250.00, supplement: 150.00 },
                ald: true
            },
            {
                type: "consult",
                role: "Oncoloog",
                brss: ZK_CONFIG.specialist_apc.waarde,
                cost: 100.00, // Vaak hoog supplement
                ald: true,
                lex: ["Dépassements"]
            },
            {
                type: "treatment",
                name: "Chemotherapie (Cyclus)",
                cost: 3500.00,
                brss: 3500.00, // 100% vergoed
                ald: true,
                lex: ["Derde betaler", "ALD"]
            },
            {
                type: "SSR",
                name: "Verblijf Revalidatiekliniek",
                days: 30,
                forfait_jour: ZK_CONFIG.forfait_journalier.ziekenhuis, // Dit blijft vaak voor eigen rekening!
                notes: [FORFAIT_NOTE],
                lex: ["SSR", "Forfait Journalier"]
            }
        ]
    }
];
