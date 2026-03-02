console.log('YouTube Summarizer (v4.9) - Enhanced Transcript View.');

let currentVideoState = {
  videoId: null,
  activeTab: 'short',
  title: '',
  cachedTranscript: null,
  audioUrl: null,
  wordCount: 0,
  short: { stage: 'idle', percent: 0, data: null },
  normal: { stage: 'idle', percent: 0, data: null },
  transcript: { stage: 'idle', percent: 0, data: null },
};

function parseMarkdown(text) {
  if (!text || text === 'Nicht angefordert') return '';
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/^\- (.*$)/gim, '• $1')
    .replace(/\n/g, '<br>');
}

function renderOverlay() {
  let panel = document.getElementById('yt-sum-overlay');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'yt-sum-overlay';
    document.body.appendChild(panel);
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') panel.style.display = 'none';
    });
  }
  panel.style.display = 'block';

  const active = currentVideoState.activeTab;
  let currentTask =
    active === 'short'
      ? currentVideoState.short
      : active === 'normal'
        ? currentVideoState.normal
        : currentVideoState.transcript;

  panel.innerHTML = `
        <div class="yt-sum-panel-content">
            <button class="close-btn" id="yt-sum-close-x">×</button>
            <h3 class="yt-sum-title">${currentVideoState.title}</h3>
            
            <div class="tab-bar">
                <button class="tab-btn ${active === 'short' ? 'active' : ''}" id="tab-short-btn">⚡ Kurz</button>
                <button class="tab-btn ${active === 'normal' ? 'active' : ''}" id="tab-normal-btn">📄 Normal</button>
                <button class="tab-btn ${active === 'transcript' ? 'active' : ''}" id="tab-transcript-btn">📜 Transkript</button>
            </div>

            <div id="tab-content" class="task-section ${currentTask.stage}">
                <div class="task-header">
                    <strong>${active === 'transcript' ? `📜 Roh-Transkript (${currentVideoState.wordCount} Wörter)` : active === 'short' ? '⚡ Kurz' : '📄 Normal'}</strong>
                    ${(currentTask.stage === 'done' || currentTask.stage === 'cached') && active !== 'transcript' ? `<button class="regen-small" id="regen-active-btn">🔄 Neu</button>` : ''}
                </div>
                
                ${
                  active === 'transcript' && currentVideoState.audioUrl
                    ? `
                    <div class="audio-player-container" style="margin-bottom: 15px; background: #f0f0f0; padding: 10px; border-radius: 8px;">
                        <div style="font-size: 10px; margin-bottom: 5px; color: #666;">Audio-Quelle: Local Host</div>
                        <audio controls style="width: 100%;"><source src="${currentVideoState.audioUrl}" type="audio/mpeg"></audio>
                    </div>
                `
                    : ''
                }

                <div class="content-scrollbox">
                    ${renderTaskContent(currentTask, active)}
                </div>
            </div>

            <div class="sum-footer">
                <button class="action-btn" id="yt-sum-btn-full-reset">🔥 Audio-Reset</button>
                <button class="action-btn" id="yt-sum-btn-archive">Archiv</button>
            </div>
        </div>
    `;

  document.getElementById('yt-sum-close-x').onclick = () => (panel.style.display = 'none');
  document.getElementById('tab-short-btn').onclick = () => {
    currentVideoState.activeTab = 'short';
    renderOverlay();
  };
  document.getElementById('tab-normal-btn').onclick = () => {
    currentVideoState.activeTab = 'normal';
    renderOverlay();
  };
  document.getElementById('tab-transcript-btn').onclick = () => {
    currentVideoState.activeTab = 'transcript';
    renderOverlay();
  };
  document.getElementById('yt-sum-btn-archive').onclick = () =>
    chrome.runtime.sendMessage({ action: 'open_dashboard' });
  document.getElementById('yt-sum-btn-full-reset').onclick = () => {
    if (confirm('Löschen?')) {
      chrome.runtime.sendMessage({ action: 'delete_summary', url: window.location.href });
      panel.style.display = 'none';
    }
  };
  if (document.getElementById('regen-active-btn'))
    document.getElementById('regen-active-btn').onclick = () => triggerNewAnalysis(active);
}

