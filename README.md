# Custom Quick Buttons – Browser-Erweiterung für Brave & Chromium

**Custom Quick Buttons** ist eine leistungsstarke, vollständig lokale Chromium-Browser-Erweiterung (Manifest V3), mit der Sie auf beliebigen Webseiten eigene Schnellzugriff-Buttons erstellen und in einer schwebenden Leiste **standardmäßig unten links** anzeigen können.

Jedem eigenen Button kann die Klick-Funktion eines bereits vorhandenen Elements oder Buttons auf der Original-Webseite zugewiesen werden. Sämtliche Buttons, Farbgebungen, Reihenfolgen und Toolbar-Positionen werden **dauerhaft und isoliert pro Webseite** gespeichert.

---

## 🌟 Hauptfunktionen

1. **Schwebende Leiste (Unten Links)**:
   - Erscheint standardmäßig links unten (`bottom: 24px; left: 24px`).
   - Über das Anfasser-Symbol (`:::`) frei per Maus oder Touch verschiebbar (Position wird dauerhaft gespeichert).
   - Minimierbar über das Einklapp-Symbol (schrumpft zu einem dezenten Badge).
   - Komplett isoliert im **Shadow DOM**: Webseiten-CSS kann die Buttons weder verzerren noch überschreiben.

2. **Plus-Button (+) in der Leiste**:
   - Immer am Ende der Toolbar verfügbar (kann weder verschoben noch gelöscht werden).
   - Ein Klick öffnet direkt auf der aktuellen Webseite das Dialogfenster zum Erstellen eines neuen Buttons.

3. **Funktion eines Original-Buttons übernehmen (Element Inspector)**:
   - Integrierter visueller Auswahlmodus.
   - Hebt Webseiten-Elemente beim Überfahren farblich hervor und zeigt Tag- und Textinformationen an.
   - Ein Klick analysiert das Element und erzeugt einen extrem stabilen Selektor (berücksichtigt IDs, `data-testid`, `aria-label`, Klassen, Textinhalte und XPaths).
   - Führt beim Klick auf den eigenen Quick Button eine realistische Klick-Event-Kette auf dem Original-Element aus.

4. **Drag & Drop – Intuitive Sortierung**:
   - Eigene Buttons können per Drag & Drop innerhalb der Leiste verschoben werden (auch ganz nach links oder ganz nach rechts).
   - Nachbar-Buttons machen automatisch Platz.
   - Releasing oder Verlassen der Leiste bricht sicher ab bzw. übernimmt die Position, ohne dass der Button im Klickzustand hängen bleibt.
   - Funktioniert nahtlos mit Desktop-Maus und Touchscreens.
   - Die neue Reihenfolge wird sofort in `chrome.storage.local` gespeichert und bleibt nach Seiten-Reloads und Browser-Neustarts erhalten.

5. **Rechtsklick-Kontextmenü auf Buttons**:
   - Rechtsklick auf einen eigenen Button öffnet ein dediziertes Menü:
     - ✏️ **Button bearbeiten**: Öffnet das vollständige Einstellungsfenster mit Live-Vorschau.
     - 🔤 **Text ändern**: Schnellzugriff auf den Anzeigetext.
     - ⚪ / ⚫ **Textfarbe wechseln**: Schneller Wechsel zwischen Weiß und Schwarz.
     - 🎨 **Hintergrundfarbe ändern**: Farbwähler mit modernen Paletten und HTML5-Colorpicker.
     - 🎯 **Funktion ändern**: Startet direkt den Auswahlmodus für ein neues Original-Element.
     - 📋 **Button duplizieren**: Erstellt eine sofort einsatzbereite Kopie.
     - 🗑️ **Button löschen**: Entfernt den Button dauerhaft.

6. **Popup-Menü in der Browser-Leiste**:
   - Klick auf das Erweiterungssymbol oben rechts in Brave.
   - **Standardmäßig inaktiv**: Das Plugin ist auf neuen Webseiten aus Sicherheits- und Performancegründen standardmäßig ausgeschaltet.
   - Aktivierungsschalter pro Website: Erst wenn Sie die Erweiterung für die aktuelle Domain einschalten, erscheint die Leiste (wird dauerhaft für diese Domain gespeichert).
   - Leiste ein- oder ausblenden.
   - Button zum Zurücksetzen der Leistenposition nach unten links.
   - Übersicht aller für diese Domain konfigurierten Buttons inklusive Schnell-Löschung.
   - *(Hinweis: Eigene Buttons werden direkt über das Plus (+) in der schwebenden Leiste erstellt).*

---

## 📁 Projektstruktur

