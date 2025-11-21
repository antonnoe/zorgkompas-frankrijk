let STATE = {
    status: "worker",
    mutuelle: 2,
    ald: false,
    traitant: true,
    private: false,
    selectedScenario: null
};

document.addEventListener("DOMContentLoaded", () => {
    zkInitScenarioSelector();
    zkInitInputs();
    zkRenderTotal(0);
});

function zkInitInputs() {
    document.getElementById("profile-status").onchange = e => {
        STATE.status = e.target.value;
        zkRecalc();
    };
    document.getElementById("profile-mutuelle").onchange = e => {
        STATE.mutuelle = Number(e.target.value);
        zkRecalc();
    };
    document.getElementById("profile-ald").onchange = e => {
        STATE.ald = e.target.checked;
        zkRecalc();
    };
    document.getElementById("profile-traitant").onchange = e => {
        STATE.traitant = e.target.checked;
        zkRecalc();
    };
    document.getElementById("profile-private").onchange = e => {
        STATE.private = e.target.checked;
        zkRecalc();
    };
}

function zkInitScenarioSelector() {
    const sel = document.getElementById("zk-scenario-select");
    ZK_SCENARIOS.forEach(s => {
        const opt = document.createElement("option");
        opt.value = s.id;
        opt.textContent = s.label;
        sel.appendChild(opt);
    });

    sel.onchange = e => {
        STATE.selectedScenario = ZK_SCENARIOS.find(s => s.id === e.target.value);
        zkRenderScenario();
        zkRecalc();
    };
}

function zkRenderScenario() {
    const container = document.getElementById("zk-detail-container");
    container.innerHTML = "";

    if (!STATE.selectedScenario) return;

    const block = document.createElement("div");
    block.className = "zk-block";

    block.innerHTML = `
        <h4>${STATE.selectedScenario.label}</h4>
        <p>${STATE.selectedScenario.description}</p>
        <div id="zk-steps"></div>
    `;

    container.appendChild(block);
}

function zkRecalc() {
    if (!STATE.selectedScenario) {
        zkRenderTotal(0);
        return;
    }

    const total = scenarioEngineCalculate(STATE);
    zkRenderTotal(total);
}

function zkRenderTotal(amount) {
    document.getElementById("zk-total-value").textContent =
        "€ " + amount.toFixed(2);

    const warn = document.getElementById("zk-total-warnings");
    warn.textContent = amount > 200 ? "Hoge kosten — let op supplementen" : "";
}
