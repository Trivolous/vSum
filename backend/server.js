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

app.get('/delete-audio', (req, res) => {
  const { videoId } = req.query;
  if (!videoId) return res.status(400).json({ error: 'Missing videoId' });

  try {
    const files = fs.readdirSync(audioStore);
    const filesToDelete = files.filter((f) => f.startsWith(`audio_${videoId}.`));

    filesToDelete.forEach((f) => {
      fs.unlinkSync(path.join(audioStore, f));
    });

    console.log(`Deleted ${filesToDelete.length} audio files for video: ${videoId}`);
    res.json({ success: true, deletedCount: filesToDelete.length });
  } catch (error) {
    console.error('Error deleting audio:', error);
    res.status(500).json({ error: error.message });
  }
});

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

    // Helper to find a valid, finished audio file in cache
    const findAudioFile = (vId) => {
      const validExtensions = ['.m4a', '.webm', '.mp3', '.wav', '.ogg'];
      const files = fs.readdirSync(audioStore);
      return files.find((f) => {
        const ext = path.extname(f).toLowerCase();
        return f.startsWith(`audio_${vId}.`) && validExtensions.includes(ext);
      });
    };

    let audioFilename = findAudioFile(videoId);
    let audioPath = audioFilename ? path.join(audioStore, audioFilename) : null;

    let transcriptText = existingTranscript;

    if (!transcriptText) {
      sendStatus('downloading', 10, 'Video Download (HQ Audio)...');
      const ytDlpPath = fs.existsSync(path.join(__dirname, 'yt-dlp.exe'))
        ? path.join(__dirname, 'yt-dlp.exe')
        : 'yt-dlp';

      if (!audioPath) {
        // Force m4a (native AAC) for best compatibility, fallback to best audio
        const outputTemplate = path.join(audioStore, `audio_${videoId}.%(ext)s`);
        const ytDlp = spawn(ytDlpPath, [
          '-f',
          'ba[ext=m4a]/ba',
          '--no-playlist',
          '-o',
          outputTemplate,
          url,
        ]);
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

        // Re-check for the finished file
        audioFilename = findAudioFile(videoId);
        if (!audioFilename)
          throw new Error('Download failed: file not found or unsupported format');
        audioPath = path.join(audioStore, audioFilename);
      }

      // 2. Transcription with Fallback Support
      sendStatus('uploading', 0, 'AssemblyAI Analysis...');
      const client = new AssemblyAI({ apiKey: aai_key });

      const transcript = await client.transcripts.transcribe({
        audio: audioPath,
        // Use universal-3-pro as primary, universal-2 as fallback for 99+ languages
        speech_models: ['universal-3-pro', 'universal-2'],
        language_detection: true,
        punctuate: true,
        format_text: true,
        filter_profanity: false,
      });

      if (transcript.status === 'error') throw new Error(transcript.error);
      transcriptText = transcript.text;

      // Send intermediate update so frontend can cache the transcript immediately
      sendStatus('summarizing', 0, {
        transcript: transcriptText,
        audioUrl: `http://localhost:5000/audio/${audioFilename}`,
        wordCount: transcriptText.split(/\s+/).length,
        isPartial: true,
      });
    }

    // 3. Summarization
    sendStatus('summarizing', 0, 'Gemini is generating summary...');
    const genAI = new GoogleGenerativeAI(gemini_key);
    const model = genAI.getGenerativeModel({ model: modelName || 'gemini-3.1-pro' });

    let prompt = `TRANSCRIPT: "${transcriptText}"\n\nSummarize this in ENGLISH.\n`;
    if (summaryType === 'short') {
      prompt += 'Short summary.';
    } else if (summaryType === 'detailed') {
      prompt +=
        'Provide a very long, exhaustive and detailed summary. Use bullet points and sections to organize the information. Cover every single point discussed in the video.';
    } else {
      prompt += 'Detailed summary using bullet points for key information.';
    }
    prompt += `\n\nAnswer ONLY as JSON: {"short_summary": "...", "normal_summary": "...", "detailed_summary": "..."}`;

    const result = await model.generateContent(prompt);
    const geminiRaw = result.response.text();
    const jsonMatch = geminiRaw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('AI did not respond in JSON format.');
    const summaryData = JSON.parse(jsonMatch[0]);

    // IMPORTANT: We build the object EXPLICITLY
    const finalResult = {
      transcript: transcriptText, // This is the RAW AAI Transcript
      short_summary: summaryData.short_summary || 'Error',
      normal_summary: summaryData.normal_summary || 'Error',
      detailed_summary: summaryData.detailed_summary || 'Error',
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
app.listen(PORT, () => console.log(`Smart Backend (v1.0.0) Transcript security active.`));
