# CLAUDE.md

Repo: zorgkompas-frankrijk

## Wat dit is
ZorgKompas Frankrijk: een educatieve simulator die laat zien wat een zorgtraject in Frankrijk ongeveer kost voor de eigen portemonnee (Sécurité sociale/Ameli, mutuelle, eigen bijdrage). Scenario's: griep, rugklachten, hernia, oncologie. Bedragen zijn indicatief.

## Live adres
`https://zorgkompas-frankrijk.vercel.app` (uit de README).

## Opbouw
- `index.html`, `style.css`, `script.js` (scherm, ES-module)
- `scenarios.js` (scenario's en het blok `ZK_CONFIG` met alle bedragen), `scenarioEngine.js` (rekenlogica en Peil-label, `PEIL_STAND`)
- `assets/` (svg-pictogrammen), `peil/waarden.json` (kopie van de waarden uit Peil)
- `tests/`: `zorgkompas.test.mjs`, `peil.test.mjs`, `herstel.test.mjs`, `laden.mjs`
- `.github/workflows/peil-controle.yml`, `README.md`, `LICENSE`

## Techniek
Statisch, geen package.json, geen build, geen backend. Node 22 voor de tests, die `scenarios.js` en `scenarioEngine.js` met `node:vm` laden: `node tests/zorgkompas.test.mjs`, `node tests/peil.test.mjs`, `node tests/herstel.test.mjs`.

## Externe diensten en namen van omgevingsvariabelen
Geen omgevingsvariabelen. Vercel voor hosting. Google Fonts, verwijzing naar `www.cmunf.fr` en `infofrankrijk.com/cafe-claude`.

## Hoe het live gaat
Vercel (`zorgkompas-frankrijk.vercel.app`). `peil-controle.yml` draait de drie tests bij elke push, wekelijks (maandag) en handmatig.

## Regels en besluiten
Uit `README.md`:
- Alle tarieven, dagbijdragen en vergoedingspercentages staan in `ZK_CONFIG` bovenaan `scenarios.js`, elk met bron en controledatum. Pas een bedrag alleen daar aan.
- De mutuelle wordt gerekend als contrat responsable (art. L871-1, R871-1, R871-2 CSS): niveaus 100, 150, 200 en 300 procent van de BR, Sécu inbegrepen.
- Het forfait van 32 euro bij zware handelingen staat in `ZK_CONFIG.forfait_actes_lourds` en is nog niet in Peil.
- Peil is de bron van de bedragen. Bij een nieuwe controle: werk `peil/waarden.json` bij, pas `ZK_CONFIG` aan en zet daarna `PEIL_STAND` op de nieuwe datum. De datum van de stempel "Gecontroleerd tegen Peil" komt alleen uit `PEIL_STAND`.

Laatst nagelopen: 5 november 2026
