# Community Feed API

Backend für eine kleine Community-Plattform: Nutzer schreiben Posts mit einem Bild und kommentieren dann diese gegenseitig und man kann auch Links bei den Posts anhängen und sich gegenseitig DMs schreiben.

Die App läuft auf `http://localhost:3000`.
API-Dokumentation: `http://localhost:3000/api-docs`
Health-Check: `http://localhost:3000/health`

# Test User

username: alice
passwort: test1234
rolle: user
id: 1

username: bob
passwort: test1234
rolle: user
id: 2

username: admin
passwort: test1234
rolle: admin
id: 3

# Tests

npm install
npm test

# Entscheidungen

- `createApp()` ohne `listen()` ist testbar mit Supertest, kein Server nötig.
- PATCH/DELETE: erst laden (404), dann Berechtigung prüfen (403)
- Kommentare löschen: Autor, Post-Besitzer oder Admin.
- Links werden immer gespeichert, auch wenn die externe API fehlschlägt (`fetch_status`), sonst würde es Internal Server error geben.
- Cronjob alle 5 Min., abschaltbar über `CRON_ENABLED=false` in den env files.
- JWT-Ablauf: 1h. absichtlich so lange wegen Tests

# KI-Einsatz

Ich habe Claude für die Planung vom Projekt und teils zur umsetzung vom Projekt benutzt.
Dazu habe ich auch noch Claude Code benutzt, hauptsächlich für Debugging bei Tests in Postman.

# Nicht umgesetzt und wie ich es angehen würde

- Alte Upload Dateien: Wird ein Bild-Upload nach dem Schreiben durch eine spätere Prüfung abgelehnt (ID/Post/Berechtigung), bleibt die Datei in `uploads/` liegen. Könnte man mit einer Try/Catch Schlaufe in jedem betroffenen Pfad lösen. Oder noch besser mit einem Cronjob, der diese Files erkennt und dann automatisch löscht.
- Rollenprüfung als Middleware: Aktuell in jeder Route (`if (post.user_id !== userId && role !== "admin")`) statt zentraler Middleware, bei nur zwei Ressourcentypen einfacher als eine zusätzliche Abstraktion.
- Refresh-Token: Nur ein 1h-Access-Token, kein Refresh-Mechanismus. Ich würde das mit einem Cookie Refreshtoken und kurzen Accesstokens umsetzen
