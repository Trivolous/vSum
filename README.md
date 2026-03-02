# YouTube Summarizer (v1.0.0)

Ein intelligentes YouTube-Zusammenfassungs-Tool mit Deep-Integration, Multi-Tasking und Transkript-Caching.

## Features

- **Stateless Backend:** Nutzt "Bring Your Own Key" (BYOK) für Gemini und AssemblyAI.
- **Turbo-Verarbeitung:** Universal-3 Pro Modell für höchste Präzision.
- **Smart Caching:** Transkripte werden lokal gespeichert für blitzschnelle Re-Analysen.
- **Audio Player:** Höre das Original-Audio direkt im Transkript-Tab.
- **Multi-Tasking:** "Kurz" und "Normal" Zusammenfassungen können gleichzeitig geladen werden.
- **Deep YouTube Integration:** Buttons direkt in der YouTube-Suche und im Video-Player.

## Installation

### 1. Backend Setup

1. `cd backend`
2. `npm install`
3. Stelle sicher, dass `yt-dlp.exe` und `ffmpeg.exe` im Ordner vorhanden sind (wurden automatisch installiert).
4. Starte den Server: `node server.js`

### 2. Extension Setup

1. Gehe zu `chrome://extensions/`
2. Aktiviere den **Entwicklermodus**.
3. Klicke auf **Entpackte Erweiterung laden** und wähle den Ordner `extension` aus.
4. Klicke auf das Extension-Icon oben rechts und konfiguriere deine API-Keys.

## Entwicklung

Dieses Repo nutzt:

- **ESLint** für Code-Qualität.
- **Prettier** für Formatierung.
- **Husky & lint-staged** für automatisierte Pre-commit Checks.

Vor jedem Commit werden die Dateien automatisch formatiert und auf Fehler geprüft.
