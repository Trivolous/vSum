const fs = require('fs');
const path = require('path');
const axios = require('axios');
const AdmZip = require('adm-zip');

const YT_DLP_URL = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe';
// Using a reliable direct link to a shared build for Windows
const FFMPEG_URL = 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-git-full.7z';
// Actually 7z is hard to extract in pure JS without extra tools.
// Let's use the essential zip version
const FFMPEG_ZIP_URL = 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip';

async function downloadFile(url, dest) {
  console.log(`Downloading: ${url} -> ${dest}`);
  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream',
  });

  const writer = fs.createWriteStream(dest);
  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}

async function setup() {
  const backendDir = __dirname;

  // 1. Setup yt-dlp
  const ytDlpPath = path.join(backendDir, 'yt-dlp.exe');
  if (!fs.existsSync(ytDlpPath)) {
    await downloadFile(YT_DLP_URL, ytDlpPath);
    console.log('yt-dlp.exe downloaded.');
  } else {
    console.log('yt-dlp.exe already exists.');
  }

  // 2. Setup ffmpeg
  const ffmpegPath = path.join(backendDir, 'ffmpeg.exe');
  if (!fs.existsSync(ffmpegPath)) {
    const zipPath = path.join(backendDir, 'ffmpeg.zip');
    await downloadFile(FFMPEG_ZIP_URL, zipPath);
    console.log('Extracting ffmpeg...');

    const zip = new AdmZip(zipPath);
    const zipEntries = zip.getEntries();

    // Find ffmpeg.exe in the zip and extract just that
    zipEntries.forEach((entry) => {
      if (entry.entryName.endsWith('ffmpeg.exe')) {
        fs.writeFileSync(ffmpegPath, entry.getData());
      }
    });

    // Cleanup zip
    fs.unlinkSync(zipPath);
    console.log('ffmpeg.exe setup complete.');
  } else {
    console.log('ffmpeg.exe already exists.');
  }

  console.log('Setup finished. You can now run "node server.js".');
}

setup().catch((err) => {
  console.error('Setup failed:', err.message);
  process.exit(1);
});