```
Web Buttons/
├── manifest.json              # Chrome Extension Manifest V3 Konfiguration
├── icons/                     # Icons in 16, 32, 48 und 128 px
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
├── lib/
│   ├── storage.js             # Persistenzschicht mit Domain-Scoping (chrome.storage.local)
│   └── selector.js            # Robuste Selektor-Generierung, Heuristiken & Klick-Simulation
├── content/
│   ├── styles.js              # Gekapselte CSS-Regeln für das Shadow DOM (Anthrazit-Dark-Theme)
│   ├── toast.js               # Benachrichtigungssystem (Erfolg, Fehler, Aktionen)
│   ├── contextmenu.js         # Eigenes Kontextmenü bei Rechtsklick
│   ├── inspector.js           # Visueller Webseiten-Element-Picker mit Live-Overlay
│   ├── modal.js               # In-Page-Editor zum Erstellen/Bearbeiten mit Live-Vorschau
│   ├── dragdrop.js            # PointerEvent Drag & Drop Reordering Engine
│   ├── toolbar.js             # Schwebende Toolbar (unten links, Drag Handle, Minimierung, Plus-Button)
│   └── content.js             # Haupt-Content-Script Orchestrator
├── popup/
│   ├── popup.html             # Popup-Oberfläche beim Klick auf das Browser-Symbol
│   ├── popup.css              # Modernes Dark-Design des Popups
│   └── popup.js               # Popup-Logik und Kommunikation mit Tabs
├── background/
│   └── background.js          # Background Service Worker & Badge-Verwaltung
├── test/
│   ├── test-page.html         # Lokales Testlabor mit interaktiven Buttons und Event-Log
│   └── verify-extension.js    # Automatisierte Integritäts- und Syntax-Prüfung
└── README.md                  # Dokumentation & Installationsanleitung
```

---

## 🛠️ Installationsanleitung in Brave

Die Erweiterung ist sofort einsatzbereit und erfordert keinen Build-Schritt.

1. **Brave Browser öffnen**.
2. In die Adresszeile eingeben und Enter drücken:
   ```text
   brave://extensions
   ```
   *(Alternativ: Menü oben rechts `≡` → **Erweiterungen**).*
3. Oben rechts den Schalter **Entwicklermodus** (Developer Mode) aktivieren.
4. Oben links auf die Schaltfläche **„Entpackte Erweiterung laden“** (Load unpacked) klicken.
5. Den entpackten Projektordner der Erweiterung auswählen (den Ordner, der die `manifest.json` enthält).
6. Die Erweiterung **Custom Quick Buttons** erscheint nun in Ihrer Erweiterungsliste und ist sofort aktiv!
7. **Tipp:** Klicken Sie oben rechts in Brave auf das Puzzleteil-Symbol und pinnen Sie das Blitz-Symbol von **Custom Quick Buttons** an Ihre Symbolleiste.

---

## 🧪 Schneller Funktionstest mit dem Testlabor

Im Projekt ist eine fertige Testseite integriert:

1. Öffnen Sie in Brave einen neuen Tab.
2. Öffnen Sie mit `Strg + O` die Testseite `test-page.html` aus dem Ordner `test/` des Projekts.
   *(Alternativ: Wenn Sie einen lokalen Webserver nutzen, rufen Sie die Seite über localhost auf. Auch für `file://`-URLs funktioniert die Erweiterung, sobald in `brave://extensions` unter „Details“ die Option „Zugriff auf Datei-URLs zulassen“ aktiviert ist).*
3. Unten links auf dem Bildschirm sehen Sie die schwebende Toolbar mit dem `+`-Button.
4. Klicken Sie auf `+`, wählen Sie *„Element auf Webseite auswählen“*, klicken Sie auf den Button **„💾 Speichern“** oder **„➕ Zähler +1“** und speichern Sie den Quick Button.
5. Klicken Sie auf Ihren neuen Quick Button in der Leiste: Im Event-Log der Testseite sehen Sie sofort die protokollierte Aktion!
6. Testen Sie das Verschieben per **Drag & Drop** und das **Rechtsklick-Menü**.
7. Drücken Sie `F5` (Seite neu laden): Alle Buttons und Reihenfolgen sind exakt wieder da.

---

## 🔒 Sicherheit & Datenschutz

- **100 % lokal**: Es werden keinerlei Daten an externe Server oder Dritte gesendet.
- **Keine Account-Bindung**: Keine Registrierung nötig.
- **Shadow DOM**: Verhindert, dass bösartiges Webseiten-CSS die Toolbar unsichtbar macht oder manipuliert.
- **Synthetische Klick-Events**: Respektiert Browser-Sicherheitsgrenzen und nutzt standardkonforme Pointer- und Mouse-Events.
