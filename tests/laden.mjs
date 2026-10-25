// Laadt scenarios.js en scenarioEngine.js (ES-modules) met node:vm, zonder bundel en zonder netwerk.
import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const root = path.join(here, "..");
export const lees = (f) => fs.readFileSync(path.join(root, f), "utf8");

export function laad(scenariosCode = lees("scenarios.js"), engineCode = lees("scenarioEngine.js")) {
  const zonderImport = engineCode.replace(/^import .*$/m, "");
  const code = (scenariosCode + "\n" + zonderImport).replace(/^export /gm, "");
  const epiloog = "\n;globalThis.__ZK = { ZK_CONFIG, ZK_SCENARIOS, ZK_FORFAIT_UITLEG, zkRunScenario, zkGetScenario, zkNonOptamNiveau, zkIsNonOptam, PEIL_STAND, PEIL_LABEL_AAN, PEIL_UITLEG_URL,PEIL_KAART_URL, peilStandNl, peilStandKort, peilRegelHtml, peilRegelMd, peilVoetHtml, voorbehoudHtml };";
  const ctx = { console, Math, JSON, Number, String, Object, Array, Set, Infinity, parseInt, Error };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(code + epiloog, ctx, { filename: "zorgkompas" });
  return ctx.__ZK;
}
