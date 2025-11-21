// DASHBOARD STATE
function S(){
    return {
        profiel: document.getElementById("zk-profiel").value,
        mut: Number(document.getElementById("zk-mutuelle").value),
        ald: document.getElementById("zk-ald").checked,
        traitant: document.getElementById("zk-traitant").checked
    };
}

// UPDATE HEADER
function updateTotal(v, warn=""){
    document.getElementById("zk-total-value").innerText = "€ "+v.toFixed(2);
    document.getElementById("zk-total-warnings").innerText = warn;
}

/* ============= CALC UTILITIES ============= */

function calcConsult(brss, cost, supplement=0){
    const s = S();
    const franchise = 1;

    let ro = 0.70;
    if(!s.traitant && !s.ald) ro = 0.30;
    if(s.ald) ro = 1.00;

    const amGross = brss * ro;
    const amNet = Math.max(0, amGross - franchise);
    const franchEff = Math.min(franchise, amGross);

    const ticket = brss - amGross;
    let mut = (s.mut>0) ? Math.max(0, ticket) : 0;

    const user = (cost+supplement) - amNet - mut;

    return {
        brss, cost, supplement,
        ameli: amNet,
        mut,
        user,
        note:"Franchise €1 is wettelijk verplicht."
    };
}

/* ================= SCENARIOS ================ */

const scenarios = {

    instroom: () => ({
        title:"Instroomproblemen",
        lines:[
            ["CPAM verwerking","Traag / maanden"],
            ["S1 registratie","Risico op tijdelijk geen dekking"],
            ["URSSAF / PUMa","Administratieve vertraging"]
        ],
        note:"Indicatief scenario."
    }),

    huisarts_s1: () => calcConsult(26.50,26.50),

    huisarts_s2: () => calcConsult(26.50,26.50,15),

    spec_s1: () => calcConsult(30,30),

    spec_s2: () => calcConsult(30,30,40),

    buiten_parcours: () => {
        const s = S();
        let r = calcConsult(26.50, 26.50);
        r.note = "Buiten parcours → Ameli vergoedt maar 30%.";
        return r;
    },

    kine: () => {
        const base = 16.13 * 20;
        const am = base * 0.60;
        const fr = 20;
        return {
            title:"Kiné 20 sessies",
            lines:[
                ["Totale kosten", "€ "+base.toFixed(2)],
                ["Ameli", "€ "+am.toFixed(2)],
                ["Mutuelle","€ "+(base-am).toFixed(2)],
                ["Franchise","€ -20.00"]
            ],
            user:20,
            note:"Franchise nooit gedekt."
        };
    },

    med_100: () => ({
        title:"Medicijnen 100%",
        lines:[["Ameli","100%"]],
        user:0,
        note:"ALD-middelen volledig vergoed (excl. franchise)"
    }),

    med_65: () => ({
        title:"Medicijnen 65%",
        lines:[["Ameli","65%"]],
        user:3,
        note:"Indicatief"
    }),

    med_30: () => ({
        title:"Medicijnen 30%",
        lines:[["Ameli","30%"]],
        user:6,
        note:"Indicatief"
    }),

    med_15: () => ({
        title:"Medicijnen 15%",
        lines:[["Ameli","15%"]],
        user:10,
        note:"Indicatief"
    }),

    diabetes: () => ({
        title:"Diabetespakket",
        lines:[
            ["Insuline","Gedekt"],
            ["Strips","Gedekt"],
            ["Materialen","Gedekt"]
        ],
        user:0,
        note:"ALD 100%"
    }),

    xray: () => ({title:"Röntgen",lines:[["BRSS","€ 25"],["Kost","€ 40"]],user:5,note:"Indicatief"}),
    echo: () => ({title:"Echo",lines:[["BRSS","€ 56"],["Kost","€ 80"]],user:15,note:"Indicatief"}),
    mri: () => ({title:"MRI",lines:[["BRSS","€ 70"],["Kost","€ 300"]],user:80,note:"Indicatief"}),
    biopsie: () => ({title:"Biopsie",lines:[["BRSS","€ 100"],["Kost","€ 180"]],user:40,note:"Indicatief"}),
    ctpet: () => ({title:"CT/PET",lines:[["BRSS","€ 160"],["Kost","€ 450"]],user:130,note:"Indicatief"}),
    onco_diag: () => ({title:"Onco Diagnostiek",lines:[["Scans","Meervoudig"],["Dagopnames","Mogelijk"]],user:0,note:"Sterk variabel"}),

    hosp_pub: () => ({
        title:"Publiek Ziekenhuis",
        lines:[
            ["Operatie","Gedekt 100%"],
            ["Forfait dag","€ 20"],
            ["5 dagen","€ 100"]
        ],
        user:0,
        note:"Mutuelle dekt forfait."
    }),

    hosp_priv: () => ({
        title:"Privékliniek",
        lines:[
            ["Basis","Gedekt"],
            ["Supplementen","€ 1200"]
        ],
        user:200,
        note:"Supplement afhankelijk van contract"
    }),

    op_heup: () => ({
        title:"Heupoperatie",
        lines:[
            ["Basis","€ 2300"],
            ["Forfait","€ 100"]
        ],
        user:0,
        note:"Publiek: geen supplements"
    }),

    op_hernia: () => ({
        title:"Hernia-operatie",
        lines:[
            ["Basis","€ 1600"],
            ["Forfait","€ 100"]
        ],
        user:0,
        note:"Indicatief"
    }),

    op_onco: () => ({
        title:"Onco-operatie",
        lines:[
            ["Meerfasig","Ja"],
            ["Supplementen","Afhankelijk"]
        ],
        user:0,
        note:"Sterk variabel"
    }),

    ssr_pub: () => ({
        title:"SSR Publiek",
        lines:[
            ["21 dagen","€ 420"],
            ["Mutuelle","Dekt alles"]
        ],
        user:0,
        note:"Forfait gedekt"
    }),

    ssr_priv: () => ({
        title:"SSR Privé",
        lines:[
            ["30 dagen","€ 600"],
            ["Mutuelle","Dekt alles"]
        ],
        user:0
    })
};

/* =============== MODAL HANDLING ================== */

const modal = document.getElementById("zk-modal");
const modalBody = document.getElementById("zk-modal-body");
document.getElementById("zk-close").onclick = ()=> modal.style.display="none";

document.querySelectorAll(".zk-card").forEach(c=>{
    c.onclick = ()=>{
        const key = c.dataset.scenario;
        const d = scenarios[key]();

        let h = `<div class='zk-title'>${d.title}</div>`;

        if(d.lines){
            d.lines.forEach(l=>{
                h += `<div class='zk-line'><span>${l[0]}</span><span>${l[1]}</span></div>`;
            });
        }

        if(typeof d.ameli!="undefined"){
            h += `<div class='zk-line'><span>Ameli</span><span>€ ${d.ameli.toFixed(2)}</span></div>`;
        }
        if(typeof d.mut!="undefined"){
            h += `<div class='zk-line'><span>Mutuelle</span><span>€ ${d.mut.toFixed(2)}</span></div>`;
        }

        h += `<div class='zk-line'><strong>U betaalt</strong><strong>€ ${d.user.toFixed(2)}</strong></div>`;

        if(d.note){
            h += `<div class='zk-note'>${d.note}</div>`;
        }

        modalBody.innerHTML = h;
        modal.style.display = "flex";

        updateTotal(d.user, d.note||"");
    };
});
