// CONSTANTS
const BRSS_GP = 26.50;
const BRSS_SPEC = 23.00;
const FORFAIT = 1.00;
const FORFAIT_JOUR = 20;
const BRSS_HIP = 2300;

let state = {
    profile: "worker",
    mutuelle: 2,
    ald: false,
    traitant: true,
    hospitalType: "pub",
    specCost: 50
};

function toggleDetails(id){
    document.getElementById(id).classList.toggle("open");
}

function setHospital(type){
    state.hospitalType = type;

    document.getElementById("btn-hosp-pub").style.background =
        type==="pub" ? "#800000" : "#fff";
    document.getElementById("btn-hosp-pub").style.color =
        type==="pub" ? "#fff" : "#333";

    document.getElementById("btn-hosp-priv").style.background =
        type==="priv" ? "#800000" : "#fff";
    document.getElementById("btn-hosp-priv").style.color =
        type==="priv" ? "#fff" : "#333";

    updateSystem();
}

function updateSystem(){
    state.profile = document.getElementById("profile-status").value;
    state.mutuelle = Number(document.getElementById("profile-mutuelle").value);
    state.ald = document.getElementById("profile-ald").checked;
    state.traitant = document.getElementById("setting-traitant").checked;
    state.specCost = Number(document.getElementById("input-f2-cost").value);

    updateEntryText();
    calcSpecialist();
    calcPhysio();
    calcHospital();
    calcRehab();
}

function updateEntryText(){
    const t = document.getElementById("txt-entry-title");
    const d = document.getElementById("txt-entry-desc");

    if(state.profile==="worker"){
        t.innerText="Profiel: Werkende / ZZP";
        d.innerText="Je valt onder PUMa via loon of URSSAF-bijdragen.";
    } 
    else if(state.profile==="pensioner"){
        t.innerText="Profiel: Gepensioneerde (S1)";
        d.innerText="Frankrijk betaalt je zorg, NL verrekent via CAK.";
    } 
    else {
        t.innerText="Profiel: Inwoner";
        d.innerText="PUMa op basis van verblijf. Let op CSM bij vermogen.";
    }
}

function calcSpecialist(){
    const fee = state.specCost;
    const brss = (fee===30)?BRSS_GP:BRSS_SPEC;

    let ro = 0.70;
    if(state.ald) ro = 1.00;
    if(!state.traitant && !state.ald) ro = 0.30;

    const amGross = brss * ro;
    const amNet = Math.max(0, amGross - FORFAIT);

    const ticket = brss - amGross;
    const mut = state.mutuelle>0 ? Math.max(ticket,0) : 0;

    const user = fee - amNet - mut;

    document.getElementById("res-f2-ameli").innerText="€ "+amNet.toFixed(2);
    document.getElementById("res-f2-mut").innerText="€ "+mut.toFixed(2);
    document.getElementById("res-f2-user").innerText="€ "+user.toFixed(2);

    let h = "";
    h+=row("BRSS","€ "+brss.toFixed(2));
    h+=row("RO %",(ro*100)+"%");
    h+=row("Ameli bruto","€ "+amGross.toFixed(2));
    h+=row("Ticket modérateur","€ "+ticket.toFixed(2));

    document.getElementById("det-f2").innerHTML=h;
}

function calcPhysio(){
    const total = 20 * 16.13;
    const franchise = 20;
    const amGross = total * (state.ald?1:0.60);
    const amNet = Math.max(0, amGross - franchise);
    const mut = total - amGross;

    const user = total - amNet - mut;

    document.getElementById("res-f3-ameli").innerText="€ "+amNet.toFixed(2);
    document.getElementById("res-f3-mut").innerText="€ "+mut.toFixed(2);
    document.getElementById("res-f3-user").innerText="€ "+user.toFixed(2);
}

function calcHospital(){
    const base = BRSS_HIP;
    const supplements = state.hospitalType==="priv" ? 1200 : 0;
    const forfait = 5 * FORFAIT_JOUR;

    const am = base;

    let mut = 0;
    if(state.mutuelle>0){
        mut += forfait;
        mut += supplements;
    }

    const user = base + supplements + forfait - am - mut;

    document.getElementById("res-f4-ameli").innerText="€ "+am.toFixed(2);
    document.getElementById("res-f4-mut").innerText="€ "+mut.toFixed(2);
    document.getElementById("res-f4-user").innerText="€ "+user.toFixed(2);

    let h="";
    h+=row("Basis","€ "+base);
    h+=row("Supp","€ "+supplements);
    h+=row("Forfait","€ "+forfait);
    document.getElementById("det-f4").innerHTML=h;
}

function calcRehab(){
    if(state.mutuelle>0){
        document.getElementById("res-f5-text").innerHTML=
            "<span style='color:green'>Volledig vergoed</span>";
    } else {
        document.getElementById("res-f5-text").innerHTML=
            "<span style='color:red'>€ 600 zelf betalen</span>";
    }
}

function row(a,b){return `<div class="fz-detail-row"><span>${a}</span><span>${b}</span></div>`;}

updateSystem();
