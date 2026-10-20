# ZorgKompas Frankrijk

Een educatieve simulator die laat zien wat een zorgtraject in Frankrijk ongeveer kost voor de eigen portemonnee: wat de Sécurité sociale (Ameli) vergoedt, wat een mutuelle aanvult en wat u zelf betaalt. Kies een zorgsituatie (griep, rugklachten, hernia, oncologie), stel mutuelle, ALD, huisarts en privé-opties in en lees per stap de verdeling. Bedragen zijn indicatief. Live: https://zorgkompas-frankrijk.vercel.app

## Waar staan de bedragen

Alle tarieven, dagbijdragen en vergoedingspercentages staan in het blok `ZK_CONFIG` bovenaan `scenarios.js`, elk met bron en controledatum. De rekenregels in `scenarioEngine.js` en de scenario's lezen alleen uit dat blok. Pas een bedrag dus alleen daar aan.

## Peil is de bron

De bedragen komen uit Peil, het parameterregister van Communities Abroad. `peil/waarden.json` is de kopie van die waarden voor deze tool. De stempel "Gecontroleerd tegen Peil" onder de uitkomst en de alinea in de voettekst komen uit `scenarioEngine.js`; de datum komt alleen uit `PEIL_STAND`. Bij een nieuwe controle: werk `peil/waarden.json` bij, pas `ZK_CONFIG` aan en zet daarna `PEIL_STAND` op de nieuwe datum.

## Test

Geen installatie en geen netwerk nodig (Node 22):

    node tests/zorgkompas.test.mjs   # rekenvoorbeelden
    node tests/peil.test.mjs         # ZK_CONFIG tegen peil/waarden.json, stempel en teksten

De tests laden `scenarios.js` en `scenarioEngine.js` met `node:vm`. Ze draaien ook bij elke push en wekelijks via `.github/workflows/peil-controle.yml`.

## Bestanden

`index.html`, `style.css`, `script.js` (scherm), `scenarios.js` (scenario's en `ZK_CONFIG`), `scenarioEngine.js` (rekenlogica en Peil-label), `peil/`, `tests/`.
