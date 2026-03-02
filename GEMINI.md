# GEMINI.md - YouTube Summarizer Project Context

This document provides essential context for AI assistants and developers working on the YouTube Summarizer project.

## Project Overview

**YouTube Summarizer** is a dual-part application (Chrome Extension + Node.js Backend) designed to provide high-quality summaries and transcripts for YouTube videos.

### Connection Modes

- **Local Backend (Node.js):** Uses a local server for audio extraction (`yt-dlp`) and processing. Ideal for unlimited local use.
- **Cloud (Serverless / RapidAPI):** Runs solely in the browser. Uses RapidAPI (YouTube to MP3) for audio extraction and calls AssemblyAI/Gemini directly from the extension. Ideal for users who don't want to run a local server.

### Key Features

- **Deep YouTube Integration:** Injects "Short" and "Normal" summary buttons directly into the YouTube masthead and video player.
- **Multi-Tasking:** Allows simultaneous generation of short and normal summaries.
- **Smart Caching:** Transcripts are cached locally in the browser.
- **Audio Integration:** Includes a built-in audio player in the transcript view (local file in Backend mode, external URL in Cloud mode).
- **High-Precision AI:** Uses AssemblyAI's `universal-3-pro` for transcription and Google's `gemini-1.5-pro` (or flash) for summarization.

## Architecture

1.  **Chrome Extension (MV3):**
    - **Content Script (`extension/content.js`):** Handles UI injection and local state.
    - **Background Script (`extension/background.js`):** Orchestrates the process. In Cloud mode, it performs direct API calls to RapidAPI, AssemblyAI, and Gemini.
    - **Popup & Options:** Configuration for Connection Mode, API Keys (RapidAPI, Gemini, AssemblyAI), and Backend URL.

2.  **Stateless Backend (Node.js/Express):**
    - Used only in "Local" mode.
    - Downloads audio via `yt-dlp` and serves it locally.

## Tech Stack

- **Backend:** Node.js, Express, `yt-dlp`, `fluent-ffmpeg`.
- **Extension:** JavaScript (ES6+), Chrome Extension API.
- **Cloud APIs:** RapidAPI (YouTube To Mp3 Download), AssemblyAI, Google Gemini.

## Key Files

- `backend/server.js`: Local processing logic.
- `extension/background.js`: Main controller for both Local and Cloud modes.
- `extension/manifest.json`: Extension config with host permissions for all APIs.
- `extension/popup.html/js`: Settings UI and state management.

## Development & Commands

### Prerequisites

- Node.js installed.
- RapidAPI Key (for Cloud mode).
- Gemini & AssemblyAI API Keys.

### Backend Setup (Optional for Local Mode)

```bash
cd backend
npm install
node server.js
```

### Extension Setup

1. Open `chrome://extensions/`.
2. Enable **Developer Mode**.
3. Click **Load unpacked** and select the `extension` directory.
4. Choose "Connection Mode" in the popup and enter the required keys.

### Linting & Formatting

```bash
npm run lint    # Run ESLint
npm run format  # Format code with Prettier
```

## Conventions

- **State Management:** The extension uses `chrome.storage.local` to persist API keys, settings, and summaries.
- **Communication:** Communication between the extension and backend is primarily via SSE for long-running processing tasks.
- **Styling:** Vanilla CSS with specific IDs (`yt-sum-overlay`, etc.) to avoid conflicts with YouTube's styles.
- **Error Handling:** Backend returns status updates via SSE, including an `error` stage for graceful failure handling in the UI.

---

_Note: This file is used as context for AI-driven development. Update it when significant architectural changes occur._
