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
        // Honoraria en verblijf tijdens een opname: eigen bijdrage 15 tot 25 procent (art. R160-5 1° en 2° CSS), dus 75 tot 85 procent vergoed.
        // Het exacte UNCAM-percentage staat nog niet in Peil (p.fr.secu.vergoeding_opname is te_verifieren); 0,80 is een aanname die binnen de bandbreedte blijft.
        opname:          0.80,
        bron: "service-public.fr F165 en F1069, ameli.fr tableau récapitulatif des taux de remboursement",
        datum: "2026-10-19"
    },

    // Franchises en participation forfaitaire (euro). Plafonds gelden sinds 1 oktober 2026 per jaar; de tool rekent per zorgtraject en past de dag- en jaarplafonds niet toe.
    franchises_en_participation: {
        participation_forfaitaire: 2,            // per consult of handeling (max 4 keer, dus 8 euro, per dag bij dezelfde zorgverlener)
        franchise_geneesmiddel_per_verpakking: 1,
        franchise_paramedisch_per_handeling: 1,  // bijvoorbeeld kine
        franchise_paramedisch_max_per_dag: 4,
        franchise_vervoer: 4,
        franchise_vervoer_max_per_dag: 8,
        jaarplafond_franchises: 70,
        jaarplafond_participations: 70,
        plafonds_geldig_vanaf: "2026-10-01",
        peil: "p.fr.secu.franchise_medicale, p.fr.secu.participation_forfaitaire en p.fr.secu.franchise_transport",
        bron: "service-public.fr F21760 en F165, art. D160-6 tot D160-11 CSS, décret 2026-858",
        datum: "2026-10-20"
    },

    // Contrat responsable, mutuelle (art. L871-1, R871-1, R871-2 CSS; service-public F20314 en F165, vérifié 01-10-2026)
    mutuelle: {
        niveaus: [0, 1, 1.5, 2, 3],   // garantie als veelvoud van de BR, Sécu inbegrepen; 400 procent vervalt
        niet_optam_min: 0.2,           // niet-OPTAM: dépassement hoogstens (OPTAM-dekking min 20 procent BR) ...
        niet_optam_max_depassement: 1, // ... en hoogstens 100 procent BR
        bron: "art. R871-2 2° CSS; service-public F20314",
        datum: "2026-10-20"
    },

    // Forfait bij zware handelingen (actes lourds): komt in de plaats van het ticket modérateur.
    forfait_actes_lourds: {
        bedrag: 32,    // euro
        drempel: 120,  // tarief vanaf 120 euro
        geldig_vanaf: "2026-04-01",
        peil: "p.fr.secu.forfait_actes_lourds",
        bron: "art. R160-16 I CSS, décret 2026-228; service-public F165",
        datum: "2026-10-20"
    }
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
                soort: "beeldvorming",
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
                notes: [`Franchise stapelt op (${EUR(ZK_CONFIG.franchises_en_participation.franchise_paramedisch_per_handeling)} per sessie)`],
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
                soort: "beeldvorming",
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
