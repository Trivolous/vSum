chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.action === 'summarize') {
    handleSummarizeStream(message, sender.tab.id);
    return true;
  }
  if (message.action === 'open_dashboard') {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
  }
  if (message.action === 'delete_summary') {
    deleteSummary(message.videoId);
  }
  if (message.action === 'delete_audio') {
    deleteAudioFile(message.videoId);
  }
  if (message.action === 'delete_partial') {
    deletePartial(message.url, message.type);
  }
});

async function deleteAudioFile(videoId) {
  try {
    const { backend_url = 'http://localhost:5000' } = await chrome.storage.local.get('backend_url');
    await fetch(`${backend_url}/delete-audio?videoId=${videoId}`);
  } catch (err) {
    console.error('Failed to delete audio file:', err);
  }
}

async function handleSummarizeStream(msg, tabId) {
  try {
    const settings = await chrome.storage.local.get([
      'backend_url',
      'gemini_key',
      'aai_key',
      'gemini_model',
      'aai_model',
      'custom_model_name',
    ]);
    const backendUrl = settings.backend_url || 'http://localhost:5000';

    const selectedGeminiModel =
      settings.gemini_model === 'custom' ? settings.custom_model_name : settings.gemini_model;

    const params = new URLSearchParams({
      url: msg.url,
      summaryType: msg.summaryType,
      modelName: selectedGeminiModel || 'gemini-3.1-pro',
      aai_model: settings.aai_model || 'universal-3-pro',
      gemini_key: settings.gemini_key,
      aai_key: settings.aai_key,
    });

    if (msg.existingTranscript) {
      params.append('existingTranscript', msg.existingTranscript);
    }

    const response = await fetch(`${backendUrl}/process-video?${params.toString()}`);
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.substring(6));
          if (data.stage === 'done') {
            await saveToArchiveWithHistory(msg, data.message);
          }
          chrome.tabs.sendMessage(tabId, {
            action: 'status_update',
            summaryType: msg.summaryType,
            ...data,
          });
        }
      }
    }
  } catch (err) {
    chrome.tabs.sendMessage(tabId, {
      action: 'status_update',
      summaryType: msg.summaryType,
      stage: 'error',
      message: err.message,
    });
  }
}

async function saveToArchiveWithHistory(msg, resultData) {
  const storageKey = 'yt_summaries';
  const { yt_summaries = [] } = await chrome.storage.local.get(storageKey);
  const existingIndex = yt_summaries.findIndex((s) => s.url === msg.url);

  let entry;
  if (existingIndex >= 0) {
    entry = yt_summaries[existingIndex];

    if (!entry.history) entry.history = [];
    entry.history.unshift({
      timestamp: entry.timestamp || new Date().toISOString(),
      short_summary: entry.short_summary,
      normal_summary: entry.normal_summary,
      model: entry.model || 'unknown',
    });

    if (entry.history.length > 5) entry.history.pop();

    if (msg.summaryType === 'short') entry.short_summary = resultData.short_summary;
    if (msg.summaryType === 'normal') entry.normal_summary = resultData.normal_summary;
    if (msg.summaryType === 'both') {
      entry.short_summary = resultData.short_summary;
      entry.normal_summary = resultData.normal_summary;
    }

    entry.transcript = resultData.transcript;
    entry.timestamp = new Date().toISOString();
    entry.model = msg.model;

    yt_summaries[existingIndex] = entry;
  } else {
    entry = {
      id: Date.now(),
      title: msg.title,
      url: msg.url,
      thumbnail: msg.thumbnail,
      transcript: resultData.transcript,
      short_summary: resultData.short_summary,
      normal_summary: resultData.normal_summary,
      timestamp: new Date().toISOString(),
      model: msg.model,
      history: [],
    };
    yt_summaries.unshift(entry);
  }
  await chrome.storage.local.set({ [storageKey]: yt_summaries });
}

async function deleteSummary(videoId) {
  if (!videoId) return;
  const { yt_summaries = [] } = await chrome.storage.local.get('yt_summaries');
  const filtered = yt_summaries.filter((s) => !s.url.includes(videoId));
  await chrome.storage.local.set({ yt_summaries: filtered });
}

async function deletePartial(url, type) {
  const { yt_summaries = [] } = await chrome.storage.local.get('yt_summaries');
  const index = yt_summaries.findIndex((s) => s.url === url);
  if (index >= 0) {
    if (type === 'short') yt_summaries[index].short_summary = null;
    if (type === 'normal') yt_summaries[index].normal_summary = null;
    await chrome.storage.local.set({ yt_summaries });
  }
}
