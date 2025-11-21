/* ============================================================
   ZORGKOMPAS SCENARIO ENGINE V2.0
   Fundament voor alle scenario's (lichte → zware zorgpaden)
   ============================================================ */

export const ZK_SCENARIOS = [

/* ============================================================
   1. LICHTE & ALLEDAAGSE SCENARIO'S
   ============================================================ */

{
    id: "griep",
    category: "licht",
    label: "Griep / Luchtweginfectie",
    description: "Een eenvoudig traject: huisarts + medicatie. Perfect om het systeem te leren kennen.",
    steps: [
        {
            type: "consult",
            role: "huisarts",
            secteur: "S1",
            brss: 26.50,
            cost: 26.50,
            notes: "Huisartsconsult volgens BRSS.",
            lex: ["BRSS", "médecin traitant", "forfait"]
        },
        {
            type: "medicatie",
            category: "antibiotica/koortsremmers",
            items: [
                { name: "Paracetamol", brss: 2.50, cost: 3.50 },
                { name: "Ibuprofen", brss: 2.20, cost: 3.20 }
            ],
            notes: "Franchise €1 per doosje geldt altijd.",
            lex: ["franchise", "mutuelle", "ALD"]
        }
    ]
},

{
    id: "spierpijn",
    category: "licht",
    label: "Lichte rugpijn / Spierverrekking",
    description: "Huisarts + pijnstillers + beperkte kiné.",
    steps: [
        {
            type: "consult",
            role: "huisarts",
            secteur: "S1",
            brss: 26.50,
            cost: 26.50
        },
        {
            type: "medicatie",
            category: "pijnstillers",
            items: [
                { name: "Ibuprofen", brss: 2.20, cost: 3.20 }
            ]
        },
        {
            type: "kine",
            sessions: 3,
            brss: 16.13,
            cost: 16.13,
            franchise: 1.00
        }
    ]
},

/* ============================================================
   2. MIDDELZWARE SCENARIO'S
   ============================================================ */

{
    id: "rugpijn_kine20",
    category: "middel",
    label: "Rugpijn → Arts → 20 sessies kiné",
    description: "Een traject dat veel voorkomt. Hier leert de gebruiker hoe de franchise oploopt.",
    steps: [
        {
            type: "consult",
            role: "huisarts",
            secteur: "S1",
            brss: 26.50,
            cost: 26.50
        },
        {
            type: "diagnostiek",
            modality: "röntgen",
            brss: 25.00,
            cost_public: 38.00,
            cost_private: { base: 38.00, supplement: 20.00 },
            lex: ["dépassements", "secteur 2", "OPTAM"]
        },
        {
            type: "kine",
            sessions: 20,
            brss: 16.13,
            cost: 16.13,
            franchise: 1.00
        }
    ]
},

{
    id: "buikpijn_echo",
    category: "middel",
    label: "Buikpijn → Echo diagnostiek",
    description: "Huisarts → medicatie → echo. Perfect om privé/publiek verschil te tonen.",
    steps: [
        {
            type: "consult",
            role: "huisarts",
            brss: 26.50,
            cost: 26.50
        },
        {
            type: "medicatie",
            category: "krampstillers",
            items: [
                { name: "Spasmomen", brss: 3.10, cost: 5.00 }
            ]
        },
        {
            type: "diagnostiek",
            modality: "echo",
            brss: 56.00,
            cost_public: 65.00,
            cost_private: { base: 65.00, supplement: 35.00 }
        }
    ]
},

{
    id: "enkel_breuk",
    category: "middel",
    label: "Gebroken enkel (thuis ongeval)",
    description: "Spoed + röntgen + gips + nazorg + kiné.",
    steps: [
        {
            type: "ambulance",
            base: 130.00,
            supplement_km: 2.10,
            distance_km: 12,
            lex: ["AMBULANCE", "forfait"]
        },
        {
            type: "urgence",
            brss: 19.06,
            cost_public: 0,
            cost_private: 0
        },
        {
            type: "diagnostiek",
            modality: "röntgen",
            brss: 25,
            cost_public: 38,
            cost_private: { base: 38, supplement: 20 }
        },
        {
            type: "traitement",
            name: "Gips / spalk",
            cost: 50
        },
        {
            type: "kine",
            sessions: 10,
            brss: 16.13,
            cost: 16.13,
            franchise: 1.00
        }
    ]
},

/* ============================================================
   3. ZWARE ZORGPADEN
   ============================================================ */

{
    id: "hernia_operatie",
    category: "zwaar",
    label: "Hernia-operatie (privé/publiek)",
    description: "Een volledig traject met consulten, MRI, operatie en SSR.",
    steps: [
        { type: "consult", role: "huisarts", brss: 26.50, cost: 26.50 },
        { 
            type: "consult", 
            role: "specialist", 
            secteur: "S2",
            brss: 23.00,
            cost: 60.00,
            supplement: 30.00
        },
        {
            type: "diagnostiek",
            modality: "MRI",
            brss: 69.00,
            cost_public: 250.00,
            cost_private: { base: 250.00, supplement: 150.00 }
        },
        {
            type: "operation",
            name: "Hernia-operatie",
            brss: 750.00,
            cost_public: 750.00,
            cost_private: { base: 750.00, supplement: 550.00 },
            days: 5,
            forfait_jour: 20.00
        },
        {
            type: "SSR",
            days: 30,
            forfait_jour: 20.00
        }
    ]
},

/* ============================================================
   4. LEVENSBEDREIGEND / COMPLEX
   ============================================================ */

{
    id: "oncologie_traject",
    category: "complex",
    label: "Oncologisch traject (6–12 maanden)",
    description: "Het zwaarste en meest leerzame scenario. ALD heeft grote impact.",
    steps: [
        { type: "consult", role: "huisarts", brss: 26.50, cost: 26.50 },
        {
            type: "diagnostiek",
            modality: "echo + mammografie / CT / PET",
            brss: 120,
            cost_public: 230,
            cost_private: { base: 230, supplement: 100 }
        },
        {
            type: "diagnostiek",
            modality: "biopsie",
            brss: 90,
            cost_public: 150,
            cost_private: { base: 150, supplement: 80 }
        },
        {
            type: "consult",
            role: "oncologue",
            secteur: "S1",
            brss: 30,
            cost: 30
        },
        {
            type: "treatment",
            name: "Chemotherapie (6 cycli)",
            cost: 1800,
            ald: true
        },
        {
            type: "treatment",
            name: "Radiotherapie (25 sessies)",
            cost: 2500,
            ald: true
        },
        {
            type: "SSR",
            days: 40,
            forfait_jour: 20.00
        }
    ]
},

/* ============================================================
   5. CHRONISCHE ZORG
   ============================================================ */

{
    id: "diabetes",
    category: "chronisch",
    label: "Diabetes type 2 (jaartraject)",
    description: "Chronische medicatie, controles, strips, ALD mogelijk.",
    steps: [
        { type: "consult", role: "huisarts", brss: 26.50, cost: 26.50 },
        {
            type: "medicatie",
            category: "diabetes",
            items: [
                { name: "Metformine 30d", brss: 4.20, cost: 8.00 },
                { name: "Insuline 30d", brss: 28.00, cost: 55.00 },
                { name: "Teststrips", brss: 12.00, cost: 22.00 }
            ]
        },
        { type: "consult", role: "diabetoloog", brss: 30, cost: 50 }
    ]
}

];
