const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const { AssemblyAI } = require('assemblyai');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const audioStore = path.join(__dirname, 'audio_cache');
if (!fs.existsSync(audioStore)) fs.mkdirSync(audioStore);

app.use(
  '/audio',
  (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Accept-Ranges', 'bytes');
    next();
  },
  express.static(audioStore)
);

app.get('/process-video', async (req, res) => {
  const { url, summaryType, modelName, gemini_key, aai_key, existingTranscript } = req.query;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendStatus = (stage, percent = 0, message = '') => {
    res.write(`data: ${JSON.stringify({ stage, percent, message })}\n\n`);
  };

  try {
    const videoId = new URL(url).searchParams.get('v');

    // Check if any audio file for this video ID already exists
    const existingFiles = fs
      .readdirSync(audioStore)
      .filter((f) => f.startsWith(`audio_${videoId}.`));
    let audioFilename = existingFiles.length > 0 ? existingFiles[0] : null;
    let audioPath = audioFilename ? path.join(audioStore, audioFilename) : null;

    let transcriptText = existingTranscript;

    if (!transcriptText) {
      sendStatus('downloading', 10, 'Video-Download (HQ Audio)...');
      const ytDlpPath = fs.existsSync(path.join(__dirname, 'yt-dlp.exe'))
        ? path.join(__dirname, 'yt-dlp.exe')
        : 'yt-dlp';

      if (!audioPath) {
        const outputTemplate = path.join(audioStore, `audio_${videoId}.%(ext)s`);
        const ytDlp = spawn(ytDlpPath, ['-f', 'ba', '-o', outputTemplate, url]);
        await new Promise((resolve, reject) => {
          ytDlp.stdout.on('data', (d) => {
            const m = d.toString().match(/(\d+\.\d+)%/);
            if (m) sendStatus('downloading', parseFloat(m[1]), `Download: ${m[1]}%`);
          });
          ytDlp.on('close', (code) => {
            if (code !== 0) reject(new Error(`yt-dlp exited with code ${code}`));
            else resolve();
          });
        });

        // Find the newly downloaded file to get its real extension
        const newFiles = fs
          .readdirSync(audioStore)
          .filter((f) => f.startsWith(`audio_${videoId}.`));
        if (newFiles.length === 0) throw new Error('Download failed: file not found');
        audioFilename = newFiles[0];
        audioPath = path.join(audioStore, audioFilename);
      }

      // 2. Transkription mit Fallback-Support
      sendStatus('uploading', 0, 'AssemblyAI Analyse...');
      const client = new AssemblyAI({ apiKey: aai_key });

      const transcript = await client.transcripts.transcribe({
        audio: audioPath,
        // Nutze universal-3-pro als primär, universal-2 als Fallback für 99+ Sprachen (z.B. Türkisch)
        speech_models: ['universal-3-pro', 'universal-2'],
        language_detection: true,
        punctuate: true,
        format_text: true,
        filter_profanity: false,
      });

      if (transcript.status === 'error') throw new Error(transcript.error);
      transcriptText = transcript.text;
    }

    // 3. Zusammenfassung
    sendStatus('summarizing', 0, 'Gemini erstellt Zusammenfassung...');
    const genAI = new GoogleGenerativeAI(gemini_key);
    const model = genAI.getGenerativeModel({ model: modelName || 'gemini-3.1-pro' });

    let prompt = `TRANSKRIPT: "${transcriptText}"\n\nFasse das auf DEUTSCH zusammen.\n`;
    prompt += summaryType === 'short' ? 'Kurz.' : 'Ausführlich.';
    prompt += `\n\nAntworte NUR als JSON: {"short_summary": "...", "normal_summary": "..."}`;

    const result = await model.generateContent(prompt);
    const geminiRaw = result.response.text();
    const jsonMatch = geminiRaw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('KI antwortete nicht im JSON Format.');
    const summaryData = JSON.parse(jsonMatch[0]);

    // WICHTIG: Wir bauen das Objekt EXPLIZIT zusammen
    const finalResult = {
      transcript: transcriptText, // Das hier ist das ROHE AAI Transkript
      short_summary: summaryData.short_summary || 'Fehler',
      normal_summary: summaryData.normal_summary || 'Fehler',
      audioUrl: `http://localhost:5000/audio/${audioFilename}`,
      wordCount: transcriptText.split(/\s+/).length,
    };

    sendStatus('done', 100, finalResult);
  } catch (error) {
    console.error(error);
    sendStatus('error', 0, error.message);
  } finally {
    res.end();
  }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Smart-Backend (v1.0.0) Transkript-Sicherheit aktiv.`));