function renderTaskContent(task, active) {
  if (task.stage === 'done' || task.stage === 'cached') {
    const text = active === 'transcript' ? currentVideoState.cachedTranscript : task.data;
    if (!text) return `<p class="idle-msg">Keine Daten vorhanden.</p>`;
    return `<div class="result-text">${active === 'transcript' ? text : parseMarkdown(text)}</div>`;
  }
  if (task.stage === 'idle') return `<p class="idle-msg">Bereit.</p>`;
  if (task.stage === 'error') return `<p class="error-msg">❌ ${task.data}</p>`;
  return `
        <div class="status-row"><span>Lädt...</span><span>${task.percent}%</span></div>
        <div class="progress-container mini"><div class="progress-bar" style="width: ${task.percent}%"></div></div>
    `;
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === 'status_update') {
    if (msg.stage === 'done') {
      currentVideoState.short.stage = 'done';
      currentVideoState.short.data = msg.message.short_summary;
      currentVideoState.normal.stage = 'done';
      currentVideoState.normal.data = msg.message.normal_summary;
      currentVideoState.transcript.stage = 'done';
      currentVideoState.cachedTranscript = msg.message.transcript;
      currentVideoState.audioUrl = msg.message.audioUrl;
      currentVideoState.wordCount = msg.message.wordCount || 0;
    } else {
      const target =
        msg.summaryType === 'normal' ? currentVideoState.normal : currentVideoState.short;
      target.stage = msg.stage;
      target.percent = msg.percent;
      currentVideoState.transcript.stage = msg.stage;
      currentVideoState.transcript.percent = msg.percent;
    }
    renderOverlay();
  }
});

async function startSummarize(url, summaryType) {
  const videoId = new URL(url).searchParams.get('v');
  currentVideoState.activeTab = summaryType;
  currentVideoState.title = document.title.replace(' - YouTube', '');
  const { yt_summaries = [] } = await chrome.storage.local.get('yt_summaries');
  const existing = yt_summaries.find((s) => s.url.includes(videoId));

  if (existing) {
    currentVideoState.short = { stage: 'cached', data: existing.short_summary, percent: 100 };
    currentVideoState.normal = { stage: 'cached', data: existing.normal_summary, percent: 100 };
    currentVideoState.transcript = { stage: 'cached', data: existing.transcript, percent: 100 };
    currentVideoState.cachedTranscript = existing.transcript;
    currentVideoState.audioUrl = existing.audioUrl;
    currentVideoState.wordCount = existing.transcript ? existing.transcript.split(/\s+/).length : 0;
    renderOverlay();
  } else {
    triggerNewAnalysis(summaryType);
  }
}

async function triggerNewAnalysis(summaryType) {
  const settings = await chrome.storage.local.get(['selected_model']);
  if (summaryType === 'short') currentVideoState.short.stage = 'start';
  if (summaryType === 'normal') currentVideoState.normal.stage = 'start';
  currentVideoState.transcript.stage = 'start';
  renderOverlay();
  chrome.runtime.sendMessage({
    action: 'summarize',
    url: window.location.href,
    title: document.title.replace(' - YouTube', ''),
    summaryType: summaryType,
    model: settings.selected_model,
    existingTranscript: currentVideoState.cachedTranscript,
  });
}

function injectHeaderButtons() {
  const container = document.querySelector('#center.style-scope.ytd-masthead');
  if (!container || document.getElementById('yt-sum-header-group')) return;
  const group = document.createElement('div');
  group.id = 'yt-sum-header-group';
  group.style.display = 'flex';
  group.style.alignItems = 'center';
  const dashBtn = document.createElement('button');
  dashBtn.className = 'yt-sum-btn dash';
  dashBtn.innerText = '📋 Archiv';
  dashBtn.onclick = () => chrome.runtime.sendMessage({ action: 'open_dashboard' });
  group.appendChild(dashBtn);
  if (window.location.pathname === '/watch') {
    const sBtn = document.createElement('button');
    sBtn.className = 'yt-sum-btn short';
    sBtn.innerText = '⚡ Kurz';
    sBtn.onclick = () => startSummarize(window.location.href, 'short');
    const nBtn = document.createElement('button');
    nBtn.className = 'yt-sum-btn norm';
    nBtn.innerText = '📄 Normal';
    nBtn.onclick = () => startSummarize(window.location.href, 'normal');
    group.appendChild(sBtn);
    group.appendChild(nBtn);
  }
  container.parentNode.insertBefore(group, container);
}
setInterval(injectHeaderButtons, 2000);
