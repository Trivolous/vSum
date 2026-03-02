# YouTube Summarizer (v1.0.0)

A smart YouTube summarizer tool with deep integration, multi-tasking, and transcript caching.

## Features

- **Stateless Backend:** Uses "Bring Your Own Key" (BYOK) for Gemini and AssemblyAI.
- **Turbo Processing:** Universal-3 Pro model for highest precision.
- **Smart Caching:** Transcripts are saved locally for lightning-fast re-analysis.
- **Audio Player:** Listen to the original audio directly in the transcript tab.
- **Multi-Tasking:** "Short" and "Normal" summaries can be loaded simultaneously.
- **Deep YouTube Integration:** Buttons directly in the YouTube search and video player.

## Installation

### 1. Backend Setup

1. `cd backend`
2. `npm install`
3. Ensure that `yt-dlp.exe` and `ffmpeg.exe` are present in the folder (they are installed automatically).
4. Start the server: `node server.js`

### 2. Extension Setup

1. Go to `chrome://extensions/`
2. Enable **Developer mode**.
3. Click on **Load unpacked** and select the `extension` folder.
4. Click on the extension icon in the top right and configure your API keys.

## Development

This repo uses:

- **ESLint** for code quality.
- **Prettier** for formatting.
- **Husky & lint-staged** for automated pre-commit checks.

Before each commit, files are automatically formatted and checked for errors.
