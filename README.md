# MotoCare

Houd onderhoud, kilometers en tankbeurten van je motor bij. Werkt als app op je Android-telefoon, ook offline. Geen account, geen advertenties, alles blijft op je toestel.

## Wat zit erin
- Meerdere motoren, met actieve motor
- Dashboard met kilometerstand (tik om bij te werken) en onderhoudsstatus: In orde / Binnenkort / Te laat
- Onderhoud toevoegen, bewerken en verwijderen, met eigen typen en intervallen (km en/of maanden)
- Geschiedenis met filter per type
- Tankbeurten met gemiddeld verbruik (l/100 km)
- Kostenoverzicht per jaar
- Voorbeeldgegevens bij de eerste keer openen (te verwijderen via Meer → Instellingen)
- Back-up: exporteren en importeren als JSON

## Online zetten (GitHub Pages) vanaf je telefoon
1. Pak de ZIP uit (app Bestanden → ZIP → Uitpakken).
2. Maak op github.com een **nieuwe** repository, bijvoorbeeld `motocare`. Kies **Public**.
3. Upload alle bestanden: **Add file → Upload files → choose your files**. Selecteer alle bestanden in de uitgepakte map, dan **Commit changes**.
4. Ga naar **More → Settings → Pages**. Kies bij Branch **main** en **/ (root)**, dan **Save**.
5. Na 1–2 minuten staat bovenaan je adres, bijvoorbeeld `https://jouwnaam.github.io/motocare/`.
6. Open dat adres in Chrome op je telefoon. Tik op **⋮** en dan **App installeren**.

## Offline
Open de app één keer met internet en wacht een paar seconden. Daarna werkt alles ook zonder internet.

## Back-up
Meer → Instellingen → **Exporteer alle gegevens**. Wis je browsergegevens of verwijder je de app, dan is je data weg.

## Updaten
Verander je een bestand? Verhoog dan in `service-worker.js` het getal bij `VERSION` (bijvoorbeeld `v1.0.1`).
