/* ============================================================
   ZORGKOMPAS SCENARIO DATABASE (2025 EDITIE)
   Bedragen zijn indicatief o.b.v. tarieven 2024/2025.
   ============================================================ */

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
                brss: 30.00, // Nieuw tarief 2025
                cost: 30.00,
                notes: ["Standaard consult €30"],
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
                brss: 30.00,
                cost: 30.00,
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
                brss: 16.13, // Tarief per sessie
                cost: 16.13,
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
                brss: 55.00, // Basis specialist (APC)
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
                forfait_jour: 20.00,
                lex: ["Forfait Journalier", "Honoraires"]
            },
            {
                type: "kine",
                sessions: 10,
                brss: 16.13,
                cost: 16.13
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
                brss: 30.00,
                cost: 30.00,
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
                brss: 60.00,
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
                forfait_jour: 20.00, // Dit blijft vaak voor eigen rekening!
                lex: ["SSR", "Forfait Journalier"]
            }
        ]
    }
];
